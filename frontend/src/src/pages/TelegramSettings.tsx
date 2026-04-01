// Página de configuração e controle do Telegram Bot
import { useState, useEffect } from 'react';
import {
  Bot,
  Power,
  PowerOff,
  Send,
  Eye,
  EyeOff,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  Bell,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { PageHeader, SectionLabel } from '../components/PageHeader';
import {
  useTelegramStatus,
  useTelegramConfig,
  useUpdateTelegramConfig,
  useStartTelegramBot,
  useStopTelegramBot,
  useSendTelegramMessage,
} from '../api/ecosystem-hooks';
import { useToast } from '../contexts/ToastContext';

function formatUptime(ms: number): string {
  if (!ms || ms <= 0) return '0s';
  const sec = Math.floor(ms / 1000);
  if (sec < 60) return `${sec}s`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ${sec % 60}s`;
  const hr = Math.floor(min / 60);
  return `${hr}h ${min % 60}m`;
}

const EVENT_OPTIONS = [
  { value: 'execution:completed', label: 'Tarefa concluída com sucesso' },
  { value: 'execution:failed', label: 'Tarefa falhou' },
  { value: 'task:created', label: 'Nova tarefa criada' },
];

export function TelegramSettings() {
  const { showToast } = useToast();

  const { data: status, isLoading: statusLoading } = useTelegramStatus();
  const { data: config, isLoading: configLoading } = useTelegramConfig();

  const updateConfig = useUpdateTelegramConfig();
  const startBot = useStartTelegramBot();
  const stopBot = useStopTelegramBot();
  const sendMessage = useSendTelegramMessage();

  const [token, setToken] = useState('');
  const [chatId, setChatId] = useState('');
  const [botName, setBotName] = useState('');
  const [events, setEvents] = useState<string[]>([]);
  const [showToken, setShowToken] = useState(false);
  const [testMessage, setTestMessage] = useState('');
  const [hasChanges, setHasChanges] = useState(false);

  // Carregar config quando disponível
  useEffect(() => {
    if (config) {
      setToken(config.token || '');
      setChatId(config.chatId || '');
      setBotName(config.botName || '');
      setEvents(config.events || []);
      setHasChanges(false);
    }
  }, [config]);

  function handleFieldChange(setter: (v: string) => void, value: string) {
    setter(value);
    setHasChanges(true);
  }

  function toggleEvent(event: string) {
    setEvents((prev) => {
      const updated = prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event];
      setHasChanges(true);
      return updated;
    });
  }

  async function handleSaveConfig() {
    try {
      const payload: Record<string, unknown> = { chatId, botName, events };
      // Apenas enviar token se foi alterado (não é masked)
      if (token && !token.includes('...')) {
        payload.token = token;
      }
      await updateConfig.mutateAsync(payload);
      showToast('Configuração salva!', 'success');
      setHasChanges(false);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Erro ao salvar', 'error');
    }
  }

  async function handleStart() {
    try {
      const payload: { token?: string } = {};
      if (token && !token.includes('...')) {
        payload.token = token;
      }
      await startBot.mutateAsync(payload);
      showToast('Bot iniciado!', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Erro ao iniciar bot', 'error');
    }
  }

  async function handleStop() {
    try {
      await stopBot.mutateAsync();
      showToast('Bot parado', 'info');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Erro ao parar bot', 'error');
    }
  }

  async function handleSendTest() {
    if (!testMessage.trim()) return;
    try {
      await sendMessage.mutateAsync({ message: testMessage.trim() });
      showToast('Mensagem enviada!', 'success');
      setTestMessage('');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Erro ao enviar', 'error');
    }
  }

  const isRunning = status?.isRunning ?? false;
  const isLoading = statusLoading || configLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 gap-3">
        <Loader2 size={24} className="animate-spin text-[#7c6aef]" />
        <span className="text-[#9898aa] text-sm">Carregando configurações do Telegram...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col" style={{ gap: 'var(--space-xl)' }}>
      {/* Header */}
      <PageHeader
        title="Telegram Bot"
        description="Configure e controle o bot do Telegram para receber notificações e gerenciar tarefas"
        breadcrumb={[{ label: 'Home', to: '/' }, { label: 'Telegram Bot' }]}
      />

      {/* Status Card */}
      <div
        className="rounded-lg border p-5 flex items-center gap-4"
        style={{
          background: '#16161f',
          borderColor: isRunning ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.08)',
        }}
      >
        <div
          className="w-12 h-12 rounded-md flex items-center justify-center shrink-0"
          style={{
            background: isRunning ? 'rgba(34,197,94,0.1)' : 'rgba(255,255,255,0.04)',
            border: `1px solid ${isRunning ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.08)'}`,
          }}
        >
          <Bot size={22} style={{ color: isRunning ? '#22c55e' : '#6a6a7a' }} />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            {isRunning ? (
              <CheckCircle size={14} className="text-green-400" />
            ) : (
              <XCircle size={14} className="text-[#6a6a7a]" />
            )}
            <span className={`text-sm font-semibold ${isRunning ? 'text-green-400' : 'text-[#6a6a7a]'}`}>
              {isRunning ? 'Online' : 'Offline'}
            </span>
          </div>
          {isRunning && status?.uptime ? (
            <div className="flex items-center gap-1 mt-1 text-xs text-[#9898aa]">
              <Clock size={11} />
              <span>Uptime: {formatUptime(status.uptime)}</span>
              {status.startedAt && (
                <span className="ml-2">
                  Iniciado: {new Date(status.startedAt).toLocaleString('pt-BR')}
                </span>
              )}
            </div>
          ) : (
            <p className="text-xs text-[#6a6a7a] mt-1">
              Configure o token e inicie o bot
            </p>
          )}
        </div>
        <div className="flex gap-2 shrink-0">
          {isRunning ? (
            <button
              onClick={handleStop}
              disabled={stopBot.isPending}
              className="flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium text-red-400 border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 transition-colors disabled:opacity-50"
            >
              {stopBot.isPending ? <Loader2 size={14} className="animate-spin" /> : <PowerOff size={14} />}
              Parar
            </button>
          ) : (
            <button
              onClick={handleStart}
              disabled={startBot.isPending || (!token || token.includes('...'))}
              className="flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium text-green-400 border border-green-500/30 bg-green-500/10 hover:bg-green-500/20 transition-colors disabled:opacity-50"
            >
              {startBot.isPending ? <Loader2 size={14} className="animate-spin" /> : <Power size={14} />}
              Iniciar
            </button>
          )}
        </div>
      </div>

      {/* Configuração */}
      <div className="rounded-lg border border-[rgba(255,255,255,0.08)] p-5" style={{ background: '#16161f' }}>
        <SectionLabel>Configuração</SectionLabel>

        <div className="flex flex-col gap-4">
          {/* Token */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-[#9898aa]">Bot Token (BotFather)</label>
            <div className="relative">
              <input
                type={showToken ? 'text' : 'password'}
                value={token}
                onChange={(e) => handleFieldChange(setToken, e.target.value)}
                placeholder="123456789:ABCdefGhIjKlmNoPqRsTuVwXyZ..."
                className="w-full px-3 py-2.5 pr-10 bg-[#0a0a0f] border border-[rgba(255,255,255,0.08)] rounded-md text-sm text-[#f0f0f5] placeholder-[#6a6a7a] focus:outline-none focus:border-[#7c6aef]/60 transition-colors font-mono"
              />
              <button
                type="button"
                onClick={() => setShowToken((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-[#6a6a7a] hover:text-[#9898aa] transition-colors"
                aria-label={showToken ? 'Ocultar token' : 'Mostrar token'}
              >
                {showToken ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
            <p className="text-xs text-[#6a6a7a]">
              Obtenha em{' '}
              <a
                href="https://t.me/BotFather"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#9080f5] hover:underline"
              >
                @BotFather
              </a>
            </p>
          </div>

          {/* Chat ID */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-[#9898aa]">Chat ID Autorizado</label>
            <input
              type="text"
              value={chatId}
              onChange={(e) => handleFieldChange(setChatId, e.target.value)}
              placeholder="Seu Chat ID numérico"
              className="px-3 py-2.5 bg-[#0a0a0f] border border-[rgba(255,255,255,0.08)] rounded-md text-sm text-[#f0f0f5] placeholder-[#6a6a7a] focus:outline-none focus:border-[#7c6aef]/60 transition-colors font-mono"
            />
            <p className="text-xs text-[#6a6a7a]">
              Use{' '}
              <a
                href="https://t.me/userinfobot"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#9080f5] hover:underline"
              >
                @userinfobot
              </a>
              {' '}para descobrir seu ID
            </p>
          </div>

          {/* Bot Name */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-[#9898aa]">Nome do Bot (opcional)</label>
            <input
              type="text"
              value={botName}
              onChange={(e) => handleFieldChange(setBotName, e.target.value)}
              placeholder="Ex: Claude Ecosystem Bot"
              className="px-3 py-2.5 bg-[#0a0a0f] border border-[rgba(255,255,255,0.08)] rounded-md text-sm text-[#f0f0f5] placeholder-[#6a6a7a] focus:outline-none focus:border-[#7c6aef]/60 transition-colors"
            />
          </div>

          {/* Eventos de Notificação */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-medium text-[#9898aa] flex items-center gap-1.5">
              <Bell size={12} />
              Eventos de Notificação
            </label>
            <div className="flex flex-col gap-2">
              {EVENT_OPTIONS.map(({ value, label }) => (
                <label
                  key={value}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-md cursor-pointer hover:bg-[rgba(255,255,255,0.02)] transition-colors"
                  style={{ background: '#0a0a0f', border: '1px solid rgba(255,255,255,0.08)' }}
                >
                  <input
                    type="checkbox"
                    checked={events.includes(value)}
                    onChange={() => toggleEvent(value)}
                    className="w-4 h-4 rounded accent-[#7c6aef]"
                  />
                  <span className="text-sm text-[#f0f0f5]">{label}</span>
                  <span className="text-xs text-[#6a6a7a] font-mono ml-auto">{value}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Botão Salvar */}
          <div className="flex justify-end pt-2">
            <button
              onClick={handleSaveConfig}
              disabled={updateConfig.isPending || !hasChanges}
              className="flex items-center gap-2 px-5 py-2.5 rounded-md text-sm font-medium text-white transition-all disabled:opacity-50"
              style={{ background: hasChanges ? 'var(--accent)' : 'rgba(255,255,255,0.08)' }}
            >
              {updateConfig.isPending ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <RefreshCw size={14} />
              )}
              Salvar Configuração
            </button>
          </div>
        </div>
      </div>

      {/* Mensagem de Teste */}
      {isRunning && (
        <div className="rounded-lg border border-[rgba(255,255,255,0.08)] p-5" style={{ background: '#16161f' }}>
          <SectionLabel>Enviar Mensagem de Teste</SectionLabel>
          <div className="flex gap-2">
            <input
              type="text"
              value={testMessage}
              onChange={(e) => setTestMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSendTest();
              }}
              placeholder="Digite uma mensagem para testar..."
              className="flex-1 px-3 py-2.5 bg-[#0a0a0f] border border-[rgba(255,255,255,0.08)] rounded-md text-sm text-[#f0f0f5] placeholder-[#6a6a7a] focus:outline-none focus:border-[#7c6aef]/60 transition-colors"
            />
            <button
              onClick={handleSendTest}
              disabled={!testMessage.trim() || sendMessage.isPending}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-md text-sm font-medium text-white transition-colors disabled:opacity-50"
              style={{ background: 'var(--accent)' }}
            >
              {sendMessage.isPending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              Enviar
            </button>
          </div>
          {sendMessage.isSuccess && (
            <p className="text-xs text-green-400 mt-2 flex items-center gap-1">
              <CheckCircle size={12} /> Mensagem enviada para os usuários autorizados
            </p>
          )}
        </div>
      )}

      {/* Info Card */}
      <div
        className="rounded-lg border border-[rgba(255,255,255,0.08)] p-4"
        style={{ background: '#0a0a0f' }}
      >
        <div className="flex items-start gap-2.5">
          <AlertCircle size={14} className="text-[#9080f5] shrink-0 mt-0.5" />
          <div className="text-xs text-[#6a6a7a] leading-relaxed">
            <p className="font-medium text-[#9898aa] mb-1">Como funciona:</p>
            <ul className="flex flex-col gap-1 list-disc pl-4">
              <li>O bot usa <strong>polling</strong> — não precisa expor portas</li>
              <li>O primeiro usuário que enviar /start será auto-autorizado</li>
              <li>Comandos disponíveis: /menu, /status, /tasks, /prompts, /kb</li>
              <li>Responda a resultados de tarefas para continuar a conversa com o Claude</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
