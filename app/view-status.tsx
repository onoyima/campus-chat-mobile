import { View, Text, Image, StyleSheet, TouchableOpacity, SafeAreaView, Dimensions, Platform, StatusBar } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { API_BASE_URL } from '../lib/api';
import Ionicons from '@expo/vector-icons/Ionicons';

const { width, height } = Dimensions.get('window');

export default function ViewStatusScreen() {
    const params = useLocalSearchParams();
    const content = params.content as string;
    const mediaUrl = params.mediaUrl as string;
    const displayName = params.displayName as string;
    const createdAt = params.createdAt as string;
    
    // Construct full URL for the image
    const fullMediaUrl = mediaUrl 
        ? (mediaUrl.startsWith('http') ? mediaUrl : `${API_BASE_URL}${mediaUrl}`)
        : null;

    return (
        <SafeAreaView style={styles.container}>
             <StatusBar barStyle="light-content" backgroundColor="#000" />
             
             {/* Header */}
             <View style={styles.progressContainer}>
                 <View style={styles.progressBar} />
             </View>

             <View style={styles.header}>
                 <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                     <Ionicons name="arrow-back" size={24} color="#fff" />
                 </TouchableOpacity>
                 
                 <View style={styles.userInfo}>
                     <Text style={styles.userName}>{displayName || 'User'}</Text>
                     <Text style={styles.timestamp}>
                        {createdAt ? new Date(createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                     </Text>
                 </View>
             </View>
             
             {/* Content */}
             <View style={styles.content}>
                 {fullMediaUrl ? (
                     <>
                        <Image 
                            source={{ uri: fullMediaUrl }} 
                            style={styles.image} 
                            resizeMode="contain"
                        />
                        {content ? (
                            <View style={styles.captionContainer}>
                                <Text style={styles.caption}>{content}</Text>
                            </View>
                        ) : null}
                     </>
                 ) : (
                     <View style={[styles.textOnlyContainer, { backgroundColor: '#2c3e50' }]}>
                         <Text style={styles.textOnly}>{content}</Text>
                     </View>
                 )}
             </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  progressContainer: { flexDirection: 'row', height: 2, backgroundColor: 'rgba(255,255,255,0.3)', marginHorizontal: 10, marginTop: Platform.OS === 'android' ? 10 : 0 },
  progressBar: { width: '100%', height: '100%', backgroundColor: '#fff' },
  
  header: { flexDirection: 'row', alignItems: 'center', padding: 12, position: 'absolute', top: Platform.OS === 'android' ? 20 : 40, left: 0, right: 0, zIndex: 10 },
  backBtn: { marginRight: 12 },
  userInfo: { flex: 1 },
  userName: { color: '#fff', fontSize: 16, fontWeight: '600' },
  timestamp: { color: 'rgba(255,255,255,0.7)', fontSize: 12 },
  
  content: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  image: { width: width, height: height * 0.8 },
  
  captionContainer: { position: 'absolute', bottom: 40, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.5)', padding: 20, alignItems: 'center' },
  caption: { color: '#fff', fontSize: 16, textAlign: 'center' },
  
  textOnlyContainer: { width: width, height: height, justifyContent: 'center', alignItems: 'center', padding: 40 },
  textOnly: { color: '#fff', fontSize: 24, textAlign: 'center', fontWeight: 'bold' }
});
