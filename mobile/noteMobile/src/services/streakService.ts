import { apiRequest } from './apiClient';

export interface StreakStatus {
  currentStreak: number;
  highestStreak: number;
  lastActiveDate: string | null;
}

export interface CheckInResponse {
  currentStreak: number;
  highestStreak: number;
  message: string;
}

export const getStreakStatus = async (accessToken: string): Promise<StreakStatus> => {
  return await apiRequest<StreakStatus>('/streak/status', {
    method: 'GET',
    token: accessToken,
  });
};

export const checkInStreak = async (accessToken: string, clientDate?: string): Promise<CheckInResponse> => {
  return await apiRequest<CheckInResponse>('/streak/check-in', {
    method: 'POST',
    token: accessToken,
    body: {
      clientDate: clientDate || (() => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      })(),
    },
  });
};
