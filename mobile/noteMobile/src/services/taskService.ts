import { apiRequest } from './apiClient';
import { Task } from '../types';

export function mapBackendTaskToFrontend(backendTask: any): Task {
  let date = '';
  let time = '';
  if (backendTask.dueDate) {
    const d = new Date(backendTask.dueDate);
    if (!isNaN(d.getTime())) {
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      date = `${yyyy}-${mm}-${dd}`;

      const hh = String(d.getHours()).padStart(2, '0');
      const min = String(d.getMinutes()).padStart(2, '0');
      time = `${hh}:${min}`;
    }
  }

  return {
    id: backendTask._id,
    title: backendTask.title,
    description: backendTask.description || '',
    content: backendTask.description || '',
    completed: backendTask.status === 'done',
    date,
    time,
    type: backendTask.category || 'Personal',
    theme: 'primary',
    isMainTask: backendTask.isMainTask || false,
    progress: backendTask.progress || 0,
    parentTaskId: backendTask.parentTaskId ? (typeof backendTask.parentTaskId === 'object' ? backendTask.parentTaskId._id : backendTask.parentTaskId) : undefined,
    parentTask: backendTask.parentTaskId && typeof backendTask.parentTaskId === 'object' ? { id: backendTask.parentTaskId._id, title: backendTask.parentTaskId.title } : undefined,
  };
}

function mapFrontendTaskToBackend(frontendTask: Partial<Task>): any {
  const payload: any = {};
  if (frontendTask.title !== undefined) payload.title = frontendTask.title;
  if (frontendTask.content !== undefined || frontendTask.description !== undefined) {
    payload.description = frontendTask.content ?? frontendTask.description;
  }
  if (frontendTask.completed !== undefined) {
    payload.status = frontendTask.completed ? 'done' : 'todo';
  }
  if (frontendTask.type !== undefined) {
    payload.category = frontendTask.type;
  }
  if (frontendTask.isMainTask !== undefined) {
    payload.isMainTask = frontendTask.isMainTask;
  }
  if (frontendTask.progress !== undefined) {
    payload.progress = frontendTask.progress;
  }
  if (frontendTask.parentTaskId !== undefined) {
    payload.parentTaskId = frontendTask.parentTaskId;
  }
  if (frontendTask.planLabel !== undefined) {
    payload.planLabel = frontendTask.planLabel;
  }
  if (frontendTask.date !== undefined || frontendTask.time !== undefined) {
    const dateStr = frontendTask.date || '';
    const timeStr = frontendTask.time || '';
    if (dateStr) {
      const dateParts = dateStr.split('-');
      if (dateParts.length === 3) {
        const year = parseInt(dateParts[0], 10);
        const month = parseInt(dateParts[1], 10) - 1;
        const day = parseInt(dateParts[2], 10);

        let hours = 0;
        let minutes = 0;
        if (timeStr) {
          const match = timeStr.match(/(\d{1,2}):(\d{2})/);
          if (match) {
            hours = parseInt(match[1], 10);
            minutes = parseInt(match[2], 10);
          }
        }

        const d = new Date(year, month, day, hours, minutes, 0, 0);
        payload.dueDate = d.toISOString();
      }
    } else {
      payload.dueDate = null;
    }
  }

  return payload;
}

export const fetchTasksFromServer = async (token: string): Promise<Task[]> => {
  const result = await apiRequest<{ tasks: any[] }>('/tasks?limit=1000', { token });
  return result.tasks.map(mapBackendTaskToFrontend);
};

export const createTaskOnServer = async (token: string, taskData: Partial<Task>): Promise<Task> => {
  const payload = mapFrontendTaskToBackend(taskData);
  const result = await apiRequest<{ task: any }>('/tasks', {
    method: 'POST',
    body: payload,
    token,
  });
  return mapBackendTaskToFrontend(result.task);
};

export const updateTaskOnServer = async (token: string, id: string, taskData: Partial<Task>): Promise<Task> => {
  const payload = mapFrontendTaskToBackend(taskData);
  const result = await apiRequest<{ task: any }>(`/tasks/${id}`, {
    method: 'PUT',
    body: payload,
    token,
  });
  return mapBackendTaskToFrontend(result.task);
};

export const deleteTaskFromServer = async (token: string, id: string): Promise<void> => {
  await apiRequest(`/tasks/${id}`, {
    method: 'DELETE',
    token,
  });
};
