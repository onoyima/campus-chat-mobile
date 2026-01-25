import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiClient, API_BASE_URL } from '../lib/api';
import { router } from 'expo-router';
import axios from 'axios';
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

const BASE = API_BASE_URL;

export function useAuth() {
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const sessionId = await AsyncStorage.getItem('session_id');
        if (sessionId) {
          // Verify session by fetching user
          try {
            const response = await apiClient.get(`/api/auth/user`);
            if (response.data && response.data.id) {
                setUser(response.data);
                setIsAuthenticated(true);
            } else {
                throw new Error("Invalid user data");
            }
          } catch (err: any) {
            if (err?.code === 'ERR_NETWORK') {
              const alt = togglePort(API_BASE_URL);
              if (alt) {
                const response = await axios.get(alt + `/api/auth/user`, { timeout: 10000 });
                if (response.data && response.data.id) {
                  setUser(response.data);
                  setIsAuthenticated(true);
                } else {
                  throw new Error("Invalid user data");
                }
              } else {
                throw err;
              }
            } else {
              throw err;
            }
          }
        }
      } catch (error) {
        console.log('Not authenticated');
        await AsyncStorage.removeItem('session_id'); // Clear invalid session
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
      const response = await apiClient.post(`/api/login`, { email, password });
      const { sessionId, user } = response.data;
      
      // Store session ID for subsequent requests
      if (sessionId) {
          await AsyncStorage.setItem('session_id', sessionId);
      }
      
      setUser(user);
      setIsAuthenticated(true);
      router.replace('/(tabs)');
    } catch (error) {
      if ((error as any)?.code === 'ERR_NETWORK') {
        const alt = togglePort(API_BASE_URL);
        if (alt) {
          const response = await axios.post(alt + `/api/login`, { email, password }, { timeout: 10000 });
          const { sessionId, user } = response.data;
          if (sessionId) {
              await AsyncStorage.setItem('session_id', sessionId);
          }
          setUser(user);
          setIsAuthenticated(true);
          router.replace('/(tabs)');
          return;
        }
      }
      throw error;
    }
  };

  const logout = async () => {
    try {
      try {
        await apiClient.post(`/api/logout`);
      } catch (err: any) {
        if (err?.code === 'ERR_NETWORK') {
          const alt = togglePort(API_BASE_URL);
          if (alt) {
            await axios.post(alt + `/api/logout`, undefined, { timeout: 10000 });
          }
        }
      }
      await AsyncStorage.removeItem('session_id');
      setUser(null);
      setIsAuthenticated(false);
      router.replace('/login');
    } catch (error) {
      console.error('Logout error:', error);
      // Force logout on client anyway
      await AsyncStorage.removeItem('session_id');
      setUser(null);
      setIsAuthenticated(false);
      router.replace('/login');
    }
  };

  return { user, isLoading, isAuthenticated, login, logout };
}
