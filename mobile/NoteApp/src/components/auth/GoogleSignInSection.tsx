import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { getGoogleConfigHint, isGoogleConfigured } from '../../config/env';
import { useGoogleSignIn } from '../../hooks/useGoogleSignIn';
import { useAuthStore } from '../../stores/authStore';
import { colors } from '../../constants/colors';
import { AuthDivider } from './AuthDivider';
import { GoogleSignInButton } from './GoogleSignInButton';

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
  const router = useRouter();
  const completeLogin = useAuthStore((s) => s.completeLogin);

  const onSuccess = useCallback(
    async (result: Parameters<typeof completeLogin>[0]) => {
      completeLogin(result);
      router.replace('/(app)');
    },
    [completeLogin, router]
  );

  const onError = useCallback((message: string) => {
    Alert.alert('Đăng nhập Google thất bại', message);
  }, []);

  const { signInWithGoogle, loading } = useGoogleSignIn({ onSuccess, onError });

  return (
    <View>
      <AuthDivider />
      <GoogleSignInButton
        onPress={signInWithGoogle}
        loading={loading}
        disabled={disabled}
        label={mode === 'register' ? 'Đăng ký bằng Google' : 'Đăng nhập bằng Google'}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  hint: { fontSize: 13, lineHeight: 20, color: colors.textSecondary, textAlign: 'center' },
});
