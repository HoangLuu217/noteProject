import AsyncStorage from '@react-native-async-storage/async-storage';
import { FirebaseApp, getApp, getApps, initializeApp } from 'firebase/app';
import { Auth, getAuth, initializeAuth, type Persistence } from 'firebase/auth';
import { Platform } from 'react-native';
import { env, isFirebaseConfigured } from './env';

let app: FirebaseApp | null = null;
let auth: Auth | null = null;

const getFirebaseApp = () => {
  if (app) return app;
  if (!isFirebaseConfigured()) return null;

  if (getApps().length > 0) {
    app = getApp();
    return app;
  }

  app = initializeApp({
    apiKey: env.firebase.apiKey,
    authDomain: env.firebase.authDomain,
    projectId: env.firebase.projectId,
    storageBucket: env.firebase.storageBucket,
    messagingSenderId: env.firebase.messagingSenderId,
    appId: env.firebase.appId,
  });

  return app;
};

export const getAuthInstance = (): Auth => {
  if (auth) return auth;

  const firebaseApp = getFirebaseApp();
  if (!firebaseApp) {
    throw new Error('Firebase chưa được cấu hình. Kiểm tra EXPO_PUBLIC_FIREBASE_* trong .env');
  }

  if (Platform.OS === 'web') {
    auth = getAuth(firebaseApp);
    return auth;
  }

  try {
    const { getReactNativePersistence } = require('firebase/auth') as {
      getReactNativePersistence: (storage: typeof AsyncStorage) => Persistence;
    };
    auth = initializeAuth(firebaseApp, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch {
    auth = getAuth(firebaseApp);
  }

  return auth;
};
