
import { useEffect, useState, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList, KeyboardAvoidingView, Platform, ActivityIndicator, Alert, Image as RNImage } from 'react-native';
import { useLocalSearchParams, Stack, router } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, apiClient, API_BASE_URL } from '../../lib/api';
import { useAuth } from '../../hooks/useAuth';
import { useWebSocket } from '../../hooks/useWebSocket';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { Audio } from 'expo-av';

export default function ChatScreen() {
  const { id } = useLocalSearchParams();
  const conversationId = Number(id);
  const { user } = useAuth();
  const { initiateCall } = useWebSocket();
  const queryClient = useQueryClient();
  const flatListRef = useRef<FlatList>(null);
  
  const [inputText, setInputText] = useState('');
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [playingId, setPlayingId] = useState<number | null>(null);
  const [initialScrollDone, setInitialScrollDone] = useState(false);

  useEffect(() => {
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [sound]);

  // Mark as Read Effect
  useEffect(() => {
    if (conversationId) {
        api.markChatAsRead(conversationId).catch(console.error);
        queryClient.invalidateQueries({ queryKey: ['conversations'] });
    }
  }, [conversationId]);

  // Fetch Conversation Details
  const { data: conversation } = useQuery({
    queryKey: ['conversation', conversationId],
    queryFn: () => api.getChat(conversationId),
    enabled: !!conversationId,
  });

  // Fetch Messages
  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['messages', conversationId],
    queryFn: () => api.getMessages(conversationId),
    enabled: !!conversationId,
  });

  // Find first unread index
  const firstUnreadIndex = (messages || []).findIndex((msg: any) => 
    msg.senderIdentityId !== user?.id && 
    !msg.statuses?.some((s: any) => s.identityId === user?.id && s.status === 'read')
  );

  // Initial Scroll Logic
  useEffect(() => {
    if (!isLoading && messages && messages.length > 0 && !initialScrollDone && flatListRef.current) {
        setTimeout(() => {
            if (firstUnreadIndex !== -1) {
                // Since variable height is hard for scrollToIndex, we try our best 
                // Alternatively, just scrollToEnd if no unread
                flatListRef.current?.scrollToIndex({ index: firstUnreadIndex, animated: false, viewPosition: 0 });
            } else {
                flatListRef.current?.scrollToEnd({ animated: false });
            }
            setInitialScrollDone(true);
        }, 100);
    }
  }, [isLoading, messages, initialScrollDone, firstUnreadIndex]);

  useEffect(() => {
    setInitialScrollDone(false);
  }, [conversationId]);

  // Auto-scroll on new message
  const prevMsgCount = useRef(0);
  useEffect(() => {
      if (initialScrollDone && messages && messages.length > prevMsgCount.current) {
          const lastMsg = messages[messages.length - 1];
          if (lastMsg.senderIdentityId === user?.id) {
              flatListRef.current?.scrollToEnd({ animated: true });
          }
      }
      prevMsgCount.current = messages?.length || 0;
  }, [messages?.length, initialScrollDone]);

  // Send Message Mutation
  const sendMessageMutation = useMutation({
    mutationFn: (content: string) => api.sendMessage(conversationId, content),
    onSuccess: () => {
      setInputText('');
      queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
    onError: () => {
      Alert.alert('Error', 'Failed to send message');
    },
  });

  // --- Voice Recording Logic ---
  async function startRecording() {
    try {
      const perm = await Audio.requestPermissionsAsync();
      if (perm.status === 'granted') {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
        });

        // Use standard preset
        const { recording } = await Audio.Recording.createAsync(
            Audio.RecordingOptionsPresets.HIGH_QUALITY
        );
        setRecording(recording);
      } else {
        Alert.alert('Permission Denied', 'Microphone permission is required to record voice notes.');
      }
    } catch (err: any) {
      Alert.alert('Failed to start recording', err?.message);
    }
  }

  async function stopRecording() {
    if (!recording) return;
    try {
        setRecording(null);
        await recording.stopAndUnloadAsync();
        const uri = recording.getURI(); 
        if (uri) {
          uploadVoiceNote(uri);
        }
    } catch (error) {
        console.error("Stop recording failed", error);
    }
  }

  const uploadVoiceNote = async (uri: string) => {
    const formData = new FormData();
    const filename = uri.split('/').pop() || 'voice.m4a';
    // Mime type usually audio/m4a for iOS/Android recordings
    const type = 'audio/m4a';
    
    // @ts-ignore
    formData.append('file', { uri, name: filename, type });

    try {
        const res = await apiClient.post('/api/upload', formData);
        const { url } = res.data;
        
        // We need to send as explicit type. api.sendMessage only handles text defaulting to 'text'
        // So we call endpoint directly or add method. Using direct call for now.
        await apiClient.post(`/api/conversations/${conversationId}/messages`, {
            content: 'Voice Message',
            type: 'audio',
            metadata: { url, duration: 0 } // Todo: get duration
        });
        queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
    } catch (err) {
        Alert.alert('Upload Failed', 'Could not send voice note');
        console.error(err);
    }
  };

  const handlePlayAudio = async (url: string, id: number) => {
      if (playingId === id) {
          // Stop if currently playing
          if (sound) await sound.stopAsync();
          setPlayingId(null);
          return;
      }

      // Stop previous
      if (sound) {
          await sound.unloadAsync();
      }

      // Fix Relative URL for Mobile
      const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
      console.log('Playing sound:', fullUrl);
      
      try {
          const { sound: newSound } = await Audio.Sound.createAsync(
              { uri: fullUrl },
              { shouldPlay: true }
          );
          setSound(newSound);
          setPlayingId(id);

          newSound.setOnPlaybackStatusUpdate((status) => {
              if (status.isLoaded && status.didJustFinish) {
                  setPlayingId(null);
              }
          });
      } catch (error) {
          Alert.alert("Playback Error", "Could not play audio file.");
          console.error(error);
      }
  };

  const handleSend = () => {
    if (!inputText.trim()) return;
    sendMessageMutation.mutate(inputText);
  };

  const handleCall = (type: 'voice' | 'video') => {
    // Identify target - For DIRECT chats, it's the other person.
    const target = conversation?.participants?.find((p: any) => p.identityId !== user?.id);
    if (!target) {
        Alert.alert("Error", "Cannot find user to call.");
        return;
    }
    initiateCall(target.identityId, type);
  };


  const renderMessage = ({ item, index }: { item: any, index: number }) => {
    const isMe = item.senderIdentityId === user?.id; 
    const showAvatar = !isMe && (index === 0 || messages[index - 1]?.senderIdentityId !== item.senderIdentityId);
    
    // Fix URL helper
    const getFullUrl = (path: string) => path?.startsWith('http') ? path : `${API_BASE_URL}${path}`;

    return (
      <View style={[styles.messageRow, isMe ? styles.messageRowMe : styles.messageRowOther]}>
        {!isMe && (
           <View style={styles.avatarContainer}>
             {showAvatar ? (
               <View style={styles.avatar}>
                 <Text style={styles.avatarText}>{item.senderIdentity?.displayName?.substring(0, 1) || '?'}</Text>
               </View>
             ) : <View style={styles.avatarSpacer} />}
           </View>
        )}
        
        <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleOther]}>
          {!isMe && showAvatar && (
            <Text style={styles.senderName}>{item.senderIdentity?.displayName}</Text>
          )}
          
          {item.type === 'image' ? (
             <Image source={{ uri: getFullUrl(item.metadata?.url) }} style={styles.messageImage} contentFit="cover" />
          ) : item.type === 'audio' && item.metadata?.url ? (
             <TouchableOpacity 
                activeOpacity={0.7}
                onPress={() => handlePlayAudio(item.metadata?.url, item.id)}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8, paddingHorizontal: 4, minWidth: 160 }}
             >
                 {/* Play/Pause Icon (Minimal) */}
                 <View style={{ 
                     width: 32, height: 32, borderRadius: 16, 
                     backgroundColor: isMe ? 'rgba(0,0,0,0.1)' : '#f0f0f0', 
                     justifyContent: 'center', alignItems: 'center' 
                 }}>
                     <Ionicons 
                        name={playingId === item.id ? "pause" : "play"} 
                        size={16} 
                        color={isMe ? "#000" : "#666"} 
                     />
                 </View>

                 {/* Waveform Visualization */}
                 <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, height: 24 }}>
                     {[3, 5, 8, 5, 3, 4, 7, 5, 2].map((h, i) => (
                         <View 
                            key={i} 
                            style={{ 
                                width: 3, 
                                height: playingId === item.id ? 12 + Math.random() * 12 : h * 3, // Animate height if playing (mock)
                                backgroundColor: isMe ? '#000' : '#888',
                                borderRadius: 1.5,
                                opacity: 0.7 
                            }} 
                         />
                     ))}
                 </View>
                 
                 {/* Duration (Mock or Real) */}
                 <Text style={{ fontSize: 10, color: isMe ? 'rgba(0,0,0,0.5)' : '#999', marginLeft: 'auto' }}>
                     {item.metadata?.duration ? `${Math.floor(item.metadata.duration)}s` : 'Voice'}
                 </Text>
             </TouchableOpacity>
          ) : (
             <Text style={[styles.messageText, isMe ? styles.textMe : styles.textOther]}>{item.content}</Text>
          )}
          
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 4, marginTop: 2 }}>
            <Text style={[styles.timestamp, isMe ? styles.textMe : styles.textOther, { opacity: 0.6, fontSize: 10, marginTop: 0 }]}>
                {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
            {isMe && (
                <Ionicons 
                    name={item.statuses?.some((s: any) => s.identityId !== user?.id && s.status === 'read') ? "checkmark-done" : "checkmark"} 
                    size={14} 
                    color={item.statuses?.some((s: any) => s.identityId !== user?.id && s.status === 'read') ? "#3b82f6" : "rgba(255,255,255,0.7)"} 
                />
            )}
          </View>
        </View>
      </View>
    );
  };

  // Get other participant name for title
  const title = conversation?.name || conversation?.participants?.find((p: any) => p.identityId !== user?.id)?.identity?.displayName || 'Chat';

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <Stack.Screen 
        options={{ 
          title: title,
          headerRight: () => (
            <View style={{ flexDirection: 'row', gap: 15 }}>
              <TouchableOpacity onPress={() => handleCall('voice')}>
                <Ionicons name="call-outline" size={24} color="#25a25a" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleCall('video')}>
                <Ionicons name="videocam-outline" size={24} color="#25a25a" />
              </TouchableOpacity>
            </View>
          )
        }} 
      />

      {isLoading ? (
        <ActivityIndicator style={styles.loader} size="large" color="#25a25a" />
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          onScrollToIndexFailed={(info) => {
              flatListRef.current?.scrollToOffset({ offset: info.averageItemLength * info.index, animated: false });
          }}
        />
      )}

      <View style={styles.inputContainer}>
        <TouchableOpacity style={styles.attachButton}>
          <Ionicons name="add" size={24} color="#666" />
        </TouchableOpacity>
        
        <TextInput
          style={styles.input}
          placeholder={recording ? "Recording..." : "Type a message..."}
          value={inputText}
          onChangeText={setInputText}
          multiline
          editable={!recording}
        />
        
        {inputText.trim() ? (
          <TouchableOpacity style={styles.sendButton} onPress={handleSend}>
            <Ionicons name="send" size={20} color="#fff" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity 
            style={[styles.micButton, recording && { backgroundColor: '#ef4444' }]} 
            onPress={recording ? stopRecording : startRecording}
          >
             <Ionicons name={recording ? "stop" : "mic"} size={24} color={recording ? "#fff" : "#666"} />
          </TouchableOpacity>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#efeae2' },
  loader: { flex: 1, justifyContent: 'center' },
  listContent: { padding: 16, paddingBottom: 20 },
  
  messageRow: { flexDirection: 'row', marginBottom: 10, alignItems: 'flex-end' },
  messageRowMe: { justifyContent: 'flex-end' },
  messageRowOther: { justifyContent: 'flex-start' },
  
  avatarContainer: { width: 30, marginRight: 8 },
  avatar: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#ddd', justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 12, fontWeight: 'bold', color: '#555' },
  avatarSpacer: { width: 30 },
  
  bubble: { maxWidth: '75%', padding: 10, borderRadius: 16, elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 1 },
  bubbleMe: { backgroundColor: '#e7ffdb', borderTopRightRadius: 2 },
  bubbleOther: { backgroundColor: '#fff', borderTopLeftRadius: 2 },
  
  senderName: { fontSize: 12, color: '#e58e26', fontWeight: 'bold', marginBottom: 2 },
  messageText: { fontSize: 16, lineHeight: 22 },
  textMe: { color: '#000' },
  textOther: { color: '#000' },
  
  messageImage: { width: 200, height: 200, borderRadius: 8 },
  audioContainer: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4, paddingHorizontal: 4, minWidth: 140 },
  
  timestamp: { fontSize: 10, alignSelf: 'flex-end', marginTop: 4 },
  
  inputContainer: { flexDirection: 'row', padding: 10, backgroundColor: '#fff', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#eee' },
  input: { flex: 1, backgroundColor: '#f9f9f9', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8, maxHeight: 100, fontSize: 16, marginHorizontal: 8 },
  attachButton: { padding: 8 },
  sendButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#25a25a', justifyContent: 'center', alignItems: 'center' },
  micButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center' },
});
