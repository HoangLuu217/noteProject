import { Redirect, Stack } from 'expo-router';
import { LoadingScreen } from '../../src/components/common/LoadingScreen';
import { useAuthStore } from '../../src/stores/authStore';

export default function AppLayout() {
  const { accessToken, isHydrated } = useAuthStore();

  if (!isHydrated) return <LoadingScreen />;
  if (!accessToken) return <Redirect href="/(auth)/login" />;

  return <Stack screenOptions={{ headerStyle: { backgroundColor: '#F8FAFC' }, headerTintColor: '#0F172A' }} />;
}
