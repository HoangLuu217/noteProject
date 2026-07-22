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
  isMainTask?: boolean;
  progress?: number;
  parentTaskId?: string;
  parentTask?: { id: string; title: string };
  planLabel?: string;
}

export interface ExpenseItem {
  itemName: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface Expense {
  id: string;
  userId?: string;
  title: string;
  category: string;
  expenseDate: string; // ISO Date string
  note?: string;
  totalAmount: number;
  items: ExpenseItem[];
  createdAt?: string;
  updatedAt?: string;
}
