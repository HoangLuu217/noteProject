import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthButton } from '../../src/components/auth/AuthButton';
import { AuthInput } from '../../src/components/auth/AuthInput';
import { GoogleSignInSection } from '../../src/components/auth/GoogleSignInSection';
import { isFirebaseConfigured } from '../../src/config/env';
import { colors } from '../../src/constants/colors';
import { useAuthStore } from '../../src/stores/authStore';

export default function LoginScreen() {
  const router = useRouter();
  const { login, isLoading } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const validate = () => {
    const next: typeof errors = {};
    if (!email.trim()) next.email = 'Vui lòng nhập email';
    if (!password) next.password = 'Vui lòng nhập mật khẩu';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleLogin = async () => {
    if (!isFirebaseConfigured()) {
      Alert.alert('Thiếu cấu hình', 'Thêm EXPO_PUBLIC_FIREBASE_* vào file .env');
      return;
    }
    if (!validate()) return;

    try {
      await login(email, password);
      router.replace('/(app)');
    } catch (error) {
      Alert.alert('Đăng nhập thất bại', error instanceof Error ? error.message : 'Vui lòng thử lại');
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>Chào mừng trở lại</Text>
          <Text style={styles.subtitle}>Đăng nhập để tiếp tục quản lý ghi chú</Text>

          <AuthInput label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" placeholder="name@example.com" error={errors.email} />
          <AuthInput label="Mật khẩu" value={password} onChangeText={setPassword} secureTextEntry placeholder="••••••••" error={errors.password} />

          <Pressable
            onPress={() =>
              router.push({
                pathname: '/(auth)/forgot-password',
                params: email.trim() ? { email: email.trim() } : undefined,
              })
            }
            style={styles.forgotButton}
          >
            <Text style={styles.forgotText}>Quên mật khẩu?</Text>
          </Pressable>

          <AuthButton title="Đăng nhập" onPress={handleLogin} loading={isLoading} />
          <GoogleSignInSection mode="login" disabled={isLoading} />

          <View style={styles.footer}>
            <Text style={styles.footerText}>Chưa có tài khoản?</Text>
            <Link href="/(auth)/register" style={styles.link}>Đăng ký ngay</Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  container: { flexGrow: 1, padding: 24, justifyContent: 'center' },
  title: { fontSize: 32, fontWeight: '800', color: colors.text, marginBottom: 8 },
  subtitle: { fontSize: 16, color: colors.textSecondary, marginBottom: 32 },
  forgotButton: { alignSelf: 'flex-end', marginBottom: 16, marginTop: -8 },
  forgotText: { color: colors.primary, fontWeight: '600', fontSize: 14 },
  footer: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 24 },
  footerText: { color: colors.textSecondary },
  link: { color: colors.primary, fontWeight: '700' },
});
