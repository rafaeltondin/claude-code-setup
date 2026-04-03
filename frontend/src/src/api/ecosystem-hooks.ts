// React Query hooks para APIs do Ecosystem (Tasks, KB, Memory, Prompts, Credentials)
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ecoClient } from './client';
import type {
  EcoTask,
  EcoExecution,
  EcoExecutionStats,
  EcoStatus,
  KBDocument,
  KBSearchResult,
  KBStats,
  MemorySession,
  MemoryStats,
  PromptTemplate,
  Credential,
} from '../types';

// ─── ECOSYSTEM STATUS ────────────────────────────────────────────────────────

export function useEcoStatus() {
  return useQuery<EcoStatus>({
    queryKey: ['eco', 'status'],
    queryFn: () => ecoClient.get<EcoStatus>('/status'),
    staleTime: 10 * 1000,
    refetchInterval: 15 * 1000,
  });
}

// ─── TASKS ───────────────────────────────────────────────────────────────────

export function useEcoTasks() {
  return useQuery<EcoTask[]>({
    queryKey: ['eco', 'tasks'],
    queryFn: () => ecoClient.get<EcoTask[]>('/tasks'),
    staleTime: 15 * 1000,
  });
}

export function useEcoTask(id: string) {
  return useQuery<EcoTask>({
    queryKey: ['eco', 'tasks', id],
    queryFn: () => ecoClient.get<EcoTask>(`/tasks/${id}`),
    enabled: !!id,
  });
}

export function useCreateEcoTask() {
  const qc = useQueryClient();
  return useMutation<EcoTask, Error, Partial<EcoTask>>({
    mutationFn: (data) => ecoClient.post<EcoTask>('/tasks', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['eco', 'tasks'] }),
  });
}

export function useUpdateEcoTask() {
  const qc = useQueryClient();
  return useMutation<EcoTask, Error, { id: string; data: Partial<EcoTask> }>({
    mutationFn: ({ id, data }) => ecoClient.put<EcoTask>(`/tasks/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['eco', 'tasks'] }),
  });
}

export function useDeleteEcoTask() {
  const qc = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: (id) => ecoClient.del(`/tasks/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['eco', 'tasks'] }),
  });
}

export function useRunEcoTask() {
  const qc = useQueryClient();
  return useMutation<{ success: boolean }, Error, string>({
    mutationFn: (id) => ecoClient.post(`/tasks/${id}/run`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['eco', 'tasks'] }),
  });
}

export function usePauseEcoTask() {
  const qc = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: (id) => ecoClient.post(`/tasks/${id}/pause`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['eco', 'tasks'] }),
  });
}

export function usePurgeEcoTasks() {
  const qc = useQueryClient();
  return useMutation<void, Error, void>({
    mutationFn: () => ecoClient.del('/tasks'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['eco', 'tasks'] }),
  });
}

// ─── EXECUTIONS ──────────────────────────────────────────────────────────────

export function useEcoExecutions(limit = 50) {
  return useQuery<EcoExecution[]>({
    queryKey: ['eco', 'executions', limit],
    queryFn: () => ecoClient.get<EcoExecution[]>(`/executions?limit=${limit}`),
    staleTime: 15 * 1000,
  });
}

export function useEcoTaskExecutions(taskId: string, limit = 20) {
  return useQuery<EcoExecution[]>({
    queryKey: ['eco', 'executions', taskId],
    queryFn: () => ecoClient.get<EcoExecution[]>(`/tasks/${taskId}/executions?limit=${limit}`),
    enabled: !!taskId,
  });
}

export function useEcoExecutionStats() {
  return useQuery<EcoExecutionStats>({
    queryKey: ['eco', 'executionStats'],
    queryFn: () => ecoClient.get<EcoExecutionStats>('/executions/stats'),
    staleTime: 30 * 1000,
  });
}

// ─── KNOWLEDGE BASE ──────────────────────────────────────────────────────────

