import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { useAuth } from '../../hooks/useAuth';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';

export default function StatusScreen() {
  const { user } = useAuth();
  const { data: statuses = [], isLoading, refetch } = useQuery({
    queryKey: ['status-updates'],
    queryFn: () => api.getStatusUpdates(),
    enabled: !!user,
  });

  const renderStatus = ({ item }: { item: any }) => (
    <TouchableOpacity style={styles.statusItem}>
      <View style={[styles.avatarRing, item.isViewed ? styles.viewedRing : styles.newRing]}>
         <Image source={{ uri: `https://api.dicebear.com/7.x/initials/png?seed=${item.identity?.displayName || 'User'}` }} style={styles.avatar} />
      </View>
      <View style={styles.info}>
        <Text style={styles.name}>{item.identity?.displayName}</Text>
        <Text style={styles.time}>{new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* My Status */}
      <View style={styles.myStatusContainer}>
        <TouchableOpacity style={styles.statusItem} onPress={() => router.push('/post-status')}>
          <View style={styles.myAvatarContainer}>
            <Image source={{ uri: `https://api.dicebear.com/7.x/initials/png?seed=${user?.username || 'Me'}` }} style={styles.avatar} />
            <View style={styles.addIcon}>
              <Ionicons name="add" size={12} color="#fff" />
            </View>
          </View>
          <View style={styles.info}>
            <Text style={styles.name}>My Status</Text>
            <Text style={styles.time}>Tap to add status update</Text>
          </View>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionHeader}>Recent updates</Text>

      <FlatList
        data={statuses}
        renderItem={renderStatus}
        keyExtractor={(item) => item.id.toString()}
        refreshing={isLoading}
        onRefresh={refetch}
        ListEmptyComponent={<Text style={styles.empty}>No recent updates</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  myStatusContainer: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  statusItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  
  myAvatarContainer: { position: 'relative', marginRight: 16 },
  avatar: { width: 50, height: 50, borderRadius: 25 },
  addIcon: { position: 'absolute', bottom: 0, right: 0, backgroundColor: '#25a25a', width: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff' },
  
  avatarRing: { padding: 2, borderRadius: 30, marginRight: 16 },
  newRing: { borderWidth: 2, borderColor: '#25a25a' },
  viewedRing: { borderWidth: 2, borderColor: '#ccc' },
  
  info: { flex: 1 },
  name: { fontSize: 16, fontWeight: '600', color: '#000' },
  time: { fontSize: 13, color: '#666' },
  
  sectionHeader: { padding: 16, fontSize: 14, fontWeight: '600', color: '#666', backgroundColor: '#f9f9f9' },
  empty: { padding: 20, textAlign: 'center', color: '#999' },
});
