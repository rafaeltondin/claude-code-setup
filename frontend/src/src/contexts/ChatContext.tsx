// ChatContext — estado global do chat. Persiste entre navegações.
import {
  createContext,
  useContext,
  useState,
  useRef,
  useCallback,
  useEffect,
  type ReactNode,
} from 'react';

// ─── TIPOS ────────────────────────────────────────────────────────────────────

type ToolLogType = 'tool_use' | 'stderr';

export interface ToolLog {
  type: ToolLogType;
  name?: string;
  input?: string;
  output?: string;
  text?: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  logs?: ToolLog[];
  isStreaming?: boolean;
  hasError?: boolean;
  createdAt: string;
}

export interface ChatSession {
  id: string;
  title: string;
  claudeSessionId: string | null;
  messages: ChatMessage[];
  messageCount?: number;
  createdAt: string;
  updatedAt: string;
}

export type StreamingPhase = 'thinking' | 'writing' | 'tool';

export interface OrchestratorStep {
  id: string;
  name: string;
  agent: string;
  description: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  result?: string;
}

export interface OrchestratorState {
  isActive: boolean;
  phase: number;
  steps: OrchestratorStep[];
  currentAgent?: string;
}

export interface PerSessionState {
  messages: ChatMessage[];
  isStreaming: boolean;
  streamingPhase: StreamingPhase;
  currentTool: string;
  elapsed: number;
  loaded: boolean;
}

// ─── CONSTANTES ───────────────────────────────────────────────────────────────

const AUTH_HEADER = 'Bearer local-dev-token';

export const DEFAULT_SESSION_STATE: PerSessionState = {
  messages: [],
  isStreaming: false,
  streamingPhase: 'thinking',
  currentTool: '',
  elapsed: 0,
  loaded: false,
};

// ─── API ──────────────────────────────────────────────────────────────────────