export function useKBDocuments() {
  return useQuery<KBDocument[]>({
    queryKey: ['eco', 'kb', 'documents'],
    queryFn: async () => {
      const res = await ecoClient.get<unknown>('/kb/documents');
      let docs: unknown[];
      if (Array.isArray(res)) docs = res;
      else if (res && typeof res === 'object' && 'documents' in (res as Record<string, unknown>) && Array.isArray((res as Record<string, unknown>).documents)) docs = (res as Record<string, unknown>).documents as unknown[];
      else return [];
      return docs.map((d: unknown) => {
        const raw = d as Record<string, unknown>;
        return {
          filename: (raw.filename ?? raw.path ?? '') as string,
          name: (raw.name ?? raw.title ?? '') as string,
          category: raw.category as string | undefined,
          sections: typeof raw.sections === 'number' ? raw.sections : Array.isArray(raw.sections) ? raw.sections.length : undefined,
          size: raw.size as number | undefined,
          lastModified: (raw.lastModified ?? raw.last_updated ?? raw.modified) as string | undefined,
          priority: raw.priority as number | undefined,
        } satisfies KBDocument;
      });
    },
    staleTime: 60 * 1000,
  });
}

export function useKBSearch(query: string) {
  return useQuery<KBSearchResult[]>({
    queryKey: ['eco', 'kb', 'search', query],
    queryFn: async () => {
      const res = await ecoClient.get<unknown>(`/kb/search?q=${encodeURIComponent(query)}`);
      let items: unknown[];
      if (Array.isArray(res)) items = res;
      else if (res && typeof res === 'object' && 'results' in (res as Record<string, unknown>) && Array.isArray((res as Record<string, unknown>).results)) items = (res as Record<string, unknown>).results as unknown[];
      else return [];
      return items.map((d: unknown) => {
        const raw = d as Record<string, unknown>;
        return {
          filename: (raw.filename ?? raw.path ?? '') as string,
          name: (raw.name ?? raw.title ?? '') as string,
          category: raw.category as string | undefined,
          matches: Array.isArray(raw.matches) ? raw.matches : [],
        } satisfies KBSearchResult;
      });
    },
    enabled: query.length >= 2,
    staleTime: 30 * 1000,
  });
}

