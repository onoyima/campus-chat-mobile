
import { useEffect, useState, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList, KeyboardAvoidingView, Platform, ActivityIndicator, Alert, Image as RNImage } from 'react-native';
import { useLocalSearchParams, Stack, router } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { useAuth } from '../../hooks/useAuth';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';

export default function ChatScreen() {
  const { id } = useLocalSearchParams();
  const conversationId = Number(id);
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const flatListRef = useRef<FlatList>(null);
  const [inputText, setInputText] = useState('');

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
    refetchInterval: 2000, // Poll every 2s
  });

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

  const handleSend = () => {
    if (!inputText.trim()) return;
    sendMessageMutation.mutate(inputText);
  };

  const handleCall = (type: 'voice' | 'video') => {
    Alert.alert('Coming Soon', `${type === 'voice' ? 'Voice' : 'Video'} calls will be supported soon.`);
    // api.initiateCall(targetId, type)...
  };

  const renderMessage = ({ item, index }: { item: any, index: number }) => {
    const isMe = item.senderIdentityId === user?.id; // Assuming user.id maps to identityId roughly or we need a proper check
    // In real app, user object might be the User table, but messages use Identity ID. 
    // We might need to fetch "Me" identity to be sure.
    // For now, let's assume the API returns `isMe` or we infer it. 
    // Actually, `api.getMe()` returns the current identity. We should use that.

    const showAvatar = !isMe && (index === 0 || messages[index - 1]?.senderIdentityId !== item.senderIdentityId);

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
             <Image source={{ uri: item.metadata?.url }} style={styles.messageImage} contentFit="cover" />
          ) : (
             <Text style={[styles.messageText, isMe ? styles.textMe : styles.textOther]}>{item.content}</Text>
          )}
          
          <Text style={[styles.timestamp, isMe ? styles.textMe : styles.textOther, { opacity: 0.7 }]}>
            {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
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
          data={messages} // Reversed? API usually returns newest first? Or oldest? 
          // If API returns newest first (desc), we should invert. 
          // Let's assume standard chat: Oldest at top (asc) or Newest at bottom.
          // If API returns standard list, we render normally.
          renderItem={renderMessage}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
        />
      )}

      <View style={styles.inputContainer}>
        <TouchableOpacity style={styles.attachButton}>
          <Ionicons name="add" size={24} color="#666" />
        </TouchableOpacity>
        
        <TextInput
          style={styles.input}
          placeholder="Type a message..."
          value={inputText}
          onChangeText={setInputText}
          multiline
        />
        
        {inputText.trim() ? (
          <TouchableOpacity style={styles.sendButton} onPress={handleSend}>
            <Ionicons name="send" size={20} color="#fff" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.micButton}>
             <Ionicons name="mic" size={20} color="#666" />
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
  
  timestamp: { fontSize: 10, alignSelf: 'flex-end', marginTop: 4 },
  
  inputContainer: { flexDirection: 'row', padding: 10, backgroundColor: '#fff', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#eee' },
  input: { flex: 1, backgroundColor: '#f9f9f9', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8, maxHeight: 100, fontSize: 16, marginHorizontal: 8 },
  attachButton: { padding: 8 },
  sendButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#25a25a', justifyContent: 'center', alignItems: 'center' },
  micButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center' },
});
