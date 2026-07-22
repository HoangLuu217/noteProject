import { apiRequest } from './apiClient';
import { Task } from '../types';
import { mapBackendTaskToFrontend } from './taskService';

// Helper to format date as YYYY-MM-DD in Local Time
const formatDateLocal = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const generateTaskFromPrompt = async (
  prompt: string,
  selectedDate: string,
  token: string
): Promise<Task[]> => {
  const today = new Date();
  const todayStr = formatDateLocal(today);

  try {
    console.log('📱 [Mobile] Calling backend /tasks/generate-ai to analyze task with prompt');
    const result = await apiRequest<{ tasks: any[] }>('/tasks/generate-ai', {
      method: 'POST',
      body: {
        prompt,
        selectedDate,
        today: todayStr,
      },
      token,
    });

    const backendTasks = result.tasks || [];
    return backendTasks.map(mapBackendTaskToFrontend);
  } catch (error) {
    console.error('📱 [Mobile] Error generating tasks from backend AI:', error);
    throw error;
  }
};