export function useKBStats() {
  return useQuery<KBStats>({
    queryKey: ['eco', 'kb', 'stats'],
    queryFn: async () => {
      const res = await ecoClient.get<Record<string, unknown>>('/kb/stats');
      // API retorna { total, totalSize, categories: {} } — normalizar para KBStats
      const raw = res as Record<string, unknown>;
      const categoriesRaw = raw.categories;
      // categories pode ser um objeto { catName: count, ... } ou número direto
      const categoriesCount =
        typeof categoriesRaw === 'number'
          ? categoriesRaw
          : categoriesRaw && typeof categoriesRaw === 'object'
          ? Object.keys(categoriesRaw).length
          : 0;
      return {
        totalDocuments: typeof raw.totalDocuments === 'number'
          ? raw.totalDocuments
          : typeof raw.total === 'number'
          ? raw.total
          : 0,
        categories: categoriesCount,
        totalSections: typeof raw.totalSections === 'number'
          ? raw.totalSections
          : typeof raw.totalSections === 'number'
          ? raw.totalSections
          : 0,
      } satisfies KBStats;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useKBDocument(filename: string) {
  return useQuery<{ filename: string; content: string; metadata?: Record<string, unknown> }>({
    queryKey: ['eco', 'kb', 'document', filename],
    queryFn: async () => {
      const res = await ecoClient.get<Record<string, unknown>>(`/kb/documents/${encodeURIComponent(filename)}`);
      // API retorna { success, document: { filename, content, metadata, ... } }
      const doc = (res?.document as Record<string, unknown>) ?? res;
      return {
        filename: (doc.filename as string) || filename,
        content: (doc.content as string) || '',
        metadata: doc.metadata as Record<string, unknown> | undefined,
      };
    },
    enabled: !!filename,
  });
}

export function useCreateKBDocument() {
  const qc = useQueryClient();
  return useMutation<KBDocument, Error, { filename: string; content: string; category?: string }>({
    mutationFn: (data) => ecoClient.post<KBDocument>('/kb/documents', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['eco', 'kb'] });
    },
  });
}

export function useDeleteKBDocument() {
  const qc = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: (filename) => ecoClient.del(`/kb/documents/${encodeURIComponent(filename)}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['eco', 'kb'] }),
  });
}

// ─── MEMORY SESSIONS ─────────────────────────────────────────────────────────

// Mapeia um task cru da API para o tipo MemoryTask do frontend
function mapMemoryTask(raw: Record<string, unknown>, index: number): import('../types').MemoryTask {
  return {
    id: (raw.id as string) ?? `task-${index}`,
    title: (raw.title ?? raw.content ?? '') as string,
    status: (raw.status as 'pending' | 'in_progress' | 'completed') ?? 'pending',
    description: raw.description as string | undefined,
  };
}

// Mapeia um checkpoint cru da API para o tipo MemoryCheckpoint do frontend
function mapMemoryCheckpoint(raw: Record<string, unknown>, index: number): import('../types').MemoryCheckpoint {
  return {
    id: (raw.id as string) ?? `cp-${index}`,
    description: (raw.description ?? raw.content ?? '') as string,
    phase: raw.phase as string | undefined,
    createdAt: (raw.createdAt ?? raw.timestamp ?? new Date().toISOString()) as string,
  };
}

// Mapeia uma sessão crua da API para o tipo MemorySession do frontend
function mapMemorySession(raw: Record<string, unknown>): MemorySession {
  const tasks = Array.isArray(raw.tasks)
    ? (raw.tasks as Record<string, unknown>[]).map((t, i) => mapMemoryTask(t, i))
    : undefined;
  const checkpoints = Array.isArray(raw.checkpoints)
    ? (raw.checkpoints as Record<string, unknown>[]).map((c, i) => mapMemoryCheckpoint(c, i))
    : undefined;
  return {
    id: raw.id as string,
    project: raw.project as string | undefined,
    objective: (raw.objective ?? (typeof raw.context === 'object' && raw.context !== null ? (raw.context as Record<string, unknown>).objective : raw.context)) as string | undefined,
    phase: (raw.phase ?? raw.currentPhase ?? (typeof raw.context === 'object' && raw.context !== null ? (raw.context as Record<string, unknown>).currentPhase : undefined)) as string | undefined,
    status: raw.status === 'finalized' ? 'finalized' : 'active',
    tasks,
    checkpoints,
    tags: raw.tags as string[] | undefined,
    notes: raw.notes as string | undefined,
    favorite: raw.favorite as boolean | undefined,
    startedAt: (raw.startedAt ?? raw.createdAt) as string,
    finalizedAt: raw.finalizedAt as string | undefined,
    createdAt: raw.createdAt as string,
    updatedAt: raw.updatedAt as string,
  };
}

export function useMemorySessions() {
  return useQuery<MemorySession[]>({
    queryKey: ['eco', 'memory', 'sessions'],
    queryFn: async () => {
      const res = await ecoClient.get<unknown>('/memory/sessions');
      let items: unknown[];
      if (Array.isArray(res)) items = res;
      else if (res && typeof res === 'object' && 'data' in (res as Record<string, unknown>) && Array.isArray((res as Record<string, unknown>).data)) items = (res as Record<string, unknown>).data as unknown[];
      else return [];
      return items.map((s) => mapMemorySession(s as Record<string, unknown>));
    },
    staleTime: 30 * 1000,
  });
}

export function useMemorySession(id: string) {
  return useQuery<MemorySession>({
    queryKey: ['eco', 'memory', 'sessions', id],
    queryFn: async () => {
      const res = await ecoClient.get<unknown>(`/memory/sessions/${id}`);
      let raw: Record<string, unknown>;
      if (res && typeof res === 'object' && 'data' in (res as Record<string, unknown>) && (res as Record<string, unknown>).data && typeof (res as Record<string, unknown>).data === 'object') {
        raw = (res as Record<string, unknown>).data as Record<string, unknown>;
      } else {
        raw = res as Record<string, unknown>;
      }
      return mapMemorySession(raw);
    },
    enabled: !!id,
  });
}

export function useMemoryStats() {
  return useQuery<MemoryStats>({
    queryKey: ['eco', 'memory', 'stats'],
    queryFn: async () => {
      const res = await ecoClient.get<MemoryStats | { success?: boolean; data?: MemoryStats }>('/memory/stats');
      if (res && typeof res === 'object' && 'data' in res && res.data && typeof res.data === 'object') return res.data as MemoryStats;
      return res as MemoryStats;
    },
    staleTime: 60 * 1000,
  });
}

export function useCreateMemorySession() {
  const qc = useQueryClient();
  return useMutation<MemorySession, Error, { project?: string; objective?: string }>({
    mutationFn: (data) => ecoClient.post<MemorySession>('/memory/sessions', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['eco', 'memory'] }),
  });
}

export function useFinalizeMemorySession() {
  const qc = useQueryClient();
  return useMutation<MemorySession, Error, string>({
    mutationFn: (id) => ecoClient.post<MemorySession>(`/memory/sessions/${id}/finalize`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['eco', 'memory'] }),
  });
}

export function useDeleteMemorySession() {
  const qc = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: (id) => ecoClient.del(`/memory/sessions/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['eco', 'memory'] }),
  });
}

