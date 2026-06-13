import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import { env } from '../config/env';
import {
  getFirebaseErrorMessage,
  loginWithGoogleIdToken,
  loginWithGooglePopup,
} from '../services/authService';
import { LoginResponse } from '../types/auth';
import {
  getGoogleOAuthRedirectUri,
  getGooglePlatformClientId,
  getGoogleSetupHintForPlatform,
} from '../utils/googleOAuth';

WebBrowser.maybeCompleteAuthSession();

type Options = {
  onSuccess: (result: LoginResponse) => void | Promise<void>;
  onError: (message: string) => void;
};

const parseGoogleError = (message: string) => {
  const lower = message.toLowerCase();

  if (lower.includes('custom uri scheme')) {
    return [
      'Android OAuth Client chưa bật "Custom URI scheme".',
      'Vào Google Cloud Console → Credentials → Android client → bật Custom URI scheme.',
      'Package name phải là: host.exp.exponent (Expo Go).',
      getGoogleSetupHintForPlatform(),
    ].join('\n\n');
  }

  if (lower.includes('400') || lower.includes('invalid')) {
    return [
      'Google OAuth lỗi 400 — cấu hình Client ID hoặc redirect URI chưa đúng.',
      getGoogleSetupHintForPlatform(),
    ].join('\n\n');
  }

  if (lower.includes('not authorized to be used in the project') || lower.includes('invalid-credential')) {
    return [
      'Google Client ID không thuộc Firebase project hiện tại.',
      'OAuth Client phải tạo trong cùng project Firebase (note-f6b47, số 862670529475).',
      'Vào Firebase Console → Authentication → Sign-in method → Google → copy Web client ID.',
      'Tạo iOS/Android OAuth client trong Google Cloud của project đó, rồi cập nhật .env.',
      getGoogleSetupHintForPlatform(),
    ].join('\n\n');
  }

  return message;
};

export function useGoogleSignIn({ onSuccess, onError }: Options) {
  const [loading, setLoading] = useState(false);
  const redirectUri = useMemo(() => getGoogleOAuthRedirectUri(), []);

  const googleConfig = useMemo(() => {
    if (Platform.OS === 'web') {
      return { webClientId: env.google.webClientId, redirectUri };
    }

    if (Platform.OS === 'ios') {
      return {
        iosClientId: env.google.iosClientId,
        webClientId: env.google.webClientId,
        redirectUri,
      };
    }

    return {
      androidClientId: env.google.androidClientId,
      webClientId: env.google.webClientId,
      redirectUri,
    };
  }, [redirectUri]);

  const [request, response, promptAsync] = Google.useIdTokenAuthRequest(googleConfig);

  useEffect(() => {
    if (Platform.OS !== 'web') {
      WebBrowser.warmUpAsync();
      return () => {
        WebBrowser.coolDownAsync();
      };
    }
  }, []);

  useEffect(() => {
    const handleResponse = async () => {
      if (!response) return;

      if (response.type === 'success') {
        const idToken =
          response.authentication?.idToken ??
          (response.params?.id_token as string | undefined);

        if (!idToken) {
          setLoading(false);
          onError('Không nhận được token từ Google. Thử lại sau.');
          return;
        }

        try {
          const result = await loginWithGoogleIdToken(idToken);
          await onSuccess(result);
        } catch (error) {
          onError(parseGoogleError(getFirebaseErrorMessage(error)));
        } finally {
          setLoading(false);
        }
        return;
      }

      if (response.type === 'error') {
        setLoading(false);
        const raw = response.error?.message || 'Đăng nhập Google thất bại';
        onError(parseGoogleError(raw));
        return;
      }

      if (response.type === 'dismiss' || response.type === 'cancel') {
        setLoading(false);
      }
    };

    handleResponse();
  }, [response, onSuccess, onError]);

  const signInWithGoogle = async () => {
    if (Platform.OS !== 'web' && !getGooglePlatformClientId()) {
      onError(getGoogleSetupHintForPlatform() || 'Thiếu Google Client ID');
      return;
    }

    setLoading(true);

    if (Platform.OS === 'web') {
      try {
        const result = await loginWithGooglePopup();
        await onSuccess(result);
      } catch (error) {
        onError(error instanceof Error ? error.message : 'Đăng nhập Google thất bại');
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!request) {
      setLoading(false);
      onError('Google Sign-In chưa sẵn sàng. Khởi động lại app và thử lại.');
      return;
    }

    await promptAsync();
  };

  return { signInWithGoogle, loading, isReady: Platform.OS === 'web' || Boolean(request) };
}
