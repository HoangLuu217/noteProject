import { useState } from 'react';
import {
  Alert,
  Image,
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
import { AuthInput } from '../../components/auth/AuthInput';
import { GoogleSignInSection } from '../../components/auth/GoogleSignInSection';
import { BackgroundBubbles } from '../../components/BackgroundBubbles';
import { isFirebaseConfigured } from '../../config/env';
import { useAuthStore } from '../../stores/authStore';
import { useTheme } from '../../components/ThemeProvider';
import { useLanguage } from '../../components/LanguageProvider';

interface LoginScreenProps {
  onNavigate: (screen: 'login' | 'register' | 'forgot-password' | 'verify-otp' | 'reset-password', params?: any) => void;
}

export function LoginScreen({ onNavigate }: LoginScreenProps) {
  const { colors } = useTheme();
  const { language } = useLanguage();
  const { login, isLoading } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const validate = () => {
    const next: typeof errors = {};
    if (!email.trim()) {
      next.email = language === 'en' ? 'Please enter email' : 'Vui lòng nhập email';
    }
    if (!password) {
      next.password = language === 'en' ? 'Please enter password' : 'Vui lòng nhập mật khẩu';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleLogin = async () => {
    if (!isFirebaseConfigured()) {
      Alert.alert(
        language === 'en' ? 'Missing Configuration' : 'Thiếu cấu hình',
        language === 'en' ? 'Add EXPO_PUBLIC_FIREBASE_* to the .env file' : 'Thêm EXPO_PUBLIC_FIREBASE_* vào file .env'
      );
      return;
    }
    if (!validate()) return;

    try {
      await login(email, password);
    } catch (error) {
      Alert.alert(
        language === 'en' ? 'Login Failed' : 'Đăng nhập thất bại',
        error instanceof Error ? error.message : (language === 'en' ? 'Please try again' : 'Vui lòng thử lại')
      );
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <BackgroundBubbles />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Image
            source={require('../../../assets/icon.png')}
            style={styles.logo}
          />
          
          <Text style={[styles.title, { color: colors.onSurface }]}>
            {language === 'en' ? 'Welcome Back' : 'Chào mừng trở lại'}
          </Text>
          <Text style={[styles.subtitle, { color: colors.outline }]}>
            {language === 'en' ? 'Login to continue managing notes' : 'Đăng nhập để tiếp tục quản lý ghi chú'}
          </Text>

          <View style={[styles.card, { backgroundColor: colors.surfaceContainerLowest, borderColor: 'rgba(0, 0, 0, 0.05)' }]}>
            <AuthInput label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" placeholder="name@example.com" error={errors.email} />
            <AuthInput
              label={language === 'en' ? 'Password' : 'Mật khẩu'}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder="••••••••"
              error={errors.password}
            />

            <Pressable
              onPress={() =>
                onNavigate('forgot-password', email.trim() ? { email: email.trim() } : undefined)
              }
              style={styles.forgotButton}
            >
              <Text style={[styles.forgotText, { color: colors.primary }]}>
                {language === 'en' ? 'Forgot password?' : 'Quên mật khẩu?'}
              </Text>
            </Pressable>

            <AuthButton title={language === 'en' ? 'Log In' : 'Đăng nhập'} onPress={handleLogin} loading={isLoading} />
            <GoogleSignInSection mode="login" disabled={isLoading} />

            <View style={styles.footer}>
              <Text style={[styles.footerText, { color: colors.outline }]}>
                {language === 'en' ? "Don't have an account?" : 'Chưa có tài khoản?'}
              </Text>
              <Pressable onPress={() => onNavigate('register')}>
                <Text style={[styles.link, { color: colors.primary }]}>
                  {language === 'en' ? 'Sign up now' : 'Đăng ký ngay'}
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
  logo: {
    width: 96,
    height: 96,
    borderRadius: 24,
    alignSelf: 'center',
    marginBottom: 20,
    borderWidth: 2,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  title: { fontSize: 32, fontFamily: 'Quicksand-Bold', textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 16, fontFamily: 'Quicksand-Medium', textAlign: 'center', marginBottom: 32 },
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
  forgotButton: { alignSelf: 'flex-end', marginBottom: 20, marginTop: -4 },
  forgotText: { fontFamily: 'Quicksand-Bold', fontSize: 14 },
  footer: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 24 },
  footerText: { fontFamily: 'Quicksand-Medium' },
  link: { fontFamily: 'Quicksand-Bold' },
});
