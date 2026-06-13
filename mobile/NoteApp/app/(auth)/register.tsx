import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
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

export default function RegisterScreen() {
  const router = useRouter();
  const { requestRegisterOtp, isLoading } = useAuthStore();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const next: Record<string, string> = {};
    if (!fullName.trim()) next.fullName = 'Vui lòng nhập họ tên';
    if (!email.trim()) next.email = 'Vui lòng nhập email';
    if (!password) next.password = 'Vui lòng nhập mật khẩu';
    else if (password.length < 6) next.password = 'Mật khẩu tối thiểu 6 ký tự';
    if (password !== confirmPassword) next.confirmPassword = 'Mật khẩu xác nhận không khớp';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleRegister = async () => {
    if (!isFirebaseConfigured()) {
      Alert.alert('Thiếu cấu hình', 'Thêm EXPO_PUBLIC_FIREBASE_* vào file .env');
      return;
    }
    if (!validate()) return;

    try {
      await requestRegisterOtp(email, fullName, password);
      router.push('/(auth)/verify-otp');
    } catch (error) {
      Alert.alert('Đăng ký thất bại', error instanceof Error ? error.message : 'Vui lòng thử lại');
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>Tạo tài khoản</Text>
          <Text style={styles.subtitle}>Bắt đầu quản lý ghi chú thông minh</Text>

          <AuthInput label="Họ và tên" value={fullName} onChangeText={setFullName} placeholder="Nguyễn Văn A" error={errors.fullName} />
          <AuthInput label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" placeholder="name@example.com" error={errors.email} />
          <AuthInput label="Mật khẩu" value={password} onChangeText={setPassword} secureTextEntry placeholder="Tối thiểu 6 ký tự" error={errors.password} />
          <AuthInput label="Xác nhận mật khẩu" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry placeholder="Nhập lại mật khẩu" error={errors.confirmPassword} />

          <AuthButton title="Tiếp tục" onPress={handleRegister} loading={isLoading} />
          <GoogleSignInSection mode="register" disabled={isLoading} />

          <View style={styles.footer}>
            <Text style={styles.footerText}>Đã có tài khoản?</Text>
            <Link href="/(auth)/login" style={styles.link}>Đăng nhập</Link>
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
  footer: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 24 },
  footerText: { color: colors.textSecondary },
  link: { color: colors.primary, fontWeight: '700' },
});
