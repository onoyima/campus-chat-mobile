import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import * as SplashScreen from 'expo-splash-screen';
import { useIdentityStore } from './store/identityStore';
import RootLayout from './app/_layout';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

const queryClient = new QueryClient();

export default function RootApp() {
  const loadIdentity = useIdentityStore((state) => state.loadIdentity);

  useEffect(() => {
    const init = async () => {
      try {
        await SplashScreen.hideAsync();
        await loadIdentity();
      } catch (e) {
        console.error(e);
      }
    };

    init();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <RootLayout />
    </QueryClientProvider>
  );
}
