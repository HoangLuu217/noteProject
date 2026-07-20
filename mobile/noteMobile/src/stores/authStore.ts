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
import { getStreakStatus } from '../services/streakService';
import { LoginResponse, PendingRegistration, User } from '../types/auth';
import { ApiError } from '../types/api';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isHydrated: boolean;
  isLoading: boolean;
  pendingRegistration: PendingRegistration | null;
  streak: number;
  setHydrated: (value: boolean) => void;
  setPendingRegistration: (value: PendingRegistration | null) => void;
  setStreak: (value: number) => void;
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

let refreshPromise: Promise<boolean> | null = null;

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isHydrated: false,
      isLoading: false,
      pendingRegistration: null,
      streak: 0,

      setHydrated: (value) => set({ isHydrated: value }),

      setPendingRegistration: (value) => set({ pendingRegistration: value }),

      setStreak: (value) => set({ streak: value }),

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
        } catch (err) {
          console.error('Server logout failed:', err);
        }
        
        try {
          await logoutFromFirebase();
        } catch (err) {
          console.error('Firebase logout failed:', err);
        }
        
        set({ user: null, accessToken: null, refreshToken: null, pendingRegistration: null, streak: 0 });
      },

      loadProfile: async () => {
        const { accessToken } = get();
        if (!accessToken) return;
        try {
          const user = await fetchProfile(accessToken);
          set({ user });
          // Fetch streak status
          try {
            const streakData = await getStreakStatus(accessToken);
            set({ streak: streakData.currentStreak });
          } catch (e) {
            console.error('Failed to load streak status:', e);
          }
        } catch (error) {
          const err = error as any;
          if (err && err.statusCode === 401) {
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
        if (refreshPromise) {
          return refreshPromise;
        }

        const { refreshToken: stored } = get();
        if (!stored) {
          set({ user: null, accessToken: null, refreshToken: null });
          return false;
        }

        refreshPromise = (async () => {
          try {
            const tokens = await refreshTokens(stored);
            set({ accessToken: tokens.accessToken, refreshToken: tokens.refreshToken });
            return true;
          } catch (err) {
            console.error('Refresh token request failed:', err);
            set({ user: null, accessToken: null, refreshToken: null });
            return false;
          } finally {
            refreshPromise = null;
          }
        })();

        return refreshPromise;
      },
    }),
    {
      name: 'notemobile-auth',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        streak: state.streak,
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
