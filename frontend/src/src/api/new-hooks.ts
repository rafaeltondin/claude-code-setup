// Hooks TanStack Query — módulos PersonalTasks, Finance e Notes
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from './client';

// ─── UTILITÁRIO ───────────────────────────────────────────────────────────────

// A API retorna { success: true, data: ... }
// O apiClient já retorna o JSON completo, então extraímos .data
function extractData<T>(response: unknown): T {
  if (
    response !== null &&
    typeof response === 'object' &&
    'data' in (response as Record<string, unknown>)
  ) {
    return (response as Record<string, unknown>).data as T;
  }
  return response as T;
}

// ─── TIPOS — PERSONAL TASKS ───────────────────────────────────────────────────

export interface PersonalTask {
  id: string;
  title: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high';
  dueDate?: string;
  tags: string;
  createdAt: string;
  updatedAt: string;
}

export interface PersonalTaskStats {
  total: number;
  pending: number;
  in_progress: number;
  completed: number;
  cancelled: number;
}

// ─── HOOKS — PERSONAL TASKS ───────────────────────────────────────────────────

export function usePersonalTasks(params?: {
  status?: string;
  priority?: string;
  search?: string;
}) {
  const searchParams = new URLSearchParams();
  if (params?.status)   searchParams.set('status',   params.status);
  if (params?.priority) searchParams.set('priority', params.priority);
  if (params?.search)   searchParams.set('search',   params.search);
  const qs = searchParams.toString();

  return useQuery<PersonalTask[]>({
    queryKey: ['personal-tasks', params],
    queryFn: async () => {
      const raw = await apiClient.get<unknown>(
        `/personal-tasks${qs ? `?${qs}` : ''}`
      );
      return extractData<PersonalTask[]>(raw);
    },
  });
}

export function usePersonalTaskStats() {
  return useQuery<PersonalTaskStats>({
    queryKey: ['personal-tasks-stats'],
    queryFn: async () => {
      const raw = await apiClient.get<unknown>('/personal-tasks/stats');
      return extractData<PersonalTaskStats>(raw);
    },
  });
}

export function useCreatePersonalTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<PersonalTask>) =>
      apiClient.post<unknown>('/personal-tasks', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['personal-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['personal-tasks-stats'] });
    },
  });
}

export function useUpdatePersonalTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<PersonalTask> }) =>
      apiClient.put<unknown>(`/personal-tasks/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['personal-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['personal-tasks-stats'] });
    },
  });
}

export function useDeletePersonalTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.del<unknown>(`/personal-tasks/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['personal-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['personal-tasks-stats'] });
    },
  });
}

export function useUpdatePersonalTaskStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: PersonalTask['status'] }) =>
      apiClient.put<unknown>(`/personal-tasks/${id}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['personal-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['personal-tasks-stats'] });
    },
  });
}

// ─── TIPOS — FINANCE ──────────────────────────────────────────────────────────

export interface FinanceCategory {
  id: string;
  name: string;
  type: 'income' | 'expense';
  createdAt: string;
}

export interface Transaction {
  id: string;
  description: string;
  amount: number;
  date: string;
  categoryId?: string;
  isRecurring: boolean;
  paid: boolean;
  createdAt: string;
  updatedAt: string;
  category?: FinanceCategory;
}

export interface Budget {
  id: string;
  categoryId: string;
  amount: number;
  month: number;
  year: number;
  createdAt: string;
  category?: FinanceCategory;
}

export interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Investment {
  id: string;
  name: string;
  amount: number;
  type: string;
  date: string;
  createdAt: string;
  updatedAt: string;
}

export interface FinanceSummary {
  income: number;
  expense: number;
  balance: number;
  pendingCount: number;
  totalRecebido: number;
  totalPago: number;
  faltaReceber: number;
  faltaPagar: number;
  byCategory: Array<{ name: string; amount: number; type: string }>;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedTransactions {
  data: Transaction[];
  pagination: PaginationInfo;
}

// ─── HOOKS — FINANCE ──────────────────────────────────────────────────────────

export function useTransactions(params?: {
  month?: number;
  year?: number;
  page?: number;
  limit?: number;
  type?: string;
  search?: string;
}) {
  const searchParams = new URLSearchParams();
  if (params?.month  !== undefined) searchParams.set('month',  String(params.month));
  if (params?.year   !== undefined) searchParams.set('year',   String(params.year));
  if (params?.page   !== undefined) searchParams.set('page',   String(params.page));
  if (params?.limit  !== undefined) searchParams.set('limit',  String(params.limit));
  if (params?.type)   searchParams.set('type',   params.type);
  if (params?.search) searchParams.set('search', params.search);
  const qs = searchParams.toString();

  return useQuery<PaginatedTransactions>({
    queryKey: ['finance-transactions', params],
    queryFn: async () => {
      const raw = await apiClient.get<unknown>(
        `/finance/transactions${qs ? `?${qs}` : ''}`
      );
      // A API retorna { success, data, pagination }
      const response = raw as Record<string, unknown>;
      return {
        data: (response.data ?? []) as Transaction[],
        pagination: (response.pagination ?? { page: 1, limit: 50, total: 0, totalPages: 1 }) as PaginationInfo,
      };
    },
  });
}

export function useFinanceCategories() {
  return useQuery<FinanceCategory[]>({
    queryKey: ['finance-categories'],
    queryFn: async () => {
      const raw = await apiClient.get<unknown>('/finance/categories');
      return extractData<FinanceCategory[]>(raw);
    },
  });
}

export function useFinanceSummary(month?: number, year?: number) {
  const searchParams = new URLSearchParams();
  if (month !== undefined) searchParams.set('month', String(month));
  if (year  !== undefined) searchParams.set('year',  String(year));
  const qs = searchParams.toString();

  return useQuery<FinanceSummary>({
    queryKey: ['finance-summary', month, year],
    queryFn: async () => {
      const raw = await apiClient.get<unknown>(
        `/finance/summary${qs ? `?${qs}` : ''}`
      );
      const data = extractData<Record<string, unknown>>(raw);
      // Backend retorna totalIncome/totalExpense, frontend espera income/expense
      return {
        income:         (data.totalIncome  ?? data.income  ?? 0) as number,
        expense:        (data.totalExpense ?? data.expense ?? 0) as number,
        balance:        (data.balance ?? 0) as number,
        pendingCount:   (data.pendingCount ?? data.transactionsCount ?? 0) as number,
        totalRecebido:  (data.totalRecebido ?? 0) as number,
        totalPago:      (data.totalPago ?? 0) as number,
        faltaReceber:   (data.faltaReceber ?? 0) as number,
        faltaPagar:     (data.faltaPagar ?? 0) as number,
        byCategory:     (data.byCategory ?? []) as FinanceSummary['byCategory'],
      };
    },
  });
}

export function useBudgets(month?: number, year?: number) {
  const searchParams = new URLSearchParams();
  if (month !== undefined) searchParams.set('month', String(month));
  if (year  !== undefined) searchParams.set('year',  String(year));
  const qs = searchParams.toString();

  return useQuery<Budget[]>({
    queryKey: ['finance-budgets', month, year],
    queryFn: async () => {
      const raw = await apiClient.get<unknown>(
        `/finance/budgets${qs ? `?${qs}` : ''}`
      );
      return extractData<Budget[]>(raw);
    },
  });
}

export function useGoals() {
  return useQuery<Goal[]>({
    queryKey: ['finance-goals'],
    queryFn: async () => {
      const raw = await apiClient.get<unknown>('/finance/goals');
      return extractData<Goal[]>(raw);
    },
  });
}

export function useInvestments() {
  return useQuery<Investment[]>({
    queryKey: ['finance-investments'],
    queryFn: async () => {
      const raw = await apiClient.get<unknown>('/finance/investments');
      return extractData<Investment[]>(raw);
    },
  });
}

export function useCreateTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Transaction>) =>
      apiClient.post<unknown>('/finance/transactions', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['finance-summary'] });
    },
  });
}

export function useUpdateTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Transaction> }) =>
      apiClient.put<unknown>(`/finance/transactions/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['finance-summary'] });
    },
  });
}

export function useDeleteTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.del<unknown>(`/finance/transactions/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['finance-summary'] });
    },
  });
}

export function useCreateFinanceCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; type: 'income' | 'expense' }) =>
      apiClient.post<unknown>('/finance/categories', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance-categories'] });
    },
  });
}

export function useCreateBudget() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Budget>) =>
      apiClient.post<unknown>('/finance/budgets', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance-budgets'] });
    },
  });
}

export function useCreateGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Goal>) =>
      apiClient.post<unknown>('/finance/goals', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance-goals'] });
    },
  });
}

export function useUpdateGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Goal> }) =>
      apiClient.put<unknown>(`/finance/goals/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance-goals'] });
    },
  });
}