export function useCreateCheckpoint() {
  const qc = useQueryClient();
  return useMutation<MemorySession, Error, { sessionId: string; description: string }>({
    mutationFn: ({ sessionId, description }) =>
      ecoClient.post<MemorySession>(`/memory/sessions/${sessionId}/checkpoint`, { description }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['eco', 'memory'] }),
  });
}

// ─── PROMPT TEMPLATES ────────────────────────────────────────────────────────

// A API usa "promptText", mas o frontend usa "content". Normalizamos aqui.
function normalizePrompt(raw: Record<string, unknown>): PromptTemplate {
  return {
    ...(raw as unknown as PromptTemplate),
    content: ((raw.content ?? raw.promptText ?? '') as string),
  };
}

function denormalizePrompt(data: Partial<PromptTemplate>): Record<string, unknown> {
  const { content, ...rest } = data;
  return { ...rest, promptText: content, content };
}

export function usePromptTemplates() {
  return useQuery<PromptTemplate[]>({
    queryKey: ['eco', 'prompts'],
    queryFn: async () => {
      const raw = await ecoClient.get<unknown[]>('/prompt-templates');
      return (Array.isArray(raw) ? raw : []).map((r) =>
        normalizePrompt(r as Record<string, unknown>)
      );
    },
    staleTime: 60 * 1000,
  });
}

export function usePromptTemplate(id: string) {
  return useQuery<PromptTemplate>({
    queryKey: ['eco', 'prompts', id],
    queryFn: async () => {
      const raw = await ecoClient.get<Record<string, unknown>>(`/prompt-templates/${id}`);
      return normalizePrompt(raw);
    },
    enabled: !!id,
  });
}

export function useCreatePromptTemplate() {
  const qc = useQueryClient();
  return useMutation<PromptTemplate, Error, Partial<PromptTemplate>>({
    mutationFn: async (data) => {
      const raw = await ecoClient.post<Record<string, unknown>>('/prompt-templates', denormalizePrompt(data));
      return normalizePrompt(raw);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['eco', 'prompts'] }),
  });
}

export function useUpdatePromptTemplate() {
  const qc = useQueryClient();
  return useMutation<PromptTemplate, Error, { id: string; data: Partial<PromptTemplate> }>({
    mutationFn: async ({ id, data }) => {
      const raw = await ecoClient.put<Record<string, unknown>>(`/prompt-templates/${id}`, denormalizePrompt(data));
      return normalizePrompt(raw);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['eco', 'prompts'] }),
  });
}

