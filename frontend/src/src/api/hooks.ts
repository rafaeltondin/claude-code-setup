// React Query hooks — Ecosystem + Pessoal
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, ecoClient } from './client';
import type {
  User,
  AuthResponse,
  DashboardStats,
  Settings,
  ChatAIConfig,
} from '../types';

// ─── AUTH ─────────────────────────────────────────────────────────────────────

export function useAuth() {
  return useQuery<User>({
    queryKey: ['auth', 'me'],
    queryFn: () => apiClient.get<User>('/auth/me'),
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
}

export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation<AuthResponse, Error, { email: string; password: string }>({
    mutationFn: (credentials) => apiClient.post<AuthResponse>('/auth/login', credentials),
    onSuccess: (data) => {
      localStorage.setItem('auth_token', data.token);
      localStorage.setItem('auth_user', JSON.stringify(data.user));
      queryClient.setQueryData(['auth', 'me'], data.user);
    },
  });
}

export function useRegister() {
  return useMutation<AuthResponse, Error, { name: string; email: string; password: string }>({
    mutationFn: (data) => apiClient.post<AuthResponse>('/auth/register', data),
    onSuccess: (data) => {
      localStorage.setItem('auth_token', data.token);
      localStorage.setItem('auth_user', JSON.stringify(data.user));
    },
  });
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────

export function useDashboard() {
  return useQuery<DashboardStats>({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const res = await apiClient.get<{ data: DashboardStats } | DashboardStats>('/dashboard/stats');
      return ((res as any).data ?? res) as DashboardStats;
    },
    staleTime: 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });
}

// ─── SETTINGS ─────────────────────────────────────────────────────────────────

function snakeToCamel(s: string): string {
  return s.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

function camelToSnake(s: string): string {
  return s.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
}

function transformSettingsFromApi(raw: Record<string, unknown>): Settings {
  const data = (raw && typeof raw === 'object' && 'data' in raw)
    ? (raw as { data: Record<string, string> }).data
    : raw;

  const result: Record<string, unknown> = {};
  if (data && typeof data === 'object') {
    for (const [key, value] of Object.entries(data)) {
      const camelKey = snakeToCamel(key);
      if ((camelKey === 'smtpPort' || camelKey === 'imapPort') && value) {
        result[camelKey] = parseInt(String(value), 10) || undefined;
      } else {
        result[camelKey] = value;
      }
    }
  }
  return result as unknown as Settings;
}

function transformSettingsToApi(data: Partial<Settings>): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined && value !== null) {
      result[camelToSnake(key)] = String(value);
    }
  }
  return result;
}

export function useSettings() {
  return useQuery<Settings>({
    queryKey: ['settings'],
    queryFn: async () => {
      const raw = await apiClient.get<Record<string, unknown>>('/settings');
      return transformSettingsFromApi(raw);
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useUpdateSettings() {
  const queryClient = useQueryClient();
  return useMutation<Settings, Error, Partial<Settings>>({
    mutationFn: async (data) => {
      const snakeData = transformSettingsToApi(data);
      await apiClient.put('/settings', snakeData);
      const raw = await apiClient.get<Record<string, unknown>>('/settings');
      return transformSettingsFromApi(raw);
    },
    onSuccess: (settings) => queryClient.setQueryData(['settings'], settings),
  });
}

// ─── CHAT IA CONFIG ────────────────────────────────────────────────────────────

export function useChatConfig() {
  return useQuery<ChatAIConfig>({
    queryKey: ['chatConfig'],
    queryFn: () => ecoClient.get<ChatAIConfig>('/chat/config'),
    staleTime: 60 * 1000,
  });
}

export function useUpdateChatConfig() {
  const queryClient = useQueryClient();
  return useMutation<ChatAIConfig, Error, Partial<ChatAIConfig> & { openrouterApiKey?: string }>({
    mutationFn: (data) => ecoClient.put<ChatAIConfig>('/chat/config', data),
    onSuccess: (config) => queryClient.setQueryData(['chatConfig'], config),
  });
}

export function useTestChatConfig() {
  return useMutation<{ ok: boolean; model: string; response: string }, Error, { model: string }>({
    mutationFn: (data) => ecoClient.post('/chat/config/test', data),
  });
}

export function useSystemPrompt() {
  return useQuery<{ customSystemPrompt: string; isCustomized: boolean }>({
    queryKey: ['systemPrompt'],
    queryFn: () => ecoClient.get('/chat/system-prompt'),
    staleTime: 60 * 1000,
  });
}

export function useUpdateSystemPrompt() {
  const queryClient = useQueryClient();
  return useMutation<{ customSystemPrompt: string; isCustomized: boolean; message: string }, Error, { customSystemPrompt: string }>({
    mutationFn: (data) => ecoClient.put('/chat/system-prompt', data),
    onSuccess: (data) => queryClient.setQueryData(['systemPrompt'], data),
  });
}
