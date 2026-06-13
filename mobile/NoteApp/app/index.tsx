import { Redirect } from 'expo-router';
import { LoadingScreen } from '../src/components/common/LoadingScreen';
import { useAuthStore } from '../src/stores/authStore';

export default function Index() {
  const { accessToken, isHydrated } = useAuthStore();

  if (!isHydrated) return <LoadingScreen />;
  if (accessToken) return <Redirect href="/(app)" />;
  return <Redirect href="/(auth)/login" />;
}
