import { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, apiClient } from '../../lib/api';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Link } from 'expo-router';

export default function SearchScreen() {
  const { user } = useAuth();
  const [q, setQ] = useState('');
  const [mode, setMode] = useState<'users' | 'messages'>('users');
  const queryClient = useQueryClient();

  const { data: identities = [], isFetching: fetchingUsers } = useQuery({
    queryKey: ['identities', q],
    queryFn: async () => {
      const { data } = await apiClient.get('/api/identities', { params: { search: q } });
      return data;
    },
    enabled: !!user && mode === 'users' && q.length >= 2,
  });

  const { data: results = [], isFetching: fetchingMessages } = useQuery({
    queryKey: ['messages-search', q],
    queryFn: async () => {
      const { data } = await apiClient.get('/api/messages/search', { params: { q } });
      return data;
    },
    enabled: !!user && mode === 'messages' && q.length >= 2,
  });

  const createDirect = useMutation({
    mutationFn: (targetIdentityId: number) => api.createDirectChat(targetIdentityId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });

  return (
    <View style={styles.container}>
      <View style={styles.searchBar}>
        <Ionicons name="search" size={20} color="#666" />
        <TextInput
          style={styles.input}
          placeholder={mode === 'users' ? 'Search people...' : 'Search messages...'}
          value={q}
          onChangeText={setQ}
          autoCorrect={false}
          autoCapitalize="none"
        />
        <View style={styles.modeSwitch}>
          <TouchableOpacity onPress={() => setMode('users')}>
            <Text style={[styles.mode, mode === 'users' && styles.modeActive]}>Users</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setMode('messages')}>
            <Text style={[styles.mode, mode === 'messages' && styles.modeActive]}>Messages</Text>
          </TouchableOpacity>
        </View>
      </View>

      {mode === 'users' ? (
        <FlatList
          data={identities}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <View style={styles.rowInfo}>
                <Text style={styles.name}>{item.displayName}</Text>
                <Text style={styles.meta}>{item.role}</Text>
              </View>
              <View style={styles.actions}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => createDirect.mutate(item.id)}
                  disabled={createDirect.isPending}
                >
                  <Ionicons name="chatbubble-ellipses" size={18} color="#fff" />
                </TouchableOpacity>
                <Link href={`/users/${item.id}/profile`} asChild>
                  <TouchableOpacity style={[styles.actionButton, styles.secondary]}>
                    <Ionicons name="person" size={18} color="#25a25a" />
                  </TouchableOpacity>
                </Link>
              </View>
            </View>
          )}
          ListEmptyComponent={
            q.length < 2 ? <Text style={styles.empty}>Type at least 2 characters</Text> : <Text style={styles.empty}>No users found</Text>
          }
        />
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <Link href={`/chat/${item.conversationId}`} asChild>
              <TouchableOpacity style={styles.messageRow}>
                <Text style={styles.messageContent} numberOfLines={2}>{item.content}</Text>
                <Text style={styles.messageMeta}>
                  {new Date(item.createdAt).toLocaleString()}
                </Text>
              </TouchableOpacity>
            </Link>
          )}
          ListEmptyComponent={
            q.length < 2 ? <Text style={styles.empty}>Type at least 2 characters</Text> : <Text style={styles.empty}>No messages found</Text>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderBottomWidth: 1, borderBottomColor: '#eee' },
  input: { flex: 1, backgroundColor: '#f5f5f5', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  modeSwitch: { flexDirection: 'row', gap: 8 },
  mode: { fontSize: 12, color: '#666', paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: '#ddd', borderRadius: 6 },
  modeActive: { color: '#25a25a', borderColor: '#25a25a' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  rowInfo: { flex: 1 },
  name: { fontSize: 16, fontWeight: '600', color: '#000' },
  meta: { fontSize: 12, color: '#666' },
  actions: { flexDirection: 'row', gap: 8 },
  actionButton: { backgroundColor: '#25a25a', padding: 8, borderRadius: 8 },
  secondary: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#25a25a' },
  empty: { padding: 20, textAlign: 'center', color: '#999' },
  messageRow: { padding: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  messageContent: { fontSize: 14, color: '#333', marginBottom: 6 },
  messageMeta: { fontSize: 12, color: '#666' },
});
