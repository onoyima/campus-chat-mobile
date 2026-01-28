
import { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, Alert, Image } from 'react-native';
import { useAuth } from '../hooks/useAuth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, apiClient } from '../lib/api';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router, Stack } from 'expo-router';

export default function NewGroupScreen() {
  const { user } = useAuth();
  const [groupName, setGroupName] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const queryClient = useQueryClient();

  const { data: identities = [], isLoading: loadingUsers } = useQuery({
    queryKey: ['identities', searchTerm],
    queryFn: async () => {
      const { data } = await apiClient.get('/api/identities', { params: { search: searchTerm } });
      return data;
    },
    enabled: !!user && searchTerm.length >= 2,
  });

  const createGroup = useMutation({
    mutationFn: () => api.createGroupChat(groupName, selectedIds),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      Alert.alert('Success', 'Group created successfully');
      router.replace(`/chat/${data.id}`);
    },
    onError: (err: any) => {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to create group');
    },
  });

  const toggleSelection = (id: number) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleCreate = () => {
    if (!groupName.trim()) {
      Alert.alert('Error', 'Please enter a group name');
      return;
    }
    if (selectedIds.length === 0) {
      Alert.alert('Error', 'Please select at least one participant');
      return;
    }
    createGroup.mutate();
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ 
        title: 'New Group',
        headerRight: () => (
          <TouchableOpacity onPress={handleCreate} disabled={createGroup.isPending}>
            <Text style={[styles.createBtn, (createGroup.isPending || !groupName || selectedIds.length === 0) && styles.disabledBtn]}>
              Create
            </Text>
          </TouchableOpacity>
        )
      }} />

      <View style={styles.header}>
         <View style={styles.inputContainer}>
            <TextInput
                style={styles.groupInput}
                placeholder="Group Name"
                value={groupName}
                onChangeText={setGroupName}
            />
         </View>
         <View style={styles.searchBar}>
            <Ionicons name="search" size={20} color="#666" />
            <TextInput
                style={styles.searchInput}
                placeholder="Search people..."
                value={searchTerm}
                onChangeText={setSearchTerm}
            />
         </View>
         <Text style={styles.sub}>Selected: {selectedIds.length}</Text>
      </View>

      <FlatList
        data={identities}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={styles.row} 
            onPress={() => toggleSelection(item.id)}
          >
            <Image 
                source={{ uri: `https://api.dicebear.com/7.x/initials/svg?seed=${item.email || item.displayName}` }} 
                style={styles.avatar} 
            />
            <View style={styles.rowInfo}>
              <Text style={styles.name}>{item.displayName}</Text>
              <Text style={styles.meta}>{item.role}</Text>
            </View>
            <Ionicons 
                name={selectedIds.includes(item.id) ? "checkbox" : "square-outline"} 
                size={24} 
                color={selectedIds.includes(item.id) ? "#25a25a" : "#ccc"} 
            />
          </TouchableOpacity>
        )}
        ListEmptyComponent={
            searchTerm.length < 2 ? (
                <View style={styles.empty}>
                    <Text style={styles.emptyText}>Type at least 2 characters to search</Text>
                </View>
            ) : (
                <View style={styles.empty}>
                    {loadingUsers ? <ActivityIndicator color="#25a25a" /> : <Text style={styles.emptyText}>No users found</Text>}
                </View>
            )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#eee', backgroundColor: '#f9f9f9' },
  inputContainer: { marginBottom: 16 },
  groupInput: { fontSize: 18, borderBottomWidth: 1, borderBottomColor: '#25a25a', paddingVertical: 8, fontWeight: 'bold' },
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fff', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: '#eee' },
  searchInput: { flex: 1, fontSize: 16 },
  sub: { fontSize: 12, color: '#666', marginTop: 8 },
  row: { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#f0f0f0' },
  rowInfo: { flex: 1, marginLeft: 12 },
  name: { fontSize: 16, fontWeight: '600' },
  meta: { fontSize: 12, color: '#666' },
  empty: { padding: 40, alignItems: 'center' },
  emptyText: { color: '#999' },
  createBtn: { color: '#25a25a', fontSize: 16, fontWeight: 'bold' },
  disabledBtn: { color: '#ccc' },
});
