import * as Linking from 'expo-linking';
import { useEffect, useState } from 'react';
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
import { AuthButton } from '../../components/auth/AuthButton';
import { AuthInput } from '../../components/auth/AuthInput';
import { BackgroundBubbles } from '../../components/BackgroundBubbles';
import { isFirebaseConfigured } from '../../config/env';
import {
  applyPasswordReset,
  getFirebaseErrorMessage,
  verifyPasswordReset,
} from '../../services/authService';
import { parsePasswordResetLink } from '../../utils/authLink';
import { useTheme } from '../../components/ThemeProvider';

interface ResetPasswordScreenProps {
  onNavigate: (screen: 'login' | 'register' | 'forgot-password' | 'verify-otp' | 'reset-password', params?: any) => void;
  routeParams?: { oobCode?: string };
}

export function ResetPasswordScreen({ onNavigate, routeParams }: ResetPasswordScreenProps) {
  const { colors } = useTheme();
  const [oobCode, setOobCode] = useState(routeParams?.oobCode ?? '');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [checkingLink, setCheckingLink] = useState(true);
  const [linkError, setLinkError] = useState('');

  useEffect(() => {
    const resolveLink = async (url: string) => {
      const parsed = parsePasswordResetLink(url);
      if (!parsed?.oobCode) return;
      setOobCode(parsed.oobCode);
    };

    const bootstrap = async () => {
      if (!isFirebaseConfigured()) {
        setLinkError('Firebase chưa được cấu hình');
        setCheckingLink(false);
        return;
      }

      const initialUrl = await Linking.getInitialURL();
      if (initialUrl) {
        await resolveLink(initialUrl);
      }

      setCheckingLink(false);
    };

    bootstrap();

    const subscription = Linking.addEventListener('url', ({ url }) => {
      if (url) resolveLink(url);
    });

    return () => subscription.remove();
  }, []);

  useEffect(() => {
    const validateCode = async () => {
      if (!oobCode || !isFirebaseConfigured()) return;

      setCheckingLink(true);
      setLinkError('');
      try {
        const accountEmail = await verifyPasswordReset(oobCode);
        setEmail(accountEmail);
      } catch (error) {
        setLinkError(getFirebaseErrorMessage(error));
      } finally {
        setCheckingLink(false);
      }
    };

    validateCode();
  }, [oobCode]);

  const validate = () => {
    const next: Record<string, string> = {};
    if (!password) next.password = 'Vui lòng nhập mật khẩu mới';
    else if (password.length < 6) next.password = 'Mật khẩu tối thiểu 6 ký tự';
    if (password !== confirmPassword) next.confirmPassword = 'Mật khẩu xác nhận không khớp';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleReset = async () => {
    if (!oobCode) {
      Alert.alert('Liên kết không hợp lệ', 'Vui lòng mở lại liên kết từ email hoặc gửi email mới.');
      return;
    }
    if (!validate()) return;

    setLoading(true);
    try {
      await applyPasswordReset(oobCode, password);
      Alert.alert('Thành công', 'Mật khẩu đã được đặt lại. Bạn có thể đăng nhập ngay.', [
        { text: 'Đăng nhập', onPress: () => onNavigate('login') },
      ]);
    } catch (error) {
      Alert.alert('Đặt lại thất bại', getFirebaseErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  if (checkingLink) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
        <BackgroundBubbles />
        <View style={styles.centered}>
          <Text style={[styles.subtitle, { color: colors.outline }]}>Đang xác thực liên kết...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!oobCode || linkError) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
        <BackgroundBubbles />
        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
          <Text style={[styles.title, { color: colors.onSurface }]}>Liên kết không hợp lệ</Text>
          <Text style={[styles.subtitle, { color: colors.outline }]}>
            {linkError || 'Không tìm thấy mã đặt lại mật khẩu. Hãy mở liên kết trực tiếp từ email.'}
          </Text>

          <View style={[styles.card, { backgroundColor: colors.surfaceContainerLowest, borderColor: 'rgba(0, 0, 0, 0.05)' }]}>
            <AuthButton title="Gửi lại email" onPress={() => onNavigate('forgot-password')} />
            <AuthButton
              title="Về đăng nhập"
              onPress={() => onNavigate('login')}
              variant="danger"
              style={styles.secondaryButton}
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <BackgroundBubbles />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Text style={[styles.title, { color: colors.onSurface }]}>Đặt lại mật khẩu</Text>
          <Text style={[styles.subtitle, { color: colors.outline }]}>
            Tạo mật khẩu mới cho tài khoản{'\n'}
            <Text style={[styles.email, { color: colors.onSurface }]}>{email}</Text>
          </Text>

          <View style={[styles.card, { backgroundColor: colors.surfaceContainerLowest, borderColor: 'rgba(0, 0, 0, 0.05)' }]}>
            <AuthInput
              label="Mật khẩu mới"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder="Tối thiểu 6 ký tự"
              error={errors.password}
            />
            <AuthInput
              label="Xác nhận mật khẩu"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              placeholder="Nhập lại mật khẩu"
              error={errors.confirmPassword}
            />

            <AuthButton title="Đặt lại mật khẩu" onPress={handleReset} loading={loading} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
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
  secondaryButton: { marginTop: 16 },
});
