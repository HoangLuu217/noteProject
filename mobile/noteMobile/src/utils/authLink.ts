import Constants from 'expo-constants';
import { ActionCodeURL } from 'firebase/auth';
import * as Linking from 'expo-linking';
import { Platform } from 'react-native';
import { env } from '../config/env';

export type PasswordResetLink = {
  oobCode: string;
};

const isExpoGo = Constants.appOwnership === 'expo';

const getNativeAppIds = () => {
  if (isExpoGo) {
    return {
      iosBundleId: 'host.exp.Exponent',
      androidPackage: 'host.exp.exponent',
    };
  }

  return {
    iosBundleId: Constants.expoConfig?.ios?.bundleIdentifier ?? 'com.todo.notemobile',
    androidPackage: Constants.expoConfig?.android?.package ?? 'com.todo.notemobile',
  };
};

export const getPasswordResetActionCodeSettings = () => {
  const { iosBundleId, androidPackage } = getNativeAppIds();
  const continueUrl = env.firebase.authDomain
    ? `https://${env.firebase.authDomain}/reset-password`
    : Linking.createURL('/reset-password');

  if (Platform.OS === 'web') {
    return { url: continueUrl, handleCodeInApp: false };
  }

  return {
    url: continueUrl,
    handleCodeInApp: true,
    iOS: { bundleId: iosBundleId },
    android: {
      packageName: androidPackage,
      installApp: true,
      minimumVersion: '1',
    },
  };
};

export const parsePasswordResetLink = (url: string): PasswordResetLink | null => {
  try {
    const action = ActionCodeURL.parseLink(url);
    if (!action || action.operation !== 'PASSWORD_RESET' || !action.code) {
      return null;
    }
    return { oobCode: action.code };
  } catch {
    const parsed = Linking.parse(url);
    const oobCode = parsed.queryParams?.oobCode;
    const mode = parsed.queryParams?.mode;

    if (typeof oobCode === 'string' && mode === 'resetPassword') {
      return { oobCode };
    }

    return null;
  }
};
