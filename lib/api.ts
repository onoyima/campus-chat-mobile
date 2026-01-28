import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeModules, Platform } from 'react-native';
import Constants from 'expo-constants';

function deriveApiBase(): string | undefined {
  const explicit = process.env.EXPO_PUBLIC_API_URL || (Constants?.expoConfig?.extra as any)?.apiUrl;
  if (explicit) return explicit;
  const scriptURL = (NativeModules as any)?.SourceCode?.scriptURL as string | undefined;
  if (scriptURL) {
    try {
      const { hostname } = new URL(scriptURL);
      const normalizedHost = hostname === '127.0.0.1' || hostname === 'localhost' ? (Constants?.expoConfig?.hostUri?.split(':')[0] || hostname) : hostname;
      return `http://${normalizedHost}:5000`;
    } catch {
      // ignore parse errors
    }
  }
  if (Platform.OS === 'web') {
    const hostname = typeof window !== 'undefined' ? window.location.hostname : '127.0.0.1';
    return `http://${hostname}:5000`;
  }
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:5000';
  }
  return 'http://127.0.0.1:5000';
}

export const API_BASE_URL = deriveApiBase();

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
});

apiClient.interceptors.request.use(async (config) => {
  const sessionId = await AsyncStorage.getItem('session_id');
  if (sessionId) {
    config.headers.Cookie = `connect.sid=${encodeURIComponent(sessionId)}`;
  }
  if (Platform.OS === 'web') {
    config.withCredentials = true;
  }
  if (API_BASE_URL && API_BASE_URL.includes('ngrok-free.app')) {
    config.headers['ngrok-skip-browser-warning'] = 'true';
    if (!config.headers['User-Agent']) {
      config.headers['User-Agent'] = 'VeritasMobile/1.0';
    }
  }
  return config;
});

export const api = {
  async getConversations() {
    const { data } = await apiClient.get('/api/conversations');
    return data;
  },

  async getChat(conversationId: number) {
    const { data } = await apiClient.get(`/api/conversations/${conversationId}`);
    return data;
  },

  async getMessages(conversationId: number) {
    const { data } = await apiClient.get(`/api/conversations/${conversationId}/messages`);
    return data;
  },

  async sendMessage(conversationId: number, content: string) {
    const { data } = await apiClient.post(`/api/conversations/${conversationId}/messages`, {
      content,
      type: 'text',
    });
    return data;
  },

  async createDirectChat(targetIdentityId: number) {
    const { data } = await apiClient.post('/api/conversations/direct', {
      targetIdentityId,
    });
    return data;
  },

  async getIdentities() {
    const { data } = await apiClient.get('/api/identities');
    return data;
  },

  async getMe() {
    const { data } = await apiClient.get('/api/identity/me');
    return data;
  },

  async getNotifications() {
    const { data } = await apiClient.get('/api/notifications');
    return data;
  },

  async getStatusUpdates() {
    const { data } = await apiClient.get('/api/status-updates');
    return data;
  },

  async createStatusUpdate(payload: any) {
    const { data } = await apiClient.post('/api/status-updates', payload);
    return data;
  },

  async getCalls() {
    const { data } = await apiClient.get('/api/calls');
    return data;
  },

  async initiateCall(targetIdentityId: number, type: 'voice' | 'video') {
    const { data } = await apiClient.post('/api/calls/initiate', {
      targetIdentityId,
      type,
    });
    return data;
  },

  async switchIdentity(identityId: number) {
    const { data } = await apiClient.post('/api/debug/switch-identity', {
      identityId,
    });
    return data;
  },

  async getAnnouncements() {
    const { data } = await apiClient.get('/api/announcements');
    return data;
  },

  async createGroupChat(name: string, participantIds: number[]) {
    const { data } = await apiClient.post('/api/conversations/group', {
      name,
      participantIds,
    });
    return data;
  },
};

export { apiClient };
