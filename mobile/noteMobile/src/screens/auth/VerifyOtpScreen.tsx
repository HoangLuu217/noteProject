import { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthButton } from '../../components/auth/AuthButton';
import { OtpInput } from '../../components/auth/OtpInput';
import { BackgroundBubbles } from '../../components/BackgroundBubbles';
import { useAuthStore } from '../../stores/authStore';
import { useTheme } from '../../components/ThemeProvider';

interface VerifyOtpScreenProps {
  onNavigate: (screen: 'login' | 'register' | 'forgot-password' | 'verify-otp' | 'reset-password', params?: any) => void;
}

export function VerifyOtpScreen({ onNavigate }: VerifyOtpScreenProps) {
  const { colors } = useTheme();
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
      onNavigate('register');
    }
  }, [pendingRegistration]);

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
    onNavigate('register');
  };

  if (!pendingRegistration) {
    return null;
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <BackgroundBubbles />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Text style={[styles.title, { color: colors.onSurface }]}>Xác thực email</Text>
          <Text style={[styles.subtitle, { color: colors.outline }]}>
            Nhập mã OTP 6 số đã gửi đến{'\n'}
            <Text style={[styles.email, { color: colors.onSurface }]}>{pendingRegistration.email}</Text>
          </Text>

          <View style={[styles.card, { backgroundColor: colors.surfaceContainerLowest, borderColor: 'rgba(0, 0, 0, 0.05)' }]}>
            <OtpInput value={otp} onChange={setOtp} error={error} />

            <AuthButton title="Xác nhận" onPress={handleVerify} loading={isLoading} />

            <TouchableOpacity
              onPress={handleResend}
              disabled={cooldown > 0 || isLoading}
              style={styles.resendButton}
            >
              <Text style={[styles.resendText, { color: cooldown > 0 ? colors.outline : colors.primary }]}>
                {cooldown > 0 ? `Gửi lại sau ${cooldown}s` : 'Gửi lại mã OTP'}
              </Text>
            </TouchableOpacity>

            <View style={styles.footer}>
              <Text style={[styles.footerText, { color: colors.outline }]}>Sai email?</Text>
              <TouchableOpacity onPress={handleBack}>
                <Text style={[styles.link, { color: colors.primary }]}>Quay lại đăng ký</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.footer}>
              <Text style={[styles.footerText, { color: colors.outline }]}>Đã có tài khoản?</Text>
              <Pressable onPress={() => onNavigate('login')}>
                <Text style={[styles.link, { color: colors.primary }]}>Đăng nhập</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  container: { flexGrow: 1, padding: 24, justifyContent: 'center' },
  title: { fontSize: 32, fontFamily: 'Quicksand-Bold', textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 16, fontFamily: 'Quicksand-Medium', textAlign: 'center', marginBottom: 32, lineHeight: 24 },
  card: {
    borderRadius: 36,
    padding: 24,
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  email: { fontFamily: 'Quicksand-Bold' },
  resendButton: { alignItems: 'center', marginTop: 20 },
  resendText: { fontFamily: 'Quicksand-Bold', fontSize: 15 },
  footer: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 20 },
  footerText: { fontFamily: 'Quicksand-Medium' },
  link: { fontFamily: 'Quicksand-Bold' },
});
