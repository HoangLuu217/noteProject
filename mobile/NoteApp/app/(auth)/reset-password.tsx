import * as Linking from 'expo-linking';
import { useLocalSearchParams, useRouter } from 'expo-router';
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
import { AuthButton } from '../../src/components/auth/AuthButton';
import { AuthInput } from '../../src/components/auth/AuthInput';
import { isFirebaseConfigured } from '../../src/config/env';
import { colors } from '../../src/constants/colors';
import {
  applyPasswordReset,
  getFirebaseErrorMessage,
  verifyPasswordReset,
} from '../../src/services/authService';
import { parsePasswordResetLink } from '../../src/utils/authLink';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ oobCode?: string; mode?: string }>();
  const [oobCode, setOobCode] = useState(typeof params.oobCode === 'string' ? params.oobCode : '');
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
      resolveLink(url);
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
        { text: 'Đăng nhập', onPress: () => router.replace('/(auth)/login') },
      ]);
    } catch (error) {
      Alert.alert('Đặt lại thất bại', getFirebaseErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  if (checkingLink) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centered}>
          <Text style={styles.subtitle}>Đang xác thực liên kết...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!oobCode || linkError) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.container}>
          <Text style={styles.title}>Liên kết không hợp lệ</Text>
          <Text style={styles.subtitle}>
            {linkError || 'Không tìm thấy mã đặt lại mật khẩu. Hãy mở liên kết trực tiếp từ email.'}
          </Text>
          <AuthButton title="Gửi lại email" onPress={() => router.replace('/(auth)/forgot-password')} />
          <AuthButton
            title="Về đăng nhập"
            onPress={() => router.replace('/(auth)/login')}
            style={styles.secondaryButton}
          />
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>Đặt lại mật khẩu</Text>
          <Text style={styles.subtitle}>
            Tạo mật khẩu mới cho tài khoản{'\n'}
            <Text style={styles.email}>{email}</Text>
          </Text>

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
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  container: { flexGrow: 1, padding: 24, justifyContent: 'center' },
  title: { fontSize: 32, fontWeight: '800', color: colors.text, marginBottom: 8 },
  subtitle: { fontSize: 16, color: colors.textSecondary, marginBottom: 32, lineHeight: 24 },
  email: { color: colors.text, fontWeight: '700' },
  secondaryButton: { marginTop: 12, backgroundColor: colors.textSecondary },
});
