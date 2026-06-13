import { useCallback } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { getGoogleConfigHint, isGoogleConfigured } from '../../config/env';
import { useGoogleSignIn } from '../../hooks/useGoogleSignIn';
import { useAuthStore } from '../../stores/authStore';
import { colors } from '../../constants/colors';
import { AuthDivider } from './AuthDivider';
import { GoogleSignInButton } from './GoogleSignInButton';
import { useLanguage } from '../LanguageProvider';

type Props = { mode?: 'login' | 'register'; disabled?: boolean };

export function GoogleSignInSection({ mode = 'login', disabled = false }: Props) {
  if (!isGoogleConfigured()) {
    return (
      <View>
        <AuthDivider />
        <Text style={styles.hint}>{getGoogleConfigHint()}</Text>
      </View>
    );
  }
  return <GoogleSignInInner mode={mode} disabled={disabled} />;
}

function GoogleSignInInner({ mode, disabled }: { mode: 'login' | 'register'; disabled: boolean }) {
  const completeLogin = useAuthStore((s) => s.completeLogin);
  const { language } = useLanguage();

  const onSuccess = useCallback(
    async (result: Parameters<typeof completeLogin>[0]) => {
      completeLogin(result);
    },
    [completeLogin]
  );

  const onError = useCallback((message: string) => {
    Alert.alert(
      language === 'en' ? 'Google Sign-in failed' : 'Đăng nhập Google thất bại',
      message
    );
  }, [language]);

  const { signInWithGoogle, loading } = useGoogleSignIn({ onSuccess, onError });

  const labelText = mode === 'register'
    ? (language === 'en' ? 'Sign up with Google' : 'Đăng ký bằng Google')
    : (language === 'en' ? 'Sign in with Google' : 'Đăng nhập bằng Google');

  const dividerLabel = language === 'en' ? 'or' : 'hoặc';

  return (
    <View>
      <AuthDivider label={dividerLabel} />
      <GoogleSignInButton
        onPress={signInWithGoogle}
        loading={loading}
        disabled={disabled}
        label={labelText}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  hint: { fontSize: 13, lineHeight: 20, color: colors.textSecondary, textAlign: 'center' },
});