async function apiListSessions(): Promise<ChatSession[]> {
  const res = await fetch('/api/chat/sessions', {
    headers: { Authorization: AUTH_HEADER },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function apiCreateSession(): Promise<ChatSession> {
  const res = await fetch('/api/chat/sessions', {
    method: 'POST',
    headers: { Authorization: AUTH_HEADER, 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: 'Nova Conversa' }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function apiDeleteSession(id: string): Promise<void> {
  const res = await fetch(`/api/chat/sessions/${id}`, {
    method: 'DELETE',
    headers: { Authorization: AUTH_HEADER },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}

async function apiGetSession(id: string): Promise<ChatSession> {
  const res = await fetch(`/api/chat/sessions/${id}`, {
    headers: { Authorization: AUTH_HEADER },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function apiRenameSession(id: string, title: string): Promise<void> {
  await fetch(`/api/chat/sessions/${id}/title`, {
    method: 'PUT',
    headers: { Authorization: AUTH_HEADER, 'Content-Type': 'application/json' },
    body: JSON.stringify({ title }),
  });
}

// ─── CONTEXT ──────────────────────────────────────────────────────────────────

interface ChatContextValue {
  // Sessões
  sessions: ChatSession[];
  setSessions: React.Dispatch<React.SetStateAction<ChatSession[]>>;
  activeId: string | null;
  setActiveId: (id: string | null) => void;
  loadingSessions: boolean;
  loadingSession: boolean;
  sessionsError: string | null;

  // Estado por-sessão
  sessionStates: Record<string, PerSessionState>;

  // Orquestrador
  orchestratorMode: boolean;
  setOrchestratorMode: React.Dispatch<React.SetStateAction<boolean>>;
  orchestratorState: OrchestratorState;
  setOrchestratorState: React.Dispatch<React.SetStateAction<OrchestratorState>>;

  // Indicador global: alguma sessão está streamindo
  hasActiveStreaming: boolean;

  // Ações
  loadSessions: () => Promise<void>;
  selectSession: (id: string) => Promise<void>;
  createSession: () => Promise<ChatSession | undefined>;
  deleteSession: (id: string) => Promise<void>;
  clearAllSessions: () => Promise<void>;
  renameSession: (id: string, title: string) => Promise<void>;
  cancelStreaming: (sessionId?: string) => void;
  sendMessage: (content: string, sessionId?: string) => Promise<void>;
}

const ChatContext = createContext<ChatContextValue | null>(null);

// ─── PROVIDER ────────────────────────────────────────────────────────────────

export function ChatProvider({ children }: { children: ReactNode }) {
  // Estado de sessões
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [loadingSession, setLoadingSession] = useState(false);
  const [sessionsError, setSessionsError] = useState<string | null>(null);

  // Estado por-sessão
  const [sessionStates, setSessionStates] = useState<Record<string, PerSessionState>>({});

  // Orquestrador
  const [orchestratorMode, setOrchestratorMode] = useState(false);
  const [orchestratorState, setOrchestratorState] = useState<OrchestratorState>({
    isActive: false,
    phase: 0,
    steps: [],
  });

  // Refs imperativas — sobrevivem a rerenders e não causam desmontagem
  const abortControllersRef = useRef<Record<string, AbortController>>({});
  const timerIdsRef = useRef<Record<string, ReturnType<typeof setInterval>>>({});
  const startTimesRef = useRef<Record<string, number>>({});
  const loadedRef = useRef<Set<string>>(new Set());

  // Indicador global
  const hasActiveStreaming = Object.values(sessionStates).some((s) => s.isStreaming);

  // ── Carregar lista de sessões
  const loadSessions = useCallback(async () => {
    setLoadingSessions(true);
    setSessionsError(null);
    try {
      const data = await apiListSessions();
      setSessions(data);
    } catch {
      setSessionsError('Erro ao carregar sessões.');
    } finally {
      setLoadingSessions(false);
    }
  }, []);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  // ── Selecionar sessão — NÃO interrompe streaming de outra sessão
  const selectSession = useCallback(
    async (id: string) => {
      if (id === activeId) return;
      setActiveId(id);
      // Resetar orquestrador ao trocar de sessão
      setOrchestratorState({ isActive: false, phase: 0, steps: [] });
      if (loadedRef.current.has(id)) return;

      setLoadingSession(true);
      try {
        const session = await apiGetSession(id);
        loadedRef.current.add(id);
        setSessionStates((prev) => ({
          ...prev,
          [id]: { ...(prev[id] ?? DEFAULT_SESSION_STATE), messages: session.messages ?? [], loaded: true },
        }));
      } catch (err) {
        console.error('[ChatContext] [selectSession] ERRO:', err);
      } finally {
        setLoadingSession(false);
      }
    },
    [activeId]
  );

  // ── Criar nova sessão
  const createSession = useCallback(async (): Promise<ChatSession | undefined> => {
    try {
      const session = await apiCreateSession();
      loadedRef.current.add(session.id);
      setSessions((prev) => [session, ...prev]);
      setSessionStates((prev) => ({
        ...prev,
        [session.id]: { ...DEFAULT_SESSION_STATE, loaded: true },
      }));
      setActiveId(session.id);
      // Resetar orquestrador ao criar nova sessão
      setOrchestratorState({ isActive: false, phase: 0, steps: [] });
      return session;
    } catch (err) {
      console.error('[ChatContext] [createSession] ERRO:', err);
    }
  }, []);

  // ── Deletar sessão
  const deleteSession = useCallback(
    async (id: string) => {
      abortControllersRef.current[id]?.abort();
      delete abortControllersRef.current[id];
      if (timerIdsRef.current[id]) {
        clearInterval(timerIdsRef.current[id]);
        delete timerIdsRef.current[id];
      }
      delete startTimesRef.current[id];
      loadedRef.current.delete(id);

      try {
        await apiDeleteSession(id);
        setSessions((prev) => prev.filter((s) => s.id !== id));
        setSessionStates((prev) => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
        if (activeId === id) setActiveId(null);
      } catch (err) {
        console.error('[ChatContext] [deleteSession] ERRO:', err);
      }
    },
    [activeId]
  );

  // ── Limpar todas as sessões
  const clearAllSessions = useCallback(async () => {
    // Abortar todos os streamings
    for (const [id, ctrl] of Object.entries(abortControllersRef.current)) {
      ctrl.abort();
      delete abortControllersRef.current[id];
    }
    for (const [id, tid] of Object.entries(timerIdsRef.current)) {
      clearInterval(tid);
      delete timerIdsRef.current[id];
    }

    // Deletar todas as sessões no backend
    const allSessions = [...sessions];
    const errors: string[] = [];
    for (const s of allSessions) {
      try {
        await apiDeleteSession(s.id);
      } catch {
        errors.push(s.id);
      }
    }

    // Limpar estado local
    setSessions([]);
    setSessionStates({});
    setActiveId(null);
    setOrchestratorState({ isActive: false, phase: 0, steps: [] });
    loadedRef.current.clear();
    startTimesRef.current = {};

    if (errors.length > 0) {
      console.warn('[ChatContext] [clearAllSessions] Falha ao deletar:', errors);
    }
  }, [sessions]);

  // ── Renomear sessão
  const renameSession = useCallback(async (id: string, title: string) => {
    setSessions((prev) => prev.map((s) => (s.id === id ? { ...s, title } : s)));
    try {
      await apiRenameSession(id, title);
    } catch (err) {
      console.error('[ChatContext] [renameSession] ERRO (ignorado):', err);
    }
  }, []);

  // ── Cancelar streaming
  const cancelStreaming = useCallback(
    (sessionId?: string) => {
      const id = sessionId ?? activeId;
      if (!id) return;
      abortControllersRef.current[id]?.abort();
      delete abortControllersRef.current[id];
      if (timerIdsRef.current[id]) {
        clearInterval(timerIdsRef.current[id]);
        delete timerIdsRef.current[id];
      }
      delete startTimesRef.current[id];

      setSessionStates((prev) => {
        const s = prev[id] ?? DEFAULT_SESSION_STATE;
        const msgs = s.messages;
        const last = msgs[msgs.length - 1];
        const updatedMsgs =
          last?.role === 'assistant' && last.isStreaming
            ? [...msgs.slice(0, -1), { ...last, isStreaming: false }]
            : msgs;
        return {
          ...prev,
          [id]: {
            ...s,
            messages: updatedMsgs,
            isStreaming: false,
            streamingPhase: 'thinking',
            currentTool: '',
            elapsed: 0,
          },
        };
      });
    },
    [activeId]
  );

  // ── Enviar mensagem com streaming (por-sessão, paralelo)
  const sendMessage = useCallback(
    async (content: string, sessionId?: string) => {
      if (!content.trim()) return;

      let targetId = sessionId ?? activeId;

      // Se não há sessão, criar uma nova
      if (!targetId) {
        const newSession = await createSession();
        if (!newSession) return;
        targetId = newSession.id;
      }

      const sid = targetId;

      // Não enviar se essa sessão já está streamindo
      if (abortControllersRef.current[sid]) return;

      const userMsg: ChatMessage = {
        role: 'user',
        content,
        createdAt: new Date().toISOString(),
      };
      const assistantMsg: ChatMessage = {
        role: 'assistant',
        content: '',
        logs: [],
        isStreaming: true,
        createdAt: new Date().toISOString(),
      };

      setSessionStates((prev) => {
        const s = prev[sid] ?? DEFAULT_SESSION_STATE;
        return {
          ...prev,
          [sid]: {
            ...s,
            messages: [...s.messages, userMsg, assistantMsg],
            isStreaming: true,
            streamingPhase: 'thinking',
            currentTool: '',
            elapsed: 0,
          },
        };
      });

      // Timer por-sessão
      startTimesRef.current[sid] = Date.now();
      timerIdsRef.current[sid] = setInterval(() => {
        const start = startTimesRef.current[sid];
        if (start !== undefined) {
          setSessionStates((prev) => {
            const s = prev[sid];
            if (!s?.isStreaming) return prev;
            return { ...prev, [sid]: { ...s, elapsed: (Date.now() - start) / 1000 } };
          });
        }
      }, 100);

      const controller = new AbortController();
      abortControllersRef.current[sid] = controller;

      // ── Modo orquestrador ────────────────────────────────────────────────────
      if (orchestratorMode) {
        setOrchestratorState({ isActive: true, phase: 0, steps: [] });

        try {
          const resp = await fetch('/api/orchestrate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: AUTH_HEADER },
            body: JSON.stringify({ instruction: content, sessionId: sid }),
            signal: controller.signal,
          });
          if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

          const reader = resp.body!.getReader();
          const decoder = new TextDecoder();
          let buffer = '';

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() ?? '';

            for (const line of lines) {
              if (!line.startsWith('data: ')) continue;
              const raw = line.slice(6).trim();
              if (!raw || raw === '[DONE]') continue;
              let evt: Record<string, unknown>;
              try {
                evt = JSON.parse(raw);
              } catch {
                continue;
              }

              if (evt.type === 'orchestration_phase') {
                setOrchestratorState((prev) => ({ ...prev, phase: evt.phase as number }));
                setSessionStates((prev) => {
                  const s = prev[sid] ?? DEFAULT_SESSION_STATE;
                  const msgs = s.messages;
                  const last = msgs[msgs.length - 1];
                  if (last?.role !== 'assistant') return prev;
                  return {
                    ...prev,
                    [sid]: {
                      ...s,
                      messages: [
                        ...msgs.slice(0, -1),
                        { ...last, content: `⚡ ${evt.message as string}` },
                      ],
                    },
                  };
                });
              } else if (evt.type === 'orchestration_plan') {
                const steps = (evt.steps as OrchestratorStep[]).map((s) => ({
                  ...s,
                  status: 'pending' as const,
                }));
                setOrchestratorState((prev) => ({ ...prev, steps }));
              } else if (evt.type === 'agent_started') {
                setOrchestratorState((prev) => ({
                  ...prev,
                  currentAgent: evt.agent as string,
                  steps: prev.steps.map((s) =>
                    s.id === evt.stepId ? { ...s, status: 'running' as const } : s
                  ),
                }));
              } else if (evt.type === 'agent_completed') {
                setOrchestratorState((prev) => ({
                  ...prev,
                  steps: prev.steps.map((s) =>
                    s.id === evt.stepId
                      ? { ...s, status: 'completed' as const, result: evt.result as string }
                      : s
                  ),
                }));
              } else if (evt.type === 'agent_failed') {
                setOrchestratorState((prev) => ({
                  ...prev,
                  steps: prev.steps.map((s) =>
                    s.id === evt.stepId ? { ...s, status: 'failed' as const } : s
                  ),
                }));
              } else if (evt.type === 'orchestration_done') {
                setSessionStates((prev) => {
                  const s = prev[sid] ?? DEFAULT_SESSION_STATE;
                  const msgs = s.messages;
                  const last = msgs[msgs.length - 1];
                  if (last?.role !== 'assistant') return prev;
                  return {
                    ...prev,
                    [sid]: {
                      ...s,
                      messages: [
                        ...msgs.slice(0, -1),
                        { ...last, content: evt.report as string, isStreaming: false },
                      ],
                    },
                  };
                });
                setOrchestratorState((prev) => ({ ...prev, isActive: false, phase: 4 }));
              } else if (evt.type === 'error') {
                throw new Error(evt.error as string);
              }
            }
          }
        } catch (err: unknown) {
          if ((err as Error).name !== 'AbortError') {
            setSessionStates((prev) => {
              const s = prev[sid] ?? DEFAULT_SESSION_STATE;
              const msgs = s.messages;
              const last = msgs[msgs.length - 1];
              const updatedMsgs =
                last?.role === 'assistant'
                  ? [
                      ...msgs.slice(0, -1),
                      { ...last, content: (err as Error).message, isStreaming: false, hasError: true },
                    ]
                  : msgs;
              return { ...prev, [sid]: { ...s, messages: updatedMsgs, isStreaming: false } };
            });
          }
        } finally {
          delete abortControllersRef.current[sid];
          if (timerIdsRef.current[sid]) {
            clearInterval(timerIdsRef.current[sid]);
            delete timerIdsRef.current[sid];
          }
          delete startTimesRef.current[sid];
          setSessionStates((prev) => {
            const s = prev[sid];
            if (!s?.isStreaming) return prev;
            return {
              ...prev,
              [sid]: { ...s, isStreaming: false, streamingPhase: 'thinking', currentTool: '', elapsed: 0 },
            };
          });
        }
        return;
      }
      // ── Fim modo orquestrador ─────────────────────────────────────────────

      try {
        const resp = await fetch(`/api/chat/sessions/${sid}/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: AUTH_HEADER },
          body: JSON.stringify({ content }),
          signal: controller.signal,
        });

        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

        const reader = resp.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const raw = line.slice(6).trim();
            if (!raw || raw === '[DONE]') continue;

            let event: Record<string, unknown>;
            try {
              event = JSON.parse(raw);
            } catch {
              continue;
            }

            const type = event.type as string;

            if (type === 'reset') {
              setSessionStates((prev) => {
                const s = prev[sid] ?? DEFAULT_SESSION_STATE;
                const msgs = s.messages;
                const last = msgs[msgs.length - 1];
                return last?.role === 'assistant'
                  ? { ...prev, [sid]: { ...s, messages: [...msgs.slice(0, -1), { ...last, content: '' }] } }
                  : prev;
              });
            } else if (type === 'text') {
              const text = event.text as string;
              setSessionStates((prev) => {
                const s = prev[sid] ?? DEFAULT_SESSION_STATE;
                const msgs = s.messages;
                const last = msgs[msgs.length - 1];
                if (last?.role !== 'assistant') return prev;
                return {
                  ...prev,
                  [sid]: {
                    ...s,
                    streamingPhase: 'writing',
                    messages: [...msgs.slice(0, -1), { ...last, content: last.content + text }],
                  },
                };
              });
            } else if (type === 'log') {
              const log = event.log as ToolLog;
              setSessionStates((prev) => {
                const s = prev[sid] ?? DEFAULT_SESSION_STATE;
                const msgs = s.messages;
                const last = msgs[msgs.length - 1];
                const patch: Partial<PerSessionState> = {};
                if (log.type === 'tool_use') {
                  patch.streamingPhase = 'tool';
                  patch.currentTool = log.name ?? '';
                }
                if (last?.role === 'assistant') {
                  patch.messages = [...msgs.slice(0, -1), { ...last, logs: [...(last.logs ?? []), log] }];
                }
                return { ...prev, [sid]: { ...s, ...patch } };
              });
            } else if (type === 'tool_progress') {
              // Atualizar status de progresso da tool em execucao
              const tool = event.tool as string;
              const status = event.status as string;
              setSessionStates((prev) => {
                const s = prev[sid] ?? DEFAULT_SESSION_STATE;
                return {
                  ...prev,
                  [sid]: {
                    ...s,
                    streamingPhase: 'tool',
                    currentTool: `${tool}: ${status}`,
                  },
                };
              });
            } else if (type === 'done') {
              setSessionStates((prev) => {
                const s = prev[sid] ?? DEFAULT_SESSION_STATE;
                const msgs = s.messages;
                const last = msgs[msgs.length - 1];
                const updatedMsgs =
                  last?.role === 'assistant'
                    ? [...msgs.slice(0, -1), { ...last, isStreaming: false }]
                    : msgs;
                return {
                  ...prev,
                  [sid]: {
                    ...s,
                    messages: updatedMsgs,
                    isStreaming: false,
                    streamingPhase: 'thinking',
                    currentTool: '',
                    elapsed: 0,
                  },
                };
              });
              setSessions((prev) =>
                prev.map((s) =>
                  s.id === sid
                    ? {
                        ...s,
                        messageCount: (s.messageCount ?? 0) + 2,
                        updatedAt: new Date().toISOString(),
                      }
                    : s
                )
              );
            } else if (type === 'error') {
              setSessionStates((prev) => {
                const s = prev[sid] ?? DEFAULT_SESSION_STATE;
                const msgs = s.messages;
                const last = msgs[msgs.length - 1];
                const updatedMsgs =
                  last?.role === 'assistant'
                    ? [
                        ...msgs.slice(0, -1),
                        {
                          ...last,
                          content: String(event.error ?? 'Erro desconhecido'),
                          isStreaming: false,
                          hasError: true,
                        },
                      ]
                    : msgs;
                return {
                  ...prev,
                  [sid]: {
                    ...s,
                    messages: updatedMsgs,
                    isStreaming: false,
                    streamingPhase: 'thinking',
                    currentTool: '',
                    elapsed: 0,
                  },
                };
              });
            }
          }
        }
      } catch (err: unknown) {
        if ((err as Error).name !== 'AbortError') {
          setSessionStates((prev) => {
            const s = prev[sid] ?? DEFAULT_SESSION_STATE;
            const msgs = s.messages;
            const last = msgs[msgs.length - 1];
            const updatedMsgs =
              last?.role === 'assistant'
                ? [
                    ...msgs.slice(0, -1),
                    {
                      ...last,
                      content: (err as Error).message ?? 'Erro ao conectar.',
                      isStreaming: false,
                      hasError: true,
                    },
                  ]
                : msgs;
            return {
              ...prev,
              [sid]: {
                ...s,
                messages: updatedMsgs,
                isStreaming: false,
                streamingPhase: 'thinking',
                currentTool: '',
                elapsed: 0,
              },
            };
          });
        }
      } finally {
        delete abortControllersRef.current[sid];
        if (timerIdsRef.current[sid]) {
          clearInterval(timerIdsRef.current[sid]);
          delete timerIdsRef.current[sid];
        }
        delete startTimesRef.current[sid];
        setSessionStates((prev) => {
          const s = prev[sid];
          if (!s?.isStreaming) return prev;
          return {
            ...prev,
            [sid]: { ...s, isStreaming: false, streamingPhase: 'thinking', currentTool: '', elapsed: 0 },
          };
        });
      }
    },
    [activeId, orchestratorMode, createSession]
  );

  return (
    <ChatContext.Provider
      value={{
        sessions,
        setSessions,
        activeId,
        setActiveId,
        loadingSessions,
        loadingSession,
        sessionsError,
        sessionStates,
        orchestratorMode,
        setOrchestratorMode,
        orchestratorState,
        setOrchestratorState,
        hasActiveStreaming,
        loadSessions,
        selectSession,
        createSession,
        deleteSession,
        clearAllSessions,
        renameSession,
        cancelStreaming,
        sendMessage,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

// ─── HOOK ────────────────────────────────────────────────────────────────────

export function useChatContext(): ChatContextValue {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error('useChatContext deve ser usado dentro de ChatProvider');
  return ctx;
}
