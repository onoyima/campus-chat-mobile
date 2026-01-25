
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { useAuth } from '../../hooks/useAuth';
import Ionicons from '@expo/vector-icons/Ionicons';

export default function CallsScreen() {
  const { user } = useAuth();
  const { data: calls = [], isLoading, refetch } = useQuery({
    queryKey: ['calls'],
    queryFn: () => api.getCalls(),
    enabled: !!user,
  });

  const renderCall = ({ item }: { item: any }) => {
    const isMissed = item.status === 'missed';
    const isVideo = item.type === 'video';
    const isIncoming = item.targetIdentityId === user?.id; // Rough check

    return (
      <View style={styles.callItem}>
         <Image source={{ uri: `https://api.dicebear.com/7.x/initials/png?seed=${item.initiatorIdentityId}` }} style={styles.avatar} />
         <View style={styles.info}>
            <Text style={[styles.name, isMissed && styles.missedName]}>
                {item.initiatorIdentityId === user?.id ? 'You' : `User ${item.initiatorIdentityId}`}
            </Text>
            <View style={styles.callDetails}>
                <Ionicons 
                    name={isIncoming ? "arrow-down" : "arrow-up"} 
                    size={14} 
                    color={isMissed ? "red" : "#25a25a"} 
                />
                <Text style={styles.time}>
                    {new Date(item.startTime).toLocaleString()}
                </Text>
            </View>
         </View>
         <TouchableOpacity>
             <Ionicons name={isVideo ? "videocam" : "call"} size={24} color="#25a25a" />
         </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={calls}
        renderItem={renderCall}
        keyExtractor={(item) => item.id.toString()}
        refreshing={isLoading}
        onRefresh={refetch}
        ListEmptyComponent={<Text style={styles.empty}>No recent calls</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  callItem: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  avatar: { width: 50, height: 50, borderRadius: 25, marginRight: 16 },
  info: { flex: 1 },
  name: { fontSize: 16, fontWeight: '600', color: '#000', marginBottom: 4 },
  missedName: { color: 'red' },
  callDetails: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  time: { fontSize: 13, color: '#666' },
  empty: { padding: 20, textAlign: 'center', color: '#999' },
});
