// Página de Chat IA — Interface Claude.ai / ChatGPT estilo
import {
  useState,
  useRef,
  useEffect,
  useCallback,
  type KeyboardEvent,
  type ChangeEvent,
} from 'react';
import {
  MessageCircle,
  Plus,
  Trash2,
  Send,
  Square,
  ChevronDown,
  ChevronRight,
  Loader2,
  AlertCircle,
  Pencil,
  Check,
  X,
} from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import {
  useChatContext,
  DEFAULT_SESSION_STATE,
  type ToolLog,
  type ChatMessage,
  type ChatSession,
  type StreamingPhase,
  type OrchestratorStep,
  type OrchestratorState,
} from '../contexts/ChatContext';

// ─── CONSTANTES ───────────────────────────────────────────────────────────────

const TOOL_ICONS: Record<string, string> = {
  Bash:      '🔨',
  Read:      '📄',
  Write:     '✍️',
  Edit:      '✏️',
  Glob:      '🔍',
  Grep:      '🔍',
  WebFetch:  '🌐',
  WebSearch: '🌐',
  Agent:     '🤖',
  Task:      '🤖',
};

function toolIcon(name?: string): string {
  if (!name) return '⚡';
  return TOOL_ICONS[name] ?? '⚡';
}

/** Extrai um label legível do input de uma ferramenta */
function toolInputLabel(name: string | undefined, input: string | undefined): string {
  if (!input) return '';
  if (name === 'Agent' || name === 'Task') {
    try {
      const parsed = JSON.parse(input);
      const label = parsed.description || parsed.prompt || '';
      return String(label).slice(0, 80) + (String(label).length > 80 ? '…' : '');
    } catch { /* não é JSON */ }
  }
  return String(input).slice(0, 60) + (String(input).length > 60 ? '…' : '');
}

// ─── UTILITÁRIOS ──────────────────────────────────────────────────────────────

/** Converte markdown básico para HTML seguro */
function renderMarkdown(text: string): string {
  if (!text) return '';

  let html = text
    .replace(/```(\w*)\n?([\s\S]*?)```/g, (_m, _lang, code) => {
      const escaped = code.replace(/</g, '&lt;').replace(/>/g, '&gt;');
      return `<pre class="md-pre"><code>${escaped}</code></pre>`;
    })
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/(?<!\*)\*(?!\*)(.*?)(?<!\*)\*(?!\*)/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code class="md-code">$1</code>')
    .replace(/\n/g, '<br />');

  return html;
}

