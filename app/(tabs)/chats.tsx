import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { useAuth } from '../../hooks/useAuth';
import { Link } from 'expo-router';

interface Conversation {
  id: number;
  type: string;
  name: string | null;
  lastMessage?: { content: string };
  participants: Array<{ displayName: string }>;
}

export default function ChatsScreen() {
  const { user } = useAuth();
  const { data: conversations = [], isLoading, refetch } = useQuery({
    queryKey: ['conversations'],
    queryFn: () => api.getConversations(),
    enabled: !!user,
  });

  if (isLoading) {
    return <ActivityIndicator style={styles.center} size="large" color="#25a25a" />;
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={conversations}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <Link href={`/chat/${item.id}`} asChild>
            <TouchableOpacity style={styles.chatItem}>
              <View style={styles.chatInfo}>
                <Text style={styles.chatName}>{item.name || item.participants[0]?.displayName}</Text>
                <Text style={styles.lastMessage} numberOfLines={1}>
                  {item.lastMessage?.content || 'No messages'}
                </Text>
              </View>
            </TouchableOpacity>
          </Link>
        )}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={() => refetch()} />}
        ListEmptyComponent={<Text style={styles.empty}>No conversations yet</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, justifyContent: 'center' },
  chatItem: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#eee' },
  chatInfo: { flex: 1 },
  chatName: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
  lastMessage: { fontSize: 14, color: '#999' },
  empty: { textAlign: 'center', marginTop: 40, color: '#999' },
});
