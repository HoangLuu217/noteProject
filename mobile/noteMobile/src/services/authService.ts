import {
  confirmPasswordReset,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithCredential,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  verifyPasswordResetCode,
} from 'firebase/auth';
import { getAuthInstance } from '../config/firebase';
import { isFirebaseConfigured } from '../config/env';
import { AuthTokens, LoginResponse, OtpRequestResponse, OtpVerifyResponse, User } from '../types/auth';
import { apiRequest } from './apiClient';
import { ApiError } from '../types/api';

const ensureFirebaseAuth = () => {
  if (!isFirebaseConfigured()) {
    throw new Error('Firebase chưa được cấu hình. Thêm EXPO_PUBLIC_FIREBASE_* vào .env');
  }
  return getAuthInstance();
};

const exchangeFirebaseToken = async (idToken: string): Promise<LoginResponse> => {
  return apiRequest<LoginResponse>('/auth/firebase-login', {
    method: 'POST',
    body: { idToken },
  });
};

export const loginWithEmail = async (
  email: string,
  password: string
): Promise<LoginResponse> => {
  const auth = ensureFirebaseAuth();
  const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
  const idToken = await credential.user.getIdToken();
  return exchangeFirebaseToken(idToken);
};

export const sendPasswordReset = async (email: string): Promise<void> => {
  await apiRequest<void>('/auth/forgot-password', {
    method: 'POST',
    body: { email: email.trim() },
  });
};

export const verifyPasswordReset = async (oobCode: string): Promise<string> => {
  const auth = ensureFirebaseAuth();
  return verifyPasswordResetCode(auth, oobCode);
};

export const applyPasswordReset = async (oobCode: string, newPassword: string): Promise<void> => {
  const auth = ensureFirebaseAuth();
  await confirmPasswordReset(auth, oobCode, newPassword);
};

export const registerWithEmail = async (
  email: string,
  password: string,
  fullName: string
): Promise<LoginResponse> => {
  const auth = ensureFirebaseAuth();
  const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
  await updateProfile(credential.user, { displayName: fullName.trim() });
  const idToken = await credential.user.getIdToken(true);
  return exchangeFirebaseToken(idToken);
};

export const requestRegisterOtp = async (
  email: string,
  fullName: string
): Promise<OtpRequestResponse> => {
  return apiRequest<OtpRequestResponse>('/auth/register/request-otp', {
    method: 'POST',
    body: { email: email.trim(), fullName: fullName.trim() },
  });
};

export const resendRegisterOtp = async (email: string): Promise<OtpRequestResponse> => {
  return apiRequest<OtpRequestResponse>('/auth/register/resend-otp', {
    method: 'POST',
    body: { email: email.trim() },
  });
};

export const verifyRegisterOtp = async (
  email: string,
  otp: string
): Promise<OtpVerifyResponse> => {
  return apiRequest<OtpVerifyResponse>('/auth/register/verify-otp', {
    method: 'POST',
    body: { email: email.trim(), otp: otp.trim() },
  });
};

export const completeRegister = async (
  registrationToken: string,
  idToken: string
): Promise<LoginResponse> => {
  return apiRequest<LoginResponse>('/auth/register/complete', {
    method: 'POST',
    body: { registrationToken, idToken },
  });
};

export const registerWithEmailAfterOtp = async (
  email: string,
  password: string,
  fullName: string,
  otp: string
): Promise<LoginResponse> => {
  const { registrationToken } = await verifyRegisterOtp(email, otp);

  const auth = ensureFirebaseAuth();
  const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
  await updateProfile(credential.user, { displayName: fullName.trim() });
  const idToken = await credential.user.getIdToken(true);

  return completeRegister(registrationToken, idToken);
};

export const loginWithGoogleIdToken = async (
  googleIdToken: string
): Promise<LoginResponse> => {
  const auth = ensureFirebaseAuth();
  const credential = GoogleAuthProvider.credential(googleIdToken);
  const result = await signInWithCredential(auth, credential);
  const idToken = await result.user.getIdToken();
  return exchangeFirebaseToken(idToken);
};

export const loginWithGooglePopup = async (): Promise<LoginResponse> => {
  const auth = ensureFirebaseAuth();
  const provider = new GoogleAuthProvider();
  const result = await signInWithPopup(auth, provider);
  const idToken = await result.user.getIdToken();
  return exchangeFirebaseToken(idToken);
};

export const refreshTokens = async (refreshToken: string): Promise<AuthTokens> => {
  return apiRequest<AuthTokens>('/auth/refresh', {
    method: 'POST',
    body: { refreshToken },
  });
};

export const fetchProfile = async (accessToken: string): Promise<User> => {
  const data = await apiRequest<{ user: User }>('/auth/profile', { token: accessToken });
  return data.user;
};

export const updateUserProfile = async (
  accessToken: string,
  payload: { fullName?: string; avatar?: string }
): Promise<User> => {
  const data = await apiRequest<{ user: User }>('/auth/profile', {
    method: 'PUT',
    body: payload,
    token: accessToken,
  });
  return data.user;
};

export const logoutFromServer = async (accessToken: string): Promise<void> => {
  await apiRequest('/auth/logout', { method: 'POST', token: accessToken });
};

export const logoutFromFirebase = async (): Promise<void> => {
  try {
    const auth = getAuthInstance();
    if (auth.currentUser) {
      await signOut(auth);
    }
  } catch {
    // Firebase chưa cấu hình — bỏ qua
  }
};

export const getApiErrorMessage = (error: unknown): string => {
  if (error instanceof ApiError) {
    const message = error.message.toLowerCase();
    if (message.includes('already registered') || error.statusCode === 409) {
      return 'Email đã được sử dụng';
    }
    if (message.includes('invalid otp')) {
      return 'Mã OTP không đúng';
    }
    if (message.includes('expired')) {
      return 'Mã OTP đã hết hạn. Vui lòng gửi lại';
    }
    if (message.includes('wait') || error.statusCode === 429) {
      return error.message;
    }
    return error.message;
  }
  if (error instanceof Error) return error.message;
  return 'Đã xảy ra lỗi. Vui lòng thử lại';
};

export const getFirebaseErrorMessage = (error: unknown): string => {
  if (error instanceof ApiError) {
    return getApiErrorMessage(error);
  }
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const code = String((error as { code: string }).code);
    switch (code) {
      case 'auth/invalid-email':
        return 'Email không hợp lệ';
      case 'auth/user-not-found':
      case 'auth/wrong-password':
      case 'auth/invalid-credential':
        if (error instanceof Error && error.message.toLowerCase().includes('google id_token')) {
          return error.message;
        }
        return 'Email hoặc mật khẩu không đúng';
      case 'auth/email-already-in-use':
        return 'Email đã được sử dụng';
      case 'auth/weak-password':
        return 'Mật khẩu quá yếu (tối thiểu 6 ký tự)';
      case 'auth/popup-closed-by-user':
        return 'Đã hủy đăng nhập Google';
      case 'auth/too-many-requests':
        return 'Quá nhiều yêu cầu. Vui lòng thử lại sau';
      case 'auth/missing-email':
        return 'Vui lòng nhập email';
      case 'auth/expired-action-code':
        return 'Liên kết đặt lại mật khẩu đã hết hạn. Vui lòng gửi lại email';
      case 'auth/invalid-action-code':
        return 'Liên kết đặt lại mật khẩu không hợp lệ. Vui lòng gửi lại email';
      default:
        break;
    }
  }
  if (error instanceof Error) return error.message;
  return 'Đã xảy ra lỗi. Vui lòng thử lại';
};
