import { View, Text, FlatList, TouchableOpacity, TextInput, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../lib/api';
import { useAuth } from '../../../hooks/useAuth';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [messageText, setMessageText] = useState('');
  const conversationId = Number(id);

  const { data: chat, isLoading } = useQuery({
    queryKey: ['chat', conversationId],
    queryFn: () => api.getChat(conversationId),
    enabled: !!user,
  });

  const { data: messages = [] } = useQuery({
    queryKey: ['messages', conversationId],
    queryFn: () => api.getMessages(conversationId),
    enabled: !!user,
    refetchInterval: 2000,
  });

  const sendMutation = useMutation({
    mutationFn: (content: string) => api.sendMessage(conversationId, content),
    onSuccess: () => {
      setMessageText('');
      queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
    },
  });

  if (isLoading) {
    return <ActivityIndicator style={styles.center} size="large" color="#25a25a" />;
  }

  const handleSend = () => {
    if (messageText.trim()) {
      sendMutation.mutate(messageText);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <FlatList
        data={messages}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <View style={[styles.messageRow, item.senderIdentityId === user?.id ? styles.ownMessage : null]}>
            <View style={[styles.messageBubble, item.senderIdentityId === user?.id ? styles.ownBubble : styles.otherBubble]}>
              <Text style={[styles.messageText, item.senderIdentityId === user?.id ? styles.ownText : null]}>{item.content}</Text>
            </View>
          </View>
        )}
        inverted
      />
      <View style={styles.inputContainer}>
        <TextInput style={styles.input} placeholder="Type a message..." value={messageText} onChangeText={setMessageText} editable={!sendMutation.isPending} />
        <TouchableOpacity style={[styles.sendButton, sendMutation.isPending && styles.sendButtonDisabled]} onPress={handleSend} disabled={sendMutation.isPending || !messageText.trim()}>
          <Ionicons name="send" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, justifyContent: 'center' },
  messageRow: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 8 },
  ownMessage: { justifyContent: 'flex-end' },
  messageBubble: { maxWidth: '80%', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12 },
  ownBubble: { backgroundColor: '#25a25a' },
  otherBubble: { backgroundColor: '#e0e0e0' },
  messageText: { fontSize: 14, color: '#333' },
  ownText: { color: '#fff' },
  inputContainer: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#eee' },
  input: { flex: 1, borderRadius: 20, backgroundColor: '#f0f0f0', paddingHorizontal: 16, paddingVertical: 10, marginRight: 8 },
  sendButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#25a25a', justifyContent: 'center', alignItems: 'center' },
  sendButtonDisabled: { opacity: 0.5 },
});
