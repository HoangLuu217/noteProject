import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
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
import { AuthInput } from '../../src/components/auth/AuthInput';
import { isFirebaseConfigured } from '../../src/config/env';
import { colors } from '../../src/constants/colors';
import { getFirebaseErrorMessage, sendPasswordReset } from '../../src/services/authService';
import { isValidEmail } from '../../src/utils/validation';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string }>();
  const [email, setEmail] = useState(typeof params.email === 'string' ? params.email : '');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const validate = () => {
    if (!email.trim()) {
      setError('Vui lòng nhập email');
      return false;
    }
    if (!isValidEmail(email)) {
      setError('Email không hợp lệ');
      return false;
    }
    setError('');
    return true;
  };

  const handleSend = async () => {
    if (!isFirebaseConfigured()) {
      Alert.alert('Thiếu cấu hình', 'Thêm EXPO_PUBLIC_FIREBASE_* vào file .env');
      return;
    }
    if (!validate()) return;

    setLoading(true);
    try {
      await sendPasswordReset(email);
      setSent(true);
    } catch (err) {
      Alert.alert('Gửi thất bại', getFirebaseErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.container}>
          <Text style={styles.title}>Kiểm tra email</Text>
          <Text style={styles.subtitle}>
            Chúng tôi đã gửi liên kết đặt lại mật khẩu đến{'\n'}
            <Text style={styles.email}>{email.trim()}</Text>
          </Text>
          <Text style={styles.hint}>
            Mở email và làm theo hướng dẫn để đặt mật khẩu mới. Nếu không thấy email, kiểm tra thư mục spam.
          </Text>
          <AuthButton title="Quay lại đăng nhập" onPress={() => router.replace('/(auth)/login')} />

          <TouchableOpacity onPress={() => setSent(false)} style={styles.resendButton}>
            <Text style={styles.link}>Không nhận được? Gửi lại</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.link}>← Quay lại</Text>
          </TouchableOpacity>

          <Text style={styles.title}>Quên mật khẩu</Text>
          <Text style={styles.subtitle}>
            Nhập email đã đăng ký. Chúng tôi sẽ gửi liên kết để bạn đặt lại mật khẩu.
          </Text>

          <AuthInput
            label="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            placeholder="name@example.com"
            error={error}
          />

          <AuthButton title="Gửi liên kết đặt lại" onPress={handleSend} loading={loading} />

          <View style={styles.footer}>
            <Text style={styles.footerText}>Nhớ mật khẩu rồi?</Text>
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
  backButton: { marginBottom: 16, alignSelf: 'flex-start' },
  title: { fontSize: 32, fontWeight: '800', color: colors.text, marginBottom: 8 },
  subtitle: { fontSize: 16, color: colors.textSecondary, marginBottom: 24, lineHeight: 24 },
  email: { color: colors.text, fontWeight: '700' },
  hint: { fontSize: 15, color: colors.textSecondary, marginBottom: 16, lineHeight: 22 },
  note: { fontSize: 14, color: colors.textSecondary, marginBottom: 32, lineHeight: 20 },
  resendButton: { alignItems: 'center', marginTop: 16 },
  footer: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 24 },
  footerText: { color: colors.textSecondary },
  link: { color: colors.primary, fontWeight: '700' },
});
