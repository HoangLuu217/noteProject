export interface User {
  _id: string;
  email: string;
  fullName: string;
  avatar: string;
  firebaseUid?: string;
  authProvider?: 'google' | 'password';
  isEmailVerified?: boolean;
  lastLoginAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface OtpRequestResponse {
  email: string;
  expiresIn: number;
  resendAfter: number;
}

export interface OtpVerifyResponse {
  email: string;
  fullName: string;
  registrationToken: string;
}

export interface PendingRegistration {
  email: string;
  fullName: string;
  password: string;
}