export function useDeletePromptTemplate() {
  const qc = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: (id) => ecoClient.del(`/prompt-templates/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['eco', 'prompts'] }),
  });
}

export function usePromptGallery() {
  return useQuery<PromptTemplate[]>({
    queryKey: ['eco', 'prompts', 'gallery'],
    queryFn: async () => {
      const res = await ecoClient.get<unknown>('/prompt-templates/gallery');
      const raw = Array.isArray(res)
        ? res
        : (res as Record<string, unknown>)?.data as unknown[] ?? [];
      return (Array.isArray(raw) ? raw : []).map((r) =>
        normalizePrompt(r as Record<string, unknown>)
      );
    },
    staleTime: 5 * 60 * 1000,
  });
}

// ─── CREDENTIALS ─────────────────────────────────────────────────────────────

export function useCredentials() {
  return useQuery<Credential[]>({
    queryKey: ['eco', 'credentials'],
    queryFn: () => ecoClient.get<Credential[]>('/credentials'),
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateCredential() {
  const qc = useQueryClient();
  return useMutation<Credential, Error, { name: string; value: string; description?: string; category?: string }>({
    mutationFn: (data) => ecoClient.post<Credential>('/credentials', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['eco', 'credentials'] }),
  });
}

export function useDeleteCredential() {
  const qc = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: (id) => ecoClient.del(`/credentials/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['eco', 'credentials'] }),
  });
}

// ─── SCHEDULER ───────────────────────────────────────────────────────────────

export function useStartScheduler() {
  const qc = useQueryClient();
  return useMutation<void, Error, void>({
    mutationFn: () => ecoClient.post('/scheduler/start'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['eco', 'status'] }),
  });
}

export function useStopScheduler() {
  const qc = useQueryClient();
  return useMutation<void, Error, void>({
    mutationFn: () => ecoClient.post('/scheduler/stop'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['eco', 'status'] }),
  });
}

// ─── TELEGRAM BOT ───────────────────────────────────────────────────────────

export interface TelegramStatus {
  isRunning: boolean;
  uptime: number;
  startedAt: string | null;
  config: TelegramConfig;
}

export interface TelegramConfig {
  enabled: boolean;
  botToken: string;
  botName: string;
  chatId: string;
  authorizedUsers: number[];
  events: string[];
  notifications: {
    onTaskSuccess: boolean;
    onTaskFailure: boolean;
    onSchedulerEvent: boolean;
  };
}

export interface TelegramConfigFrontend {
  token: string;
  chatId: string;
  events: string[];
  enabled: boolean;
  botName: string;
}

export function useTelegramStatus() {
  return useQuery<TelegramStatus>({
    queryKey: ['eco', 'telegram', 'status'],
    queryFn: () => ecoClient.get<TelegramStatus>('/telegram/status'),
    staleTime: 5 * 1000,
    refetchInterval: 10 * 1000,
  });
}

export function useTelegramConfig() {
  return useQuery<TelegramConfigFrontend>({
    queryKey: ['eco', 'telegram', 'config'],
    queryFn: () => ecoClient.get<TelegramConfigFrontend>('/telegram/config'),
    staleTime: 30 * 1000,
  });
}

export function useUpdateTelegramConfig() {
  const qc = useQueryClient();
  return useMutation<unknown, Error, Partial<TelegramConfigFrontend & { botToken?: string }>>({
    mutationFn: (data) => ecoClient.put('/telegram/config', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['eco', 'telegram'] });
    },
  });
}

export function useStartTelegramBot() {
  const qc = useQueryClient();
  return useMutation<{ success: boolean; message: string }, Error, { token?: string }>({
    mutationFn: (data) => ecoClient.post('/telegram/start', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['eco', 'telegram'] });
    },
  });
}

export function useStopTelegramBot() {
  const qc = useQueryClient();
  return useMutation<{ success: boolean; message: string }, Error, void>({
    mutationFn: () => ecoClient.post('/telegram/stop'),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['eco', 'telegram'] });
    },
  });
}

export function useSendTelegramMessage() {
  return useMutation<{ success: boolean }, Error, { message: string }>({
    mutationFn: (data) => ecoClient.post('/telegram/send', data),
  });
}
