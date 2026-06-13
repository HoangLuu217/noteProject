import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { colors } from '../src/constants/colors';
import { useAuthStore } from '../src/stores/authStore';

export default function RootLayout() {
  const { isHydrated, accessToken, loadProfile, setHydrated } = useAuthStore();

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!useAuthStore.getState().isHydrated) {
        setHydrated(true);
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [setHydrated]);

  useEffect(() => {
    if (isHydrated && accessToken) loadProfile();
  }, [isHydrated, accessToken, loadProfile]);

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      />
    </SafeAreaProvider>
  );
}
