import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthButton } from '../../src/components/auth/AuthButton';
import { colors } from '../../src/constants/colors';
import { useAuthStore } from '../../src/stores/authStore';

export const options = { title: 'Trang chủ' };

export default function HomeScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.greeting}>Xin chào,</Text>
        <Text style={styles.name}>{user?.fullName || 'Người dùng'}</Text>
        <Text style={styles.desc}>Phần ghi chú sẽ được thêm ở đây.</Text>
        <AuthButton title="Xem hồ sơ" onPress={() => router.push('/(app)/profile')} style={styles.btn} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1, padding: 24, justifyContent: 'center' },
  greeting: { fontSize: 18, color: colors.textSecondary },
  name: { fontSize: 32, fontWeight: '800', color: colors.text, marginBottom: 12 },
  desc: { fontSize: 16, color: colors.textSecondary, marginBottom: 24 },
  btn: { alignSelf: 'flex-start', paddingHorizontal: 24 },
});
