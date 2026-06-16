import { apiRequest } from './apiClient';
import { Expense } from '../types';

function mapBackendExpenseToFrontend(backendExpense: any): Expense {
  let dateStr = '';
  if (backendExpense.expenseDate) {
    const d = new Date(backendExpense.expenseDate);
    if (!isNaN(d.getTime())) {
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      dateStr = `${yyyy}-${mm}-${dd}`;
    }
  }
  return {
    id: backendExpense._id,
    userId: backendExpense.userId,
    title: backendExpense.title,
    category: backendExpense.category,
    expenseDate: dateStr,
    note: backendExpense.note || '',
    totalAmount: backendExpense.totalAmount || 0,
    items: backendExpense.items || [],
    createdAt: backendExpense.createdAt,
    updatedAt: backendExpense.updatedAt,
  };
}

function mapFrontendExpenseToBackend(frontendExpense: Partial<Expense>): any {
  const payload: any = {};
  if (frontendExpense.title !== undefined) payload.title = frontendExpense.title;
  if (frontendExpense.category !== undefined) payload.category = frontendExpense.category;
  if (frontendExpense.note !== undefined) payload.note = frontendExpense.note;
  if (frontendExpense.totalAmount !== undefined) payload.totalAmount = frontendExpense.totalAmount;
  if (frontendExpense.items !== undefined) payload.items = frontendExpense.items;
  
  if (frontendExpense.expenseDate !== undefined) {
    const dateStr = frontendExpense.expenseDate;
    if (dateStr) {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const day = parseInt(parts[2], 10);
        // Set to noon to prevent timezone shifts
        const d = new Date(year, month, day, 12, 0, 0, 0);
        payload.expenseDate = d.toISOString();
      }
    }
  }
  return payload;
}

export type ExpenseFilters = {
  category?: string;
  startDate?: string;
  endDate?: string;
  q?: string;
  page?: number;
  limit?: number;
};

export const fetchExpensesFromServer = async (
  token: string,
  filters: ExpenseFilters = {}
): Promise<{ expenses: Expense[]; total: number }> => {
  const params = new URLSearchParams();
  if (filters.category) params.append('category', filters.category);
  if (filters.startDate) params.append('startDate', filters.startDate);
  if (filters.endDate) params.append('endDate', filters.endDate);
  if (filters.q) params.append('q', filters.q);
  if (filters.page) params.append('page', String(filters.page));
  if (filters.limit) params.append('limit', String(filters.limit));

  const queryStr = params.toString() ? `?${params.toString()}` : '';
  const result = await apiRequest<{ expenses: any[]; pagination: { total: number } }>(
    `/expenses${queryStr}`,
    { token }
  );
  
  return {
    expenses: result.expenses.map(mapBackendExpenseToFrontend),
    total: result.pagination.total,
  };
};

export const fetchExpenseByIdFromServer = async (token: string, id: string): Promise<Expense> => {
  const result = await apiRequest<{ expense: any }>(`/expenses/${id}`, { token });
  return mapBackendExpenseToFrontend(result.expense);
};

export const createExpenseOnServer = async (
  token: string,
  expenseData: Partial<Expense>
): Promise<Expense> => {
  const payload = mapFrontendExpenseToBackend(expenseData);
  const result = await apiRequest<{ expense: any }>('/expenses', {
    method: 'POST',
    body: payload,
    token,
  });
  return mapBackendExpenseToFrontend(result.expense);
};

export const updateExpenseOnServer = async (
  token: string,
  id: string,
  expenseData: Partial<Expense>
): Promise<Expense> => {
  const payload = mapFrontendExpenseToBackend(expenseData);
  const result = await apiRequest<{ expense: any }>(`/expenses/${id}`, {
    method: 'PUT',
    body: payload,
    token,
  });
  return mapBackendExpenseToFrontend(result.expense);
};

export const deleteExpenseFromServer = async (token: string, id: string): Promise<void> => {
  await apiRequest(`/expenses/${id}`, {
    method: 'DELETE',
    token,
  });
};
