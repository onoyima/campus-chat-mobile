
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';

export default function SettingsScreen() {
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { 
        text: 'Logout', 
        style: 'destructive', 
        onPress: async () => {
          await logout();
          // Router handles redirect in _layout
        }
      }
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.profileHeader}>
        <View style={styles.avatar}>
           <Text style={styles.avatarText}>{user?.username?.substring(0, 1).toUpperCase() || 'U'}</Text>
        </View>
        <Text style={styles.name}>{user?.username || 'User'}</Text>
        <Text style={styles.email}>{user?.email || 'user@example.com'}</Text>
      </View>

      <View style={styles.section}>
        <TouchableOpacity style={styles.item}>
           <Ionicons name="key-outline" size={24} color="#666" />
           <Text style={styles.itemText}>Account</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.item}>
           <Ionicons name="notifications-outline" size={24} color="#666" />
           <Text style={styles.itemText}>Notifications</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.item}>
           <Ionicons name="lock-closed-outline" size={24} color="#666" />
           <Text style={styles.itemText}>Privacy</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
         <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  profileHeader: { backgroundColor: '#fff', padding: 24, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#eee', marginBottom: 20 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#25a25a', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  avatarText: { fontSize: 32, color: '#fff', fontWeight: 'bold' },
  name: { fontSize: 20, fontWeight: 'bold', color: '#000' },
  email: { fontSize: 14, color: '#666', marginTop: 4 },
  
  section: { backgroundColor: '#fff', borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#eee' },
  item: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#f9f9f9', gap: 12 },
  itemText: { fontSize: 16, color: '#333' },
  
  logoutButton: { margin: 20, backgroundColor: '#fee2e2', padding: 16, borderRadius: 12, alignItems: 'center' },
  logoutText: { color: '#ef4444', fontSize: 16, fontWeight: 'bold' },
});
