import { makeRedirectUri } from 'expo-auth-session';
import { Platform } from 'react-native';
import { env } from '../config/env';

export const toReversedGoogleScheme = (clientId: string) => {
  const prefix = clientId.replace('.apps.googleusercontent.com', '').trim();
  return `com.googleusercontent.apps.${prefix}`;
};

export const getGooglePlatformClientId = () => {
  if (Platform.OS === 'ios') return env.google.iosClientId;
  if (Platform.OS === 'android') return env.google.androidClientId;
  return env.google.webClientId;
};

/** Redirect URI bắt buộc cho Expo Go — không dùng exp:// */
export const getGoogleOAuthRedirectUri = () => {
  if (Platform.OS === 'web') {
    return makeRedirectUri();
  }

  const platformClientId = getGooglePlatformClientId();
  return `${toReversedGoogleScheme(platformClientId)}:/oauthredirect`;
};

export const getGoogleSetupHintForPlatform = () => {
  if (Platform.OS === 'web') return null;

  const clientId = getGooglePlatformClientId();
  const redirectUri = getGoogleOAuthRedirectUri();

  if (Platform.OS === 'android') {
    return [
      'Cấu hình Google Cloud (Android OAuth Client):',
      '1. Package name: host.exp.exponent',
      '2. Bật "Custom URI scheme" (bắt buộc)',
      '3. Thêm SHA-1 fingerprint',
      `4. Client ID trong .env: ${clientId || '(chưa có)'}`,
      `5. Redirect URI: ${redirectUri}`,
    ].join('\n');
  }

  return [
    'Cấu hình Google Cloud (iOS OAuth Client):',
    '1. Bundle ID: host.exp.Exponent',
    `2. Client ID trong .env: ${clientId || '(chưa có)'}`,
    `3. Redirect URI: ${redirectUri}`,
  ].join('\n');
};