export function useCreateInvestment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Investment>) =>
      apiClient.post<unknown>('/finance/investments', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance-investments'] });
    },
  });
}

export function useUpdateFinanceCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name: string; type: 'income' | 'expense' } }) =>
      apiClient.put<unknown>(`/finance/categories/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance-categories'] });
      queryClient.invalidateQueries({ queryKey: ['finance-transactions'] });
    },
  });
}

export function useDeleteFinanceCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.del<unknown>(`/finance/categories/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance-categories'] });
      queryClient.invalidateQueries({ queryKey: ['finance-transactions'] });
    },
  });
}

// ─── TIPOS — CALENDAR ─────────────────────────────────────────────────────────

export interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  description?: string;
  location?: string;
  isAllDay?: boolean;
  source?: 'google' | 'task';
}

// ─── HOOKS — CALENDAR ─────────────────────────────────────────────────────────

export function useCalendarEvents(month?: number, year?: number) {
  const searchParams = new URLSearchParams();
  if (month !== undefined) searchParams.set('month', String(month));
  if (year  !== undefined) searchParams.set('year',  String(year));
  const qs = searchParams.toString();

  return useQuery<CalendarEvent[]>({
    queryKey: ['calendar-events', month, year],
    queryFn: async () => {
      const raw = await apiClient.get<unknown>(
        `/calendar/events${qs ? `?${qs}` : ''}`
      );
      return extractData<CalendarEvent[]>(raw);
    },
    retry: false,
  });
}

export function useCreateCalendarEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      title: string;
      start: string;
      end: string;
      description?: string;
      location?: string;
      isAllDay?: boolean;
    }) => apiClient.post<unknown>('/calendar/events', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
    },
  });
}

export function useDeleteCalendarEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (eventId: string) =>
      apiClient.del<unknown>(`/calendar/events/${eventId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
    },
  });
}

// ─── TIPOS — NOTES ────────────────────────────────────────────────────────────

export interface NoteCategory {
  id: string;
  name: string;
  color: string;
  createdAt: string;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  color: string;
  pinned: boolean;
  archived: boolean;
  categoryId?: string;
  createdAt: string;
  updatedAt: string;
  category?: NoteCategory;
}

// ─── HOOKS — NOTES ────────────────────────────────────────────────────────────

export function useNotes(params?: {
  search?: string;
  categoryId?: string;
  archived?: boolean;
  pinned?: boolean;
}) {
  const searchParams = new URLSearchParams();
  if (params?.search)     searchParams.set('search',     params.search);
  if (params?.categoryId) searchParams.set('categoryId', params.categoryId);
  if (params?.archived    !== undefined)
    searchParams.set('archived', String(params.archived));
  if (params?.pinned !== undefined)
    searchParams.set('pinned', String(params.pinned));
  const qs = searchParams.toString();

  return useQuery<Note[]>({
    queryKey: ['notes', params],
    queryFn: async () => {
      const raw = await apiClient.get<unknown>(`/notes${qs ? `?${qs}` : ''}`);
      return extractData<Note[]>(raw);
    },
  });
}

export function useNoteCategories() {
  return useQuery<NoteCategory[]>({
    queryKey: ['note-categories'],
    queryFn: async () => {
      const raw = await apiClient.get<unknown>('/notes/categories');
      return extractData<NoteCategory[]>(raw);
    },
  });
}

export function useCreateNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Note>) =>
      apiClient.post<unknown>('/notes', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
    },
  });
}

export function useUpdateNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Note> }) =>
      apiClient.put<unknown>(`/notes/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
    },
  });
}

export function useDeleteNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.del<unknown>(`/notes/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
    },
  });
}

export function useTogglePin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.put<unknown>(`/notes/${id}/pin`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
    },
  });
}

export function useToggleArchive() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.put<unknown>(`/notes/${id}/archive`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
    },
  });
}

export function useCreateNoteCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; color: string }) =>
      apiClient.post<unknown>('/notes/categories', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['note-categories'] });
    },
  });
}
