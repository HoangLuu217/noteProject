import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import {
  fetchProfile,
  getApiErrorMessage,
  getFirebaseErrorMessage,
  loginWithEmail,
  logoutFromFirebase,
  logoutFromServer,
  refreshTokens,
  registerWithEmailAfterOtp,
  requestRegisterOtp as sendRegisterOtp,
  resendRegisterOtp as sendResendRegisterOtp,
  updateUserProfile,
} from '../services/authService';
import { LoginResponse, PendingRegistration, User } from '../types/auth';
import { ApiError } from '../types/api';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isHydrated: boolean;
  isLoading: boolean;
  pendingRegistration: PendingRegistration | null;
  setHydrated: (value: boolean) => void;
  setPendingRegistration: (value: PendingRegistration | null) => void;
  completeLogin: (result: LoginResponse) => void;
  login: (email: string, password: string) => Promise<void>;
  requestRegisterOtp: (email: string, fullName: string, password: string) => Promise<void>;
  resendRegisterOtp: () => Promise<number>;
  completeRegisterWithOtp: (otp: string) => Promise<void>;
  logout: () => Promise<void>;
  loadProfile: () => Promise<void>;
  updateProfile: (payload: { fullName?: string; avatar?: string }) => Promise<void>;
  refreshSession: () => Promise<boolean>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isHydrated: false,
      isLoading: false,
      pendingRegistration: null,

      setHydrated: (value) => set({ isHydrated: value }),

      setPendingRegistration: (value) => set({ pendingRegistration: value }),

      completeLogin: (result) => {
        set({
          user: result.user,
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
          isLoading: false,
        });
      },

      login: async (email, password) => {
        set({ isLoading: true });
        try {
          const result = await loginWithEmail(email, password);
          set({
            user: result.user,
            accessToken: result.accessToken,
            refreshToken: result.refreshToken,
            isLoading: false,
          });
        } catch (error) {
          set({ isLoading: false });
          throw new Error(getFirebaseErrorMessage(error));
        }
      },

      requestRegisterOtp: async (email, fullName, password) => {
        set({ isLoading: true });
        try {
          await sendRegisterOtp(email, fullName);
          set({
            pendingRegistration: {
              email: email.trim(),
              fullName: fullName.trim(),
              password,
            },
            isLoading: false,
          });
        } catch (error) {
          set({ isLoading: false });
          throw new Error(getApiErrorMessage(error));
        }
      },

      resendRegisterOtp: async () => {
        const pending = get().pendingRegistration;
        if (!pending) {
          throw new Error('Không tìm thấy thông tin đăng ký');
        }

        set({ isLoading: true });
        try {
          const result = await sendResendRegisterOtp(pending.email);
          set({ isLoading: false });
          return result.resendAfter;
        } catch (error) {
          set({ isLoading: false });
          throw new Error(getApiErrorMessage(error));
        }
      },

      completeRegisterWithOtp: async (otp) => {
        const pending = get().pendingRegistration;
        if (!pending) {
          throw new Error('Không tìm thấy thông tin đăng ký');
        }

        set({ isLoading: true });
        try {
          const result = await registerWithEmailAfterOtp(
            pending.email,
            pending.password,
            pending.fullName,
            otp
          );
          set({
            user: result.user,
            accessToken: result.accessToken,
            refreshToken: result.refreshToken,
            pendingRegistration: null,
            isLoading: false,
          });
        } catch (error) {
          set({ isLoading: false });
          throw new Error(getFirebaseErrorMessage(error));
        }
      },

      logout: async () => {
        const { accessToken } = get();
        try {
          if (accessToken) await logoutFromServer(accessToken);
        } catch {
          // clear local session even if server logout fails
        }
        await logoutFromFirebase();
        set({ user: null, accessToken: null, refreshToken: null, pendingRegistration: null });
      },

      loadProfile: async () => {
        const { accessToken } = get();
        if (!accessToken) return;
        try {
          const user = await fetchProfile(accessToken);
          set({ user });
        } catch (error) {
          if (error instanceof ApiError && error.statusCode === 401) {
            const refreshed = await get().refreshSession();
            if (refreshed) await get().loadProfile();
          }
        }
      },

      updateProfile: async (payload) => {
        const { accessToken } = get();
        if (!accessToken) throw new Error('Bạn cần đăng nhập');
        set({ isLoading: true });
        try {
          const user = await updateUserProfile(accessToken, payload);
          set({ user, isLoading: false });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      refreshSession: async () => {
        const { refreshToken: stored } = get();
        if (!stored) {
          set({ user: null, accessToken: null, refreshToken: null });
          return false;
        }
        try {
          const tokens = await refreshTokens(stored);
          set({ accessToken: tokens.accessToken, refreshToken: tokens.refreshToken });
          return true;
        } catch {
          set({ user: null, accessToken: null, refreshToken: null });
          return false;
        }
      },
    }),
    {
      name: 'notemobile-auth',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
      }),
      onRehydrateStorage: () => (state, error) => {
        if (!error && state) {
          state.setHydrated(true);
        } else {
          useAuthStore.setState({ isHydrated: true });
        }
      },
    }
  )
);
