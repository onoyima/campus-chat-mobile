import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../lib/api';

interface Identity {
  id: number;
  displayName: string;
  role: string;
  email: string;
}

interface IdentityStore {
  currentIdentity: Identity | null;
  setCurrentIdentity: (identity: Identity) => void;
  switchIdentity: (id: number) => Promise<void>;
  loadIdentity: () => Promise<void>;
}

export const useIdentityStore = create<IdentityStore>((set) => ({
  currentIdentity: null,

  setCurrentIdentity: (identity) => {
    AsyncStorage.setItem('current_identity', JSON.stringify(identity));
    set({ currentIdentity: identity });
  },

  switchIdentity: async (id) => {
    try {
      await api.switchIdentity(id);
      const identity = await api.getMe();
      set({ currentIdentity: identity });
    } catch (error) {
      console.error('Switch identity error:', error);
    }
  },

  loadIdentity: async () => {
    try {
      const stored = await AsyncStorage.getItem('current_identity');
      if (stored) {
        set({ currentIdentity: JSON.parse(stored) });
      }
      const identity = await api.getMe();
      set({ currentIdentity: identity });
    } catch (error) {
      console.error('Load identity error:', error);
    }
  },
}));