function formatTime(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

// ─── COMPONENTE: THINKING BUBBLE ─────────────────────────────────────────────

function ThinkingBubble() {
  return (
    <div
      className="flex flex-col"
      style={{ alignItems: 'flex-start', maxWidth: '100%' }}
    >
      <span
        className="text-[10px] font-semibold uppercase tracking-wider mb-1 px-1"
        style={{ color: '#6a6a7a' }}
      >
        Claude
      </span>
      <div
        style={{
          padding: '12px 18px',
          borderRadius: '4px 18px 18px 18px',
          background: 'var(--surface)',
          border: '1px solid var(--surface-border)',
          display: 'flex',
          alignItems: 'center',
          gap: '5px',
          minHeight: '40px',
        }}
      >
        <span className="thinking-dot" />
        <span className="thinking-dot" style={{ animationDelay: '160ms' }} />
        <span className="thinking-dot" style={{ animationDelay: '320ms' }} />
      </div>
    </div>
  );
}

// ─── COMPONENTE: STATUS CHIP ──────────────────────────────────────────────────

interface StatusChipProps {
  phase: StreamingPhase;
  currentTool: string;
  elapsed: number;
}

const PHASE_CONFIG: Record<StreamingPhase, { color: string; bg: string; label: string; icon: string }> = {
  thinking: {
    color: '#f59e0b',
    bg: 'rgba(245,158,11,0.12)',
    label: 'Claude está pensando...',
    icon: '🧠',
  },
  writing: {
    color: '#22c55e',
    bg: 'rgba(34,197,94,0.12)',
    label: 'Respondendo...',
    icon: '✍️',
  },
  tool: {
    color: '#7c6aef',
    bg: 'rgba(124,106,239,0.15)',
    label: '',
    icon: '⚡',
  },
};

function StatusChip({ phase, currentTool, elapsed }: StatusChipProps) {
  const cfg = PHASE_CONFIG[phase];
  const label =
    phase === 'tool'
      ? `Usando ${currentTool || 'ferramenta'}...`
      : cfg.label;
  const elapsedStr = elapsed > 0 ? ` ${elapsed.toFixed(1)}s` : '';

  return (
    <div
      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium self-start"
      style={{
        background: cfg.bg,
        color: cfg.color,
        border: `1px solid ${cfg.color}30`,
        transition: 'all 200ms ease',
      }}
    >
      <span style={{ fontSize: '11px' }}>{cfg.icon}</span>
      <span>
        {label}
        {elapsedStr && (
          <span style={{ opacity: 0.75 }}>{elapsedStr}</span>
        )}
      </span>
    </div>
  );
}

// ─── COMPONENTE: LOG DE FERRAMENTA ───────────────────────────────────────────

interface ToolLogItemProps {
  log: ToolLog;
}

function ToolLogItem({ log }: ToolLogItemProps) {
  const [expanded, setExpanded] = useState(false);

  if (log.type === 'stderr') {
    return (
      <div
        className="flex items-start gap-2 text-xs rounded px-2 py-1"
        style={{ background: '#ef444410', color: '#ef4444', fontFamily: 'monospace' }}
      >
        <span>⚠</span>
        <span className="break-all">{log.text}</span>
      </div>
    );
  }

  return (
    <div
      className="rounded overflow-hidden"
      style={{ border: '1px solid rgba(255,255,255,0.08)' }}
    >
      <button
        onClick={() => setExpanded((p) => !p)}
        className="w-full flex items-center gap-2 px-2 py-1.5 text-left transition-colors"
        style={{ background: '#0a0a0f', color: '#9898aa' }}
      >
        <span className="text-sm">{toolIcon(log.name)}</span>
        <span className="text-xs font-mono font-semibold flex-1 truncate">
          {log.name ?? 'Tool'}
          {log.input && (
            <span className="font-normal ml-2 text-[#6a6a7a]">
              {toolInputLabel(log.name, log.input)}
            </span>
          )}
        </span>
        {expanded ? (
          <ChevronDown size={12} />
        ) : (
          <ChevronRight size={12} />
        )}
      </button>

      {expanded && (
        <div
          className="px-3 py-2 text-xs font-mono"
          style={{ background: '#080810', color: '#c0c0d0', borderTop: '1px solid rgba(255,255,255,0.06)' }}
        >
          {log.input && (
            <div className="mb-2">
              <span className="text-[#7c6aef] font-bold">Input: </span>
              <pre className="whitespace-pre-wrap break-all mt-0.5">{log.input}</pre>
            </div>
          )}
          {log.output && (
            <div>
              <span className="text-[#22c55e] font-bold">Output: </span>
              <pre className="whitespace-pre-wrap break-all mt-0.5 max-h-48 overflow-y-auto">{log.output}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── COMPONENTE: PAINEL DE LOGS ───────────────────────────────────────────────

interface LogsPanelProps {
  logs: ToolLog[];
}

function LogsPanel({ logs }: LogsPanelProps) {
  const [open, setOpen] = useState(false);

  if (!logs || logs.length === 0) return null;

  return (
    <div className="mt-2">
      <button
        onClick={() => setOpen((p) => !p)}
        className="flex items-center gap-1.5 text-xs transition-colors"
        style={{ color: '#6a6a7a' }}
      >
        {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        <span>
          {logs.length} {logs.length === 1 ? 'ferramenta usada' : 'ferramentas usadas'}
        </span>
      </button>

      {open && (
        <div className="mt-2 flex flex-col gap-1.5">
          {logs.map((log, i) => (
            <ToolLogItem key={i} log={log} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── COMPONENTE: BOLHA DE MENSAGEM ───────────────────────────────────────────

interface MessageBubbleProps {
  message: ChatMessage;
  streamingPhase?: StreamingPhase;
  currentTool?: string;
}

function MessageBubble({ message, streamingPhase, currentTool }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const showToolStrip =
    !isUser &&
    message.isStreaming &&
    streamingPhase === 'tool' &&
    currentTool;

  return (
    <div
      className="flex flex-col msg-enter"
      style={{
        alignItems: isUser ? 'flex-end' : 'flex-start',
        maxWidth: '100%',
      }}
    >
      <span
        className="text-[10px] font-semibold uppercase tracking-wider mb-1 px-1"
        style={{ color: '#6a6a7a' }}
      >
        {isUser ? 'Você' : 'Claude'}
      </span>

      <div
        style={{
          maxWidth: '80%',
          minWidth: '80px',
          padding: '10px 16px',
          borderRadius: isUser ? '18px 18px 4px 18px' : '4px 18px 18px 18px',
          background: isUser ? 'var(--accent)' : 'var(--surface)',
          border: isUser ? 'none' : '1px solid var(--surface-border)',
          color: '#f0f0f5',
          fontSize: '14px',
          lineHeight: '1.65',
          wordBreak: 'break-word',
          boxShadow: isUser ? '0 2px 8px rgba(124,106,239,0.3)' : 'none',
        }}
      >
        {showToolStrip && (
          <div
            className="flex items-center gap-2 mb-2 px-2.5 py-1.5 rounded-md text-xs"
            style={{
              background: 'rgba(124,106,239,0.15)',
              border: '1px solid rgba(124,106,239,0.25)',
              color: '#a89af5',
            }}
          >
            <Loader2 size={11} className="animate-spin shrink-0" />
            <span className="font-mono">
              {toolIcon(currentTool)} {currentTool} em execução...
            </span>
          </div>
        )}

        {message.hasError ? (
          <div className="flex items-center gap-2" style={{ color: '#ef4444' }}>
            <AlertCircle size={14} />
            <span>{message.content || 'Erro ao processar resposta.'}</span>
          </div>
        ) : (
          <div
            className="chat-content"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(message.content) }}
          />
        )}

        {message.isStreaming && message.content.length > 0 && (
          <span className="streaming-cursor" />
        )}

        {!isUser && message.logs && message.logs.length > 0 && (
          <LogsPanel logs={message.logs} />
        )}
      </div>

      <span
        className="text-[10px] mt-1 px-1"
        style={{ color: '#6a6a7a' }}
      >
        {formatTime(message.createdAt)}
      </span>
    </div>
  );
}

// ─── COMPONENTE: ITEM DE SESSÃO ───────────────────────────────────────────────

interface SessionItemProps {
  session: ChatSession;
  isActive: boolean;
  isStreaming: boolean;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onRename: (id: string, title: string) => void;
}

function SessionItem({ session, isActive, isStreaming, onSelect, onDelete, onRename }: SessionItemProps) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(session.title);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  const confirmRename = () => {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== session.title) {
      onRename(session.id, trimmed);
    }
    setEditing(false);
  };

  const cancelEdit = () => {
    setEditValue(session.title);
    setEditing(false);
  };

  return (
    <div
      className="group relative rounded-md transition-all"
      style={{
        background: isActive ? '#7c6aef15' : 'transparent',
        border: isActive ? '1px solid #7c6aef30' : '1px solid transparent',
      }}
    >
      <button
        className="w-full text-left px-3 py-2.5 pr-14 rounded-md"
        onClick={() => !editing && onSelect(session.id)}
      >
        {editing ? (
          <input
            ref={inputRef}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') confirmRename();
              if (e.key === 'Escape') cancelEdit();
            }}
            onBlur={confirmRename}
            onClick={(e) => e.stopPropagation()}
            className="w-full text-sm bg-transparent outline-none"
            style={{ color: '#f0f0f5' }}
          />
        ) : (
          <>
            <div className="flex items-center gap-1.5">
              {isStreaming && (
                <span
                  className="flex-shrink-0 w-1.5 h-1.5 rounded-full animate-pulse"
                  style={{ background: '#7c6aef' }}
                />
              )}
              <p
                className="text-sm font-medium truncate"
                style={{ color: isActive ? '#f0f0f5' : '#c0c0d0' }}
              >
                {session.title}
              </p>
            </div>
            <p className="text-[11px] mt-0.5" style={{ color: '#6a6a7a' }}>
              {isStreaming ? 'Respondendo...' : formatDate(session.updatedAt ?? session.createdAt)}
              {!isStreaming && session.messageCount != null && ` · ${session.messageCount} msgs`}
            </p>
          </>
        )}
      </button>

      <div
        className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5"
        style={{ opacity: editing ? 1 : undefined }}
      >
        {editing ? (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); confirmRename(); }}
              className="p-1 rounded transition-colors"
              style={{ color: '#22c55e' }}
              title="Confirmar"
            >
              <Check size={12} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); cancelEdit(); }}
              className="p-1 rounded transition-colors"
              style={{ color: '#ef4444' }}
              title="Cancelar"
            >
              <X size={12} />
            </button>
          </>
        ) : (
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => { e.stopPropagation(); setEditing(true); }}
              className="p-1 rounded transition-colors hover:bg-[rgba(255,255,255,0.08)]"
              style={{ color: '#9898aa' }}
              title="Renomear"
            >
              <Pencil size={11} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (window.confirm(`Deletar "${session.title}"?`)) {
                  onDelete(session.id);
                }
              }}
              className="p-1 rounded transition-colors hover:bg-[#ef444420]"
              style={{ color: '#9898aa' }}
              title="Deletar"
            >
              <Trash2 size={11} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── COMPONENTE: PAINEL DO ORQUESTRADOR ──────────────────────────────────────

function OrchestratorPanel({ state }: { state: OrchestratorState }) {
  if (!state.isActive && state.steps.length === 0) return null;

  const phaseNames = ['Ancoragem', 'Decomposição', 'Execução', 'Auditoria', 'Relatório'];
  const completedSteps = state.steps.filter(s => s.status === 'completed').length;
  const progress = state.steps.length > 0 ? (completedSteps / state.steps.length) * 100 : 0;

  return (
    <div style={{
      border: '1px solid rgba(124,106,239,0.3)',
      borderRadius: '8px',
      padding: '12px',
      marginBottom: '8px',
      background: 'rgba(124,106,239,0.05)',
    }}>
      <div className="flex items-center gap-2 mb-2">
        <span style={{ color: '#7c6aef', fontSize: '12px', fontWeight: 600 }}>
          ⚡ Orquestrador — Fase {state.phase}: {phaseNames[state.phase] ?? ''}
        </span>
        {state.steps.length > 0 && (
          <span style={{ color: '#6a6a7a', fontSize: '11px', marginLeft: 'auto' }}>
            {completedSteps}/{state.steps.length} concluídos
          </span>
        )}
      </div>

      {state.steps.length > 0 && (
        <div style={{ height: '3px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', marginBottom: '8px' }}>
          <div style={{ height: '100%', width: `${progress}%`, background: '#7c6aef', borderRadius: '2px', transition: 'width 0.3s' }} />
        </div>
      )}

      {state.steps.map((step: OrchestratorStep) => (
        <div key={step.id} className="flex items-center gap-2 py-1" style={{ fontSize: '12px' }}>
          <span>
            {step.status === 'pending' ? '⏳' :
             step.status === 'running' ? '⚡' :
             step.status === 'completed' ? '✅' : '❌'}
          </span>
          <span style={{
            color: step.status === 'running' ? '#7c6aef' :
                   step.status === 'completed' ? '#22c55e' :
                   step.status === 'failed' ? '#ef4444' : '#6a6a7a',
            fontWeight: step.status === 'running' ? 600 : 400,
          }}>
            {step.name}
          </span>
          <span style={{ color: '#4a4a5a', fontSize: '11px' }}>
            [{step.agent}]
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── COMPONENTE PRINCIPAL: CHATPAGE ──────────────────────────────────────────

export function ChatPage() {
  const location = useLocation();

  // Estado global do chat — persiste entre navegações
  const {
    sessions,
    activeId,
    setActiveId: _setActiveId,
    loadingSessions,
    loadingSession,
    sessionsError,
    sessionStates,
    orchestratorMode,
    setOrchestratorMode,
    orchestratorState,
    loadSessions,
    selectSession,
    createSession,
    deleteSession,
    renameSession,
    cancelStreaming,
    clearAllSessions,
    sendMessage,
  } = useChatContext();

  // Estado local da UI (não precisa persistir entre navegações)
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // ── Estado derivado da sessão ativa
  const activeState = activeId ? (sessionStates[activeId] ?? DEFAULT_SESSION_STATE) : null;
  const messages = activeState?.messages ?? [];
  const isStreaming = activeState?.isStreaming ?? false;
  const streamingPhase = activeState?.streamingPhase ?? 'thinking';
  const currentTool = activeState?.currentTool ?? '';
  const elapsed = activeState?.elapsed ?? 0;

  // ── Auto-enviar se veio de "Executar prompt" (Prompt Manager)
  useEffect(() => {
    const state = location.state as { initialMessage?: string; autoSend?: boolean } | null;
    if (state?.initialMessage) {
      const msg = state.initialMessage;
      const shouldAutoSend = state.autoSend !== false; // auto-send por padrão
      window.history.replaceState({}, document.title);

      if (shouldAutoSend) {
        // Enviar automaticamente após breve delay para garantir que o componente está montado
        setTimeout(() => {
          sendMessage(msg, activeId ?? undefined);
        }, 300);
      } else {
        // Apenas preencher o campo
        setInput(msg);
        setTimeout(() => textareaRef.current?.focus(), 200);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Auto-scroll
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // ── Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${Math.min(ta.scrollHeight, 120)}px`;
  }, [input]);

  // ── Enviar — delega ao contexto (que persiste a stream mesmo se navegar)
  const handleSend = useCallback(async () => {
    const content = input.trim();
    if (!content) return;
    setInput('');
    await sendMessage(content, activeId ?? undefined);
  }, [input, activeId, sendMessage]);

  // ── Keyboard handler
  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  const handleInputChange = useCallback((e: ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
  }, []);

  // ── ThinkingBubble
  const lastMessage = messages[messages.length - 1];
  const showThinkingBubble =
    isStreaming &&
    lastMessage?.role === 'assistant' &&
    lastMessage.content.length === 0 &&
    (lastMessage.logs?.length ?? 0) === 0;

  // ─── RENDER ───────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full page-root" style={{ gap: 0 }}>
      {/* ── HEADER DA PÁGINA ─────────────────────────────────────────────── */}
      <div style={{ marginBottom: 'var(--space-lg)' }}>
        <PageHeader
          title="Chat IA"
          description="Converse com o Claude diretamente pelo seu ecossistema"
        />
      </div>

      {/* ── CORPO DO CHAT ────────────────────────────────────────────────── */}
      <div
        className="flex flex-1 min-h-0 rounded-lg overflow-hidden"
        style={{ border: '1px solid var(--surface-border)' }}
      >
      {/* ── SIDEBAR DE SESSÕES ──────────────────────────────────────────────── */}
      <aside
        style={{
          width: '220px',
          minWidth: '220px',
          background: 'var(--bg-secondary)',
          borderRight: '1px solid var(--surface-border)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <div
          className="flex items-center gap-2 px-3 py-3"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}
        >
          <MessageCircle size={16} style={{ color: '#7c6aef' }} />
          <span className="text-sm font-semibold" style={{ color: '#f0f0f5' }}>
            Chat IA
          </span>
        </div>

        <div className="px-2 py-2 flex flex-col gap-1.5">
          <button
            onClick={createSession}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-all hover:opacity-90"
            style={{ background: '#7c6aef', color: '#ffffff' }}
          >
            <Plus size={14} />
            Nova Conversa
          </button>
          {sessions.length > 0 && (
            <button
              onClick={() => {
                if (window.confirm('Apagar todas as conversas? Esta ação não pode ser desfeita.')) {
                  clearAllSessions();
                }
              }}
              className="w-full flex items-center justify-center gap-2 py-1.5 rounded-md text-xs font-medium transition-all hover:opacity-80"
              style={{ background: 'transparent', color: '#6a6a7a', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <Trash2 size={12} />
              Limpar tudo
            </button>
          )}
        </div>

        <div
          className="flex-1 overflow-y-auto px-2 pb-3"
          style={{ gap: '2px', display: 'flex', flexDirection: 'column' }}
        >
          {loadingSessions ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={20} className="animate-spin" style={{ color: '#7c6aef' }} />
            </div>
          ) : sessionsError ? (
            <div className="px-2 py-4 text-center">
              <p className="text-xs" style={{ color: '#ef4444' }}>{sessionsError}</p>
              <button
                onClick={loadSessions}
                className="mt-2 text-xs underline"
                style={{ color: '#7c6aef' }}
              >
                Tentar novamente
              </button>
            </div>
          ) : sessions.length === 0 ? (
            <div className="px-2 py-6 text-center">
              <p className="text-xs" style={{ color: '#6a6a7a' }}>
                Nenhuma conversa ainda.
              </p>
            </div>
          ) : (
            sessions.map((session) => (
              <SessionItem
                key={session.id}
                session={session}
                isActive={session.id === activeId}
                isStreaming={!!sessionStates[session.id]?.isStreaming}
                onSelect={selectSession}
                onDelete={deleteSession}
                onRename={renameSession}
              />
            ))
          )}
        </div>
      </aside>

      {/* ── ÁREA PRINCIPAL ─────────────────────────────────────────────────── */}
      <main
        className="flex flex-col flex-1"
        style={{ minWidth: 0, overflow: 'hidden', background: 'var(--bg-primary)' }}
      >
        {activeId === null ? (
          <div
            className="flex-1 flex flex-col items-center justify-center gap-4"
            style={{ color: 'var(--text-muted)' }}
          >
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{ background: '#7c6aef20', border: '1px solid #7c6aef40' }}
            >
              <MessageCircle size={28} style={{ color: '#7c6aef' }} />
            </div>
            <div className="text-center">
              <p className="text-base font-medium" style={{ color: '#c0c0d0' }}>
                Inicie uma conversa com o Claude
              </p>
              <p className="text-sm mt-1">
                Selecione uma sessão ou crie uma nova.
              </p>
            </div>
            <button
              onClick={createSession}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-opacity hover:opacity-90"
              style={{ background: '#7c6aef', color: '#ffffff' }}
            >
              <Plus size={16} />
              Nova Conversa
            </button>
          </div>
        ) : (
          <>
            {/* ── MENSAGENS ──────────────────────────────────────────────── */}
            <div
              className="flex-1 overflow-y-auto"
              style={{ padding: '24px 32px', display: 'flex', flexDirection: 'column' }}
            >
              {loadingSession ? (
                <div className="flex items-center justify-center h-full">
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 size={28} className="animate-spin" style={{ color: '#7c6aef' }} />
                    <p className="text-sm" style={{ color: '#9898aa' }}>Carregando conversa...</p>
                  </div>
                </div>
              ) : messages.length === 0 && !isStreaming ? (
                <div
                  className="flex flex-col items-center justify-center h-full gap-3"
                  style={{ color: '#6a6a7a' }}
                >
                  <MessageCircle size={32} style={{ color: '#7c6aef', opacity: 0.4 }} />
                  <p className="text-sm">Envie uma mensagem para começar.</p>
                </div>
              ) : (
                <>
                  <div className="flex-1" />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {messages.map((msg, i) => {
                      if (showThinkingBubble && i === messages.length - 1) return null;
                      return (
                        <MessageBubble
                          key={i}
                          message={msg}
                          streamingPhase={streamingPhase}
                          currentTool={currentTool}
                        />
                      );
                    })}

                    {showThinkingBubble && <ThinkingBubble />}
                  </div>
                </>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* ── INPUT AREA ─────────────────────────────────────────────── */}
            <div
              style={{
                padding: '12px 24px 16px',
                borderTop: '1px solid var(--surface-border)',
                background: 'var(--bg-secondary)',
              }}
            >
              {(orchestratorState.isActive || orchestratorState.steps.length > 0) && (
                <OrchestratorPanel state={orchestratorState} />
              )}

              {isStreaming && (
                <div className="mb-2">
                  <StatusChip
                    phase={streamingPhase}
                    currentTool={currentTool}
                    elapsed={elapsed}
                  />
                </div>
              )}

              <div
                className="flex items-end gap-2 rounded-xl"
                style={{
                  background: '#16161f',
                  border: '1px solid rgba(255,255,255,0.12)',
                  padding: '10px 12px',
                }}
              >
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  placeholder={isStreaming ? 'Aguardando resposta...' : 'Mensagem (Enter para enviar, Shift+Enter para nova linha)'}
                  disabled={isStreaming}
                  rows={1}
                  className="flex-1 resize-none outline-none text-sm leading-relaxed bg-transparent"
                  style={{
                    color: '#f0f0f5',
                    minHeight: '24px',
                    maxHeight: '120px',
                    overflow: 'auto',
                    caretColor: '#7c6aef',
                  }}
                />

                {!isStreaming && (
                  <button
                    onClick={() => setOrchestratorMode((prev) => !prev)}
                    title={orchestratorMode ? 'Desativar Orquestrador' : 'Ativar Orquestrador (multiplos agentes)'}
                    style={{
                      padding: '6px 10px',
                      borderRadius: '6px',
                      border: orchestratorMode ? '1px solid #7c6aef' : '1px solid rgba(255,255,255,0.12)',
                      background: orchestratorMode ? 'rgba(124,106,239,0.2)' : 'transparent',
                      color: orchestratorMode ? '#7c6aef' : '#6a6a7a',
                      fontSize: '12px',
                      cursor: 'pointer',
                      fontWeight: orchestratorMode ? 600 : 400,
                      transition: 'all 0.2s',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    ⚡ {orchestratorMode ? 'Orquestrador ON' : 'Orquestrador'}
                  </button>
                )}

                {isStreaming ? (
                  <button
                    onClick={() => cancelStreaming(activeId ?? undefined)}
                    className="p-2 rounded-lg transition-all hover:opacity-80 shrink-0"
                    style={{ background: '#ef444420', color: '#ef4444', border: '1px solid #ef444440' }}
                    title="Cancelar"
                  >
                    <Square size={16} />
                  </button>
                ) : (
                  <button
                    onClick={handleSend}
                    disabled={!input.trim()}
                    className="p-2 rounded-lg transition-all shrink-0 disabled:opacity-30"
                    style={{ background: '#7c6aef', color: '#ffffff' }}
                    title="Enviar (Enter)"
                  >
                    <Send size={16} />
                  </button>
                )}
              </div>

              <p className="text-[11px] text-center mt-2" style={{ color: '#6a6a7a' }}>
                Claude pode cometer erros. Verifique informações importantes.
              </p>
            </div>
          </>
        )}
      </main>

      </div>{/* fim .flex.flex-1.min-h-0 */}

      {/* ── ESTILOS INLINE ─────────────────────────────────────────────────── */}
      <style>{`
        /* ── Markdown ─────────────────────────────────────────── */
        .chat-content strong { font-weight: 700; }
        .chat-content em { font-style: italic; }
        .chat-content .md-code {
          font-family: 'JetBrains Mono', monospace;
          font-size: 12px;
          background: rgba(124, 106, 239, 0.15);
          color: #c0b5ff;
          padding: 1px 5px;
          border-radius: 4px;
        }
        .chat-content .md-pre {
          margin: 10px 0;
          padding: 12px;
          border-radius: 8px;
          background: #080810;
          border: 1px solid rgba(255,255,255,0.08);
          overflow-x: auto;
          font-family: 'JetBrains Mono', monospace;
          font-size: 12px;
          color: #c0c0d0;
          line-height: 1.6;
        }
        .chat-content .md-pre code {
          background: none;
          color: inherit;
          padding: 0;
          font-size: inherit;
        }

        /* ── Animação de entrada das mensagens ────────────────── */
        @keyframes msgSlideIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .msg-enter {
          animation: msgSlideIn 200ms ease-out both;
        }

        /* ── Cursor de streaming — bloco roxo piscante ────────── */
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0; }
        }
        .streaming-cursor {
          display: inline-block;
          width: 8px;
          height: 14px;
          background: #7c6aef;
          border-radius: 1px;
          margin-left: 2px;
          vertical-align: text-bottom;
          animation: blink 1s step-end infinite;
        }

        /* ── ThinkingBubble — dots pulsantes ─────────────────── */
        @keyframes thinkingBounce {
          0%, 100% { transform: translateY(0);    opacity: 0.4; }
          50%       { transform: translateY(-4px); opacity: 1;   }
        }
        .thinking-dot {
          display: inline-block;
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #9898aa;
          animation: thinkingBounce 1s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
