// ... imports ...
import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiClient, API_BASE_URL } from '../lib/api';
import { router } from 'expo-router';
import axios from 'axios';

// ... togglePort helper ...
function togglePort(base: string | undefined): string | undefined {
  if (!base) return base;
  if (base.includes('ngrok-free.app')) return base;
  try {
    const u = new URL(base);
    const p = u.port || '80';
    const next = p === '5000' ? '5001' : '5000';
    u.port = next;
    return u.toString();
  } catch {
    return base;
  }
}

export function useAuth() {
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = await AsyncStorage.getItem('auth_token');
        if (token) {
          // Verify session by fetching user
          try {
            // Note: interceptor adds the token to header automatically
            const response = await apiClient.get(`/api/auth/user`);
            if (response.data && response.data.id) {
              setUser(response.data);
              setIsAuthenticated(true);
            } else {
              throw new Error("Invalid user data");
            }
          } catch (err: any) {
            // Handle network errors or invalid token
            if (err?.response?.status === 401) {
              await AsyncStorage.removeItem('auth_token');
              setUser(null);
              setIsAuthenticated(false);
            }
          }
        }
      } catch (error) {
        console.log('Not authenticated');
        await AsyncStorage.removeItem('auth_token'); // Clear invalid token
        setUser(null);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      // Use JWT login endpoint
      const response = await apiClient.post(`/api/auth/token`, { email, password });
      const { token, user } = response.data;

      if (token) {
        await AsyncStorage.setItem('auth_token', token);
      }

      setUser(user);
      setIsAuthenticated(true);
      router.replace('/(tabs)');
    } catch (error) {
      // ... existing error handling adapted ...
      if ((error as any)?.code === 'ERR_NETWORK') {
        // Fallback logic for local dev port toggling if needed
        // Simulating the same for JWT token endpoint
        const alt = togglePort(API_BASE_URL);
        if (alt) {
          try {
            const response = await axios.post(alt + `/api/auth/token`, { email, password }, { timeout: 10000 });
            const { token, user } = response.data;
            if (token) {
              await AsyncStorage.setItem('auth_token', token);
              // We also need to update apiClient base URL effectively or rely on it failing over? 
              // For now assuming this is just a quick retry.
            }
            setUser(user);
            setIsAuthenticated(true);
            router.replace('/(tabs)');
            return;
          } catch (e) {
            throw error; // Throw original error if fallback fails
          }
        }
      }
      throw error;
    }
  };

  const logout = async () => {
    try {
      try {
        await apiClient.post(`/api/logout`);
      } catch (err) {
        // ignore
      }
      await AsyncStorage.removeItem('auth_token');
      setUser(null);
      setIsAuthenticated(false);
      router.replace('/login');
    } catch (error) {
      console.error('Logout error:', error);
      // Force logout on client anyway
      await AsyncStorage.removeItem('auth_token');
      setUser(null);
      setIsAuthenticated(false);
      router.replace('/login');
    }
  };

  return { user, isLoading, isAuthenticated, login, logout };
}
