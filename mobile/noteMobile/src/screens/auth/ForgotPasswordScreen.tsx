import { useState } from 'react';
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
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuthButton } from '../../components/auth/AuthButton';
import { AuthInput } from '../../components/auth/AuthInput';
import { BackgroundBubbles } from '../../components/BackgroundBubbles';
import { isFirebaseConfigured } from '../../config/env';
import { getFirebaseErrorMessage, sendPasswordReset } from '../../services/authService';
import { isValidEmail } from '../../utils/validation';
import { useTheme } from '../../components/ThemeProvider';
import { useLanguage } from '../../components/LanguageProvider';

interface ForgotPasswordScreenProps {
  onNavigate: (screen: 'login' | 'register' | 'forgot-password' | 'verify-otp' | 'reset-password', params?: any) => void;
  routeParams?: { email?: string };
}

export function ForgotPasswordScreen({ onNavigate, routeParams }: ForgotPasswordScreenProps) {
  const { colors } = useTheme();
  const { language } = useLanguage();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState(routeParams?.email ?? '');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const validate = () => {
    if (!email.trim()) {
      setError(language === 'en' ? 'Please enter email' : 'Vui lòng nhập email');
      return false;
    }
    if (!isValidEmail(email)) {
      setError(language === 'en' ? 'Invalid email' : 'Email không hợp lệ');
      return false;
    }
    setError('');
    return true;
  };

  const handleSend = async () => {
    if (!isFirebaseConfigured()) {
      Alert.alert(
        language === 'en' ? 'Missing Configuration' : 'Thiếu cấu hình',
        language === 'en' ? 'Add EXPO_PUBLIC_FIREBASE_* to the .env file' : 'Thêm EXPO_PUBLIC_FIREBASE_* vào file .env'
      );
      return;
    }
    if (!validate()) return;

    setLoading(true);
    try {
      await sendPasswordReset(email);
      setSent(true);
    } catch (err) {
      Alert.alert(
        language === 'en' ? 'Send Failed' : 'Gửi thất bại',
        getFirebaseErrorMessage(err)
      );
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
        <BackgroundBubbles />
        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
          <Text style={[styles.title, { color: colors.onSurface }]}>
            {language === 'en' ? 'Check your email' : 'Kiểm tra email'}
          </Text>
          <Text style={[styles.subtitle, { color: colors.outline }]}>
            {language === 'en' ? 'We have sent a password reset link to' : 'Chúng tôi đã gửi liên kết đặt lại mật khẩu đến'}{'\n'}
            <Text style={[styles.email, { color: colors.onSurface }]}>{email.trim()}</Text>
          </Text>
          
          <View style={[styles.card, { backgroundColor: colors.surfaceContainerLowest, borderColor: 'rgba(0, 0, 0, 0.05)' }]}>
            <Text style={[styles.hint, { color: colors.onSurfaceVariant }]}>
              {language === 'en' 
                ? 'Open the email and follow the instructions to set a new password. If you do not see it, check your spam folder.'
                : 'Mở email và làm theo hướng dẫn để đặt mật khẩu mới. Nếu không thấy email, kiểm tra thư mục spam.'}
            </Text>
            <AuthButton 
              title={language === 'en' ? 'Back to login' : 'Quay lại đăng nhập'} 
              onPress={() => onNavigate('login')} 
            />

            <TouchableOpacity onPress={() => setSent(false)} style={styles.resendButton}>
              <Text style={[styles.link, { color: colors.primary }]}>
                {language === 'en' ? 'Did not receive it? Resend' : 'Không nhận được? Gửi lại'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <BackgroundBubbles />
      <TouchableOpacity
        style={[
          styles.absoluteBackBtn,
          {
            top: insets.top > 0 ? insets.top + 8 : 16,
          }
        ]}
        onPress={() => onNavigate('login')}
      >
        <Text style={[styles.link, { color: colors.primary }]}>
          {language === 'en' ? '← Back' : '← Quay lại'}
        </Text>
      </TouchableOpacity>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Text style={[styles.title, { color: colors.onSurface }]}>
            {language === 'en' ? 'Forgot Password' : 'Quên mật khẩu'}
          </Text>
          <Text style={[styles.subtitle, { color: colors.outline }]}>
            {language === 'en'
              ? 'Enter your registered email. We will send a link to reset your password.'
              : 'Nhập email đã đăng ký. Chúng tôi sẽ gửi liên kết để bạn đặt lại mật khẩu.'}
          </Text>

          <View style={[styles.card, { backgroundColor: colors.surfaceContainerLowest, borderColor: 'rgba(0, 0, 0, 0.05)' }]}>
            <AuthInput
              label="Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholder="name@example.com"
              error={error}
            />

            <AuthButton 
              title={language === 'en' ? 'Send reset link' : 'Gửi liên kết đặt lại'} 
              onPress={handleSend} 
              loading={loading} 
            />

            <View style={styles.footer}>
              <Text style={[styles.footerText, { color: colors.outline }]}>
                {language === 'en' ? 'Remembered password?' : 'Nhớ mật khẩu rồi?'}
              </Text>
              <Pressable onPress={() => onNavigate('login')}>
                <Text style={[styles.link, { color: colors.primary }]}>
                  {language === 'en' ? 'Login' : 'Đăng nhập'}
                </Text>
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
  hint: { fontSize: 15, fontFamily: 'Quicksand-Medium', marginBottom: 24, lineHeight: 22, textAlign: 'center' },
  resendButton: { alignItems: 'center', marginTop: 20 },
  footer: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 24 },
  footerText: { fontFamily: 'Quicksand-Medium' },
  link: { fontFamily: 'Quicksand-Bold' },
  absoluteBackBtn: {
    position: 'absolute',
    left: 20,
    zIndex: 9999,
    padding: 8,
  },
});
