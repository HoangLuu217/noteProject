export interface Task {
  id: string;
  title: string;
  description?: string;
  content?: string;
  time?: string;
  date?: string;
  type?: string;
  completed: boolean;
  theme: 'primary' | 'secondary' | 'neutral';
  notificationId?: string;
}
