import { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, FlatList, Alert } from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../lib/api';
import Ionicons from '@expo/vector-icons/Ionicons';

export default function AdminScreen() {
  const { user } = useAuth();
  const [q, setQ] = useState('');
  const isAdmin = !!user && ['SUPER_ADMIN', 'VC'].includes(user.role);

  const { data: results = [], isFetching } = useQuery({
    queryKey: ['admin-global-search', q],
    queryFn: async () => {
      const { data } = await apiClient.get('/api/admin/global-search', { params: { q } });
      return data;
    },
    enabled: !!user && isAdmin && q.length >= 2,
  });

  const viewProfile = async (id: number) => {
    try {
      const { data } = await apiClient.get(`/api/users/${id}/profile`);
      Alert.alert('Profile', `${data.displayName} • ${data.role}`);
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message || 'Failed to load profile');
    }
  };

  if (!isAdmin) {
    return (
      <View style={styles.center}>
        <Text style={styles.denied}>Admin access required</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.searchBar}>
        <Ionicons name="search" size={20} color="#666" />
        <TextInput
          style={styles.input}
          placeholder="Search users across system..."
          value={q}
          onChangeText={setQ}
          autoCorrect={false}
          autoCapitalize="none"
        />
      </View>
      
      <FlatList
        data={results}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={styles.rowInfo}>
              <Text style={styles.name}>{item.displayName}</Text>
              <Text style={styles.meta}>{item.role}</Text>
            </View>
            <View style={styles.actions}>
              <TouchableOpacity style={styles.actionButton} onPress={() => viewProfile(item.id)}>
                <Ionicons name="person" size={18} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListEmptyComponent={
          q.length < 2 ? <Text style={styles.empty}>Type at least 2 characters</Text> : <Text style={styles.empty}>No results</Text>
        }
        refreshing={isFetching}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  denied: { color: '#666' },
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderBottomWidth: 1, borderBottomColor: '#eee' },
  input: { flex: 1, backgroundColor: '#f5f5f5', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  rowInfo: { flex: 1 },
  name: { fontSize: 16, fontWeight: '600', color: '#000' },
  meta: { fontSize: 12, color: '#666' },
  actions: { flexDirection: 'row', gap: 8 },
  actionButton: { backgroundColor: '#25a25a', padding: 8, borderRadius: 8 },
  empty: { padding: 20, textAlign: 'center', color: '#999' },
});
