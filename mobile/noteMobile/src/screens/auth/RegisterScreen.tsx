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

interface RegisterScreenProps {
  onNavigate: (screen: 'login' | 'register' | 'forgot-password' | 'verify-otp' | 'reset-password', params?: any) => void;
}

export function RegisterScreen({ onNavigate }: RegisterScreenProps) {
  const { colors } = useTheme();
  const { language } = useLanguage();
  const { requestRegisterOtp, isLoading } = useAuthStore();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const next: Record<string, string> = {};
    if (!fullName.trim()) {
      next.fullName = language === 'en' ? 'Please enter full name' : 'Vui lòng nhập họ tên';
    }
    if (!email.trim()) {
      next.email = language === 'en' ? 'Please enter email' : 'Vui lòng nhập email';
    }
    if (!password) {
      next.password = language === 'en' ? 'Please enter password' : 'Vui lòng nhập mật khẩu';
    } else if (password.length < 6) {
      next.password = language === 'en' ? 'Password must be at least 6 characters' : 'Mật khẩu tối thiểu 6 ký tự';
    }
    if (password !== confirmPassword) {
      next.confirmPassword = language === 'en' ? 'Confirm password does not match' : 'Mật khẩu xác nhận không khớp';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleRegister = async () => {
    if (!isFirebaseConfigured()) {
      Alert.alert(
        language === 'en' ? 'Missing Configuration' : 'Thiếu cấu hình',
        language === 'en' ? 'Add EXPO_PUBLIC_FIREBASE_* to the .env file' : 'Thêm EXPO_PUBLIC_FIREBASE_* vào file .env'
      );
      return;
    }
    if (!validate()) return;

    try {
      await requestRegisterOtp(email, fullName, password);
      onNavigate('verify-otp');
    } catch (error) {
      Alert.alert(
        language === 'en' ? 'Registration Failed' : 'Đăng ký thất bại',
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
            {language === 'en' ? 'Create Account' : 'Tạo tài khoản'}
          </Text>
          <Text style={[styles.subtitle, { color: colors.outline }]}>
            {language === 'en' ? 'Start managing tasks smartly' : 'Bắt đầu quản lý ghi chú thông minh'}
          </Text>

          <View style={[styles.card, { backgroundColor: colors.surfaceContainerLowest, borderColor: 'rgba(0, 0, 0, 0.05)' }]}>
            <AuthInput
              label={language === 'en' ? 'Full name' : 'Họ và tên'}
              value={fullName}
              onChangeText={setFullName}
              placeholder={language === 'en' ? 'John Doe' : 'Nguyễn Văn A'}
              error={errors.fullName}
            />
            <AuthInput label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" placeholder="name@example.com" error={errors.email} />
            <AuthInput
              label={language === 'en' ? 'Password' : 'Mật khẩu'}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder={language === 'en' ? 'At least 6 characters' : 'Tối thiểu 6 ký tự'}
              error={errors.password}
            />
            <AuthInput
              label={language === 'en' ? 'Confirm password' : 'Xác nhận mật khẩu'}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              placeholder={language === 'en' ? 'Re-enter password' : 'Nhập lại mật khẩu'}
              error={errors.confirmPassword}
            />

            <AuthButton title={language === 'en' ? 'Continue' : 'Tiếp tục'} onPress={handleRegister} loading={isLoading} />
            <GoogleSignInSection mode="register" disabled={isLoading} />

            <View style={styles.footer}>
              <Text style={[styles.footerText, { color: colors.outline }]}>
                {language === 'en' ? 'Already have an account?' : 'Đã có tài khoản?'}
              </Text>
              <Pressable onPress={() => onNavigate('login')}>
                <Text style={[styles.link, { color: colors.primary }]}>
                  {language === 'en' ? 'Log In' : 'Đăng nhập'}
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
  footer: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 24 },
  footerText: { fontFamily: 'Quicksand-Medium' },
  link: { fontFamily: 'Quicksand-Bold' },
});
