import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeModules, Platform } from 'react-native';
import Constants from 'expo-constants';

// Production URL
const PROD_API_URL = 'https://veritas-uk6l.onrender.com';

function deriveApiBase(): string {
  // If we are in a development build, try to find local server
  if (__DEV__) {
    const explicit = process.env.EXPO_PUBLIC_API_URL || (Constants?.expoConfig?.extra as any)?.apiUrl;
    if (explicit) return explicit;

    // ... logic for local IP ...
    const scriptURL = (NativeModules as any)?.SourceCode?.scriptURL as string | undefined;
    if (scriptURL) {
      try {
        const { hostname } = new URL(scriptURL);
        const normalizedHost = hostname === '127.0.0.1' || hostname === 'localhost' ? (Constants?.expoConfig?.hostUri?.split(':')[0] || hostname) : hostname;
        return `http://${normalizedHost}:5000`;
      } catch {
        // ignore
      }
    }
  }

  // Default to production URL
  return PROD_API_URL;
}

export const API_BASE_URL = deriveApiBase();

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
});

apiClient.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  if (Platform.OS === 'web') {
    // We don't need credentials for JWT, but keeping it doesn't hurt. 
    // Actually, for JWT cross-origin, we purely rely on the header.
    // config.withCredentials = true; 
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

  async login(data: any) {
    const response = await apiClient.post('/api/auth/token', data);
    const { token } = response.data;
    if (token) {
      await AsyncStorage.setItem('auth_token', token);
    }
    return response.data;
  },

  async logout() {
    await AsyncStorage.removeItem('auth_token');
    try {
      await apiClient.post('/api/logout');
    } catch (e) {
      // ignore
    }
  },
};

export { apiClient };
