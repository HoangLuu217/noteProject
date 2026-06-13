import { Redirect, Stack } from 'expo-router';
import { LoadingScreen } from '../../src/components/common/LoadingScreen';
import { useAuthStore } from '../../src/stores/authStore';

export default function AuthLayout() {
  const { accessToken, isHydrated } = useAuthStore();

  if (!isHydrated) return <LoadingScreen />;
  if (accessToken) return <Redirect href="/(app)" />;

  return <Stack screenOptions={{ headerShown: false }} />;
}
