import AsyncStorage from '@react-native-async-storage/async-storage';

export const offlineStorage = {
  async saveMessage(conversationId: number, message: any) {
    const key = `messages_${conversationId}`;
    const existing = await AsyncStorage.getItem(key);
    const messages = existing ? JSON.parse(existing) : [];
    messages.push({ ...message, offline: true });
    await AsyncStorage.setItem(key, JSON.stringify(messages));
  },

  async getOfflineMessages(conversationId: number) {
    const key = `messages_${conversationId}`;
    const data = await AsyncStorage.getItem(key);
    return data ? JSON.parse(data).filter((m: any) => m.offline) : [];
  },

  async clearOfflineMessages(conversationId: number) {
    const key = `messages_${conversationId}`;
    await AsyncStorage.removeItem(key);
  },

  async saveConversations(conversations: any[]) {
    await AsyncStorage.setItem('conversations', JSON.stringify(conversations));
  },

  async getConversations() {
    const data = await AsyncStorage.getItem('conversations');
    return data ? JSON.parse(data) : [];
  },
};
