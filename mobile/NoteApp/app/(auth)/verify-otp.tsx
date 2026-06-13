import { Link, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthButton } from '../../src/components/auth/AuthButton';
import { OtpInput } from '../../src/components/auth/OtpInput';
import { colors } from '../../src/constants/colors';
import { useAuthStore } from '../../src/stores/authStore';

export default function VerifyOtpScreen() {
  const router = useRouter();
  const {
    pendingRegistration,
    completeRegisterWithOtp,
    resendRegisterOtp,
    isLoading,
    setPendingRegistration,
  } = useAuthStore();
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [cooldown, setCooldown] = useState(60);

  useEffect(() => {
    if (!pendingRegistration) {
      router.replace('/(auth)/register');
    }
  }, [pendingRegistration, router]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const handleVerify = async () => {
    if (otp.length !== 6) {
      setError('Vui lòng nhập đủ 6 số OTP');
      return;
    }

    setError('');
    try {
      await completeRegisterWithOtp(otp);
      router.replace('/(app)');
    } catch (err) {
      Alert.alert('Xác thực thất bại', err instanceof Error ? err.message : 'Vui lòng thử lại');
    }
  };

  const handleResend = async () => {
    if (cooldown > 0) return;

    try {
      const waitSeconds = await resendRegisterOtp();
      setCooldown(waitSeconds);
      Alert.alert('Đã gửi lại OTP', 'Kiểm tra email của bạn');
    } catch (err) {
      Alert.alert('Gửi lại thất bại', err instanceof Error ? err.message : 'Vui lòng thử lại');
    }
  };

  const handleBack = () => {
    setPendingRegistration(null);
    router.back();
  };

  if (!pendingRegistration) {
    return null;
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>Xác thực email</Text>
          <Text style={styles.subtitle}>
            Nhập mã OTP 6 số đã gửi đến{'\n'}
            <Text style={styles.email}>{pendingRegistration.email}</Text>
          </Text>

          <OtpInput value={otp} onChange={setOtp} error={error} />

          <AuthButton title="Xác nhận" onPress={handleVerify} loading={isLoading} />

          <TouchableOpacity
            onPress={handleResend}
            disabled={cooldown > 0 || isLoading}
            style={styles.resendButton}
          >
            <Text style={[styles.resendText, cooldown > 0 && styles.resendDisabled]}>
              {cooldown > 0 ? `Gửi lại sau ${cooldown}s` : 'Gửi lại mã OTP'}
            </Text>
          </TouchableOpacity>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Sai email?</Text>
            <Text onPress={handleBack} style={styles.link}>
              Quay lại đăng ký
            </Text>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Đã có tài khoản?</Text>
            <Link href="/(auth)/login" style={styles.link}>
              Đăng nhập
            </Link>
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
  subtitle: { fontSize: 16, color: colors.textSecondary, marginBottom: 32, lineHeight: 24 },
  email: { color: colors.text, fontWeight: '700' },
  resendButton: { alignItems: 'center', marginTop: 16 },
  resendText: { color: colors.primary, fontWeight: '700' },
  resendDisabled: { color: colors.textSecondary },
  footer: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 24 },
  footerText: { color: colors.textSecondary },
  link: { color: colors.primary, fontWeight: '700' },
});
