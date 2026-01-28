import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl, ActivityIndicator, Image } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { useAuth } from '../../hooks/useAuth';
import { Link, router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';

export default function ChatsScreen() {
  const { user } = useAuth();
  const { data: conversations = [], isLoading, refetch } = useQuery({
    queryKey: ['conversations'],
    queryFn: () => api.getConversations(),
    enabled: !!user,
  });

  const renderChatItem = ({ item }: { item: any }) => {
    // Determine display name and avatar seed
    let displayName = item.name;
    let seed = item.name || 'group';

    if (item.type === 'DIRECT') {
      const other = item.participants.find((p: any) => p.identityId !== user?.id);
      displayName = other?.identity?.displayName || 'Unknown';
      seed = other?.identity?.email || displayName;
    }

    const lastMsgDate = item.lastMessage ? new Date(item.lastMessage.createdAt) : null;
    const timeStr = lastMsgDate ? lastMsgDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

    return (
      <Link href={`/chat/${item.id}`} asChild>
        <TouchableOpacity style={styles.chatItem}>
          <View style={styles.avatarContainer}>
             <Image 
                source={{ uri: `https://api.dicebear.com/7.x/initials/svg?seed=${seed}` }} 
                style={styles.avatar} 
             />
             {item.participants.some((p: any) => p.identity?.isOnline) && <View style={styles.onlineBadge} />}
          </View>
          
          <View style={styles.chatContent}>
            <View style={styles.chatHeader}>
              <Text style={styles.chatName} numberOfLines={1}>{displayName}</Text>
              <Text style={styles.time}>{timeStr}</Text>
            </View>
            <View style={styles.chatFooter}>
              <Text style={styles.lastMessage} numberOfLines={1}>
                {item.lastMessage?.content || 'No messages yet'}
              </Text>
              {item.unreadCount > 0 && (
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadText}>{item.unreadCount}</Text>
                </View>
              )}
            </View>
          </View>
        </TouchableOpacity>
      </Link>
    );
  };

  if (isLoading && conversations.length === 0) {
    return (
        <View style={styles.center}>
            <ActivityIndicator size="large" color="#25a25a" />
        </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={conversations}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderChatItem}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={() => refetch()} tintColor="#25a25a" />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
            <View style={styles.emptyContainer}>
                <Ionicons name="chatbubbles-outline" size={64} color="#ccc" />
                <Text style={styles.emptyText}>No conversations yet.</Text>
                <Text style={styles.emptySub}>Start a new chat to connect with your colleagues.</Text>
            </View>
        }
      />
      
      <TouchableOpacity 
        style={styles.fab} 
        onPress={() => router.push('/(tabs)/search')}
      >
        <Ionicons name="add" size={30} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { paddingBottom: 100 },
  chatItem: { 
    flexDirection: 'row', 
    padding: 16, 
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  avatarContainer: { position: 'relative' },
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#f0f0f0' },
  onlineBadge: { 
    position: 'absolute', 
    bottom: 2, 
    right: 2, 
    width: 14, 
    height: 14, 
    borderRadius: 7, 
    backgroundColor: '#22c55e', 
    borderWidth: 2, 
    borderColor: '#fff' 
  },
  chatContent: { flex: 1, marginLeft: 16, justifyContent: 'center' },
  chatHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  chatName: { fontSize: 17, fontWeight: '700', color: '#1a1a1a', flex: 1, marginRight: 8 },
  time: { fontSize: 12, color: '#999' },
  chatFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  lastMessage: { fontSize: 14, color: '#666', flex: 1 },
  unreadBadge: { backgroundColor: '#25a25a', borderRadius: 10, minWidth: 20, height: 20, paddingHorizontal: 6, justifyContent: 'center', alignItems: 'center', marginLeft: 8 },
  unreadText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 100, paddingHorizontal: 40 },
  emptyText: { fontSize: 18, fontWeight: 'bold', color: '#666', marginTop: 16 },
  emptySub: { fontSize: 14, color: '#999', textAlign: 'center', marginTop: 8 },
  fab: { 
    position: 'absolute', 
    bottom: 24, 
    right: 24, 
    width: 60, 
    height: 60, 
    borderRadius: 30, 
    backgroundColor: '#25a25a', 
    justifyContent: 'center', 
    alignItems: 'center',
    shadowColor: '#25a25a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
});

