import { View, Text, FlatList, StyleSheet, RefreshControl, ActivityIndicator, ScrollView } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { useAuth } from '../../hooks/useAuth';
import Ionicons from '@expo/vector-icons/Ionicons';

export default function AnnouncementsScreen() {
  const { user } = useAuth();
  const { data: announcements = [], isLoading, refetch } = useQuery({
    queryKey: ['announcements'],
    queryFn: () => api.getAnnouncements(),
    enabled: !!user,
  });

  if (isLoading) {
    return <ActivityIndicator style={styles.center} size="large" color="#25a25a" />;
  }

  // Handle case where API might fail or user is not fully loaded yet
  if (!user) {
      return null; 
  }

  const featured = announcements.filter((a: any) => a.isFeatured);
  const regular = announcements.filter((a: any) => !a.isFeatured);

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={<RefreshControl refreshing={isLoading} onRefresh={() => refetch()} />}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Campus Updates</Text>
        <Text style={styles.headerSubtitle}>Latest news from Veritas University</Text>
      </View>

      {/* Featured Section */}
      {featured.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="star" size={16} color="#d97706" />
            <Text style={styles.sectionTitle}>Featured & Urgent</Text>
          </View>
          {featured.map((item: any) => (
            <View key={item.id} style={styles.featuredCard}>
              <View style={styles.cardHeader}>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>Important</Text>
                </View>
                <Text style={styles.date}>
                  {new Date(item.createdAt).toLocaleDateString()}
                </Text>
              </View>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardContent}>{item.content}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Regular Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="notifications" size={16} color="#666" />
          <Text style={[styles.sectionTitle, { color: '#666' }]}>Recent Updates</Text>
        </View>
        
        {regular.length === 0 && (
           <Text style={styles.empty}>No recent announcements.</Text>
        )}

        {regular.map((item: any) => (
          <View key={item.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.date}>
                 {new Date(item.createdAt).toLocaleDateString()}
              </Text>
            </View>
            <Text style={styles.cardContent}>{item.content}</Text>
          </View>
        ))}
      </View>
      
      <View style={{ height: 20 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  center: { flex: 1, justifyContent: 'center' },
  header: { padding: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#25a25a' },
  headerSubtitle: { fontSize: 14, color: '#666', marginTop: 4 },
  
  section: { padding: 16 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 6 },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: '#d97706', textTransform: 'uppercase', letterSpacing: 0.5 },
  
  featuredCard: {
    backgroundColor: '#fffbeb',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#fcd34d',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  card: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  badge: { backgroundColor: '#fef3c7', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  badgeText: { color: '#92400e', fontSize: 10, fontWeight: 'bold' },
  date: { fontSize: 12, color: '#999' },
  
  cardTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 4, flex: 1 },
  cardContent: { fontSize: 14, color: '#444', lineHeight: 20 },
  
  empty: { textAlign: 'center', marginTop: 20, color: '#999', fontStyle: 'italic' },
});
