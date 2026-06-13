import { Platform } from 'react-native';

const getDefaultApiUrl = () => {
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:5000/api';
  }
  return 'http://localhost:5000/api';
};

const trim = (value: string | undefined) => (value ?? '').trim();

export const env = {
  apiUrl: trim(process.env.EXPO_PUBLIC_API_URL) || getDefaultApiUrl(),
  firebase: {
    apiKey: trim(process.env.EXPO_PUBLIC_FIREBASE_API_KEY),
    authDomain: trim(process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN),
    projectId: trim(process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID),
    storageBucket: trim(process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET),
    messagingSenderId: trim(process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID),
    appId: trim(process.env.EXPO_PUBLIC_FIREBASE_APP_ID),
  },
  google: {
    webClientId: trim(process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID),
    iosClientId: trim(process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID),
    androidClientId: trim(process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID),
  },
};

export const isFirebaseConfigured = () =>
  Boolean(
    env.firebase.apiKey &&
      env.firebase.authDomain &&
      env.firebase.projectId &&
      env.firebase.appId
  );

const isOAuthClientId = (value: string) =>
  value.trim().endsWith('.apps.googleusercontent.com');

export const getGoogleConfigHint = () => {
  if (!env.google.webClientId) {
    return 'Thêm EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID vào file .env';
  }

  if (!isOAuthClientId(env.google.webClientId)) {
    return 'EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID phải kết thúc bằng .apps.googleusercontent.com';
  }

  if (Platform.OS === 'ios') {
    if (!env.google.iosClientId) {
      return 'Expo Go (iOS): tạo OAuth Client iOS (Bundle ID: host.exp.Exponent), thêm EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID';
    }
    if (!isOAuthClientId(env.google.iosClientId)) {
      return 'EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID sai định dạng (phải là xxx.apps.googleusercontent.com)';
    }
  }

  if (Platform.OS === 'android') {
    if (!env.google.androidClientId) {
      return 'Expo Go (Android): tạo OAuth Client Android, Package host.exp.exponent, bật Custom URI scheme, thêm EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID';
    }
    if (!isOAuthClientId(env.google.androidClientId)) {
      return 'EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID sai định dạng';
    }
  }

  return null;
};

export const isGoogleConfigured = () => getGoogleConfigHint() === null;
