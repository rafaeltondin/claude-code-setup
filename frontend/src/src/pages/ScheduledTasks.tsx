// Tarefas Agendadas — Agendar prompts para execucao automatica via Claude Code
import { useState, useEffect, useCallback } from 'react';
import {
  CalendarClock,
  Clock,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Loader2,
  Plus,
  Trash2,
  X,
  Zap,
  ToggleLeft,
  ToggleRight,
  Terminal,
  History,
  Play,
  Send,
  Monitor,
  Cpu,
  Copy,
  Check,
} from 'lucide-react';
import { PageHeader, SectionLabel } from '../components/PageHeader';

const API = '/api/scheduled-tasks';
const token = () => localStorage.getItem('auth_token') || 'local-dev-token';
const hdrs = () => ({ Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' });

interface Task {
  id: string;
  title: string;
  prompt: string;
  cronExpression: string;
  enabled: boolean;
  mode: 'background' | 'interactive';
  createdAt: string;
  lastRun: string | null;
  runCount: number;
  status: string;
  cronRunning?: boolean;
}

interface HistoryEntry {
  id: string;
  taskId: string | null;
  taskTitle: string;
  prompt: string;
  source: string;
  mode: 'background' | 'interactive';
  chatId?: string;
  status: 'running' | 'completed' | 'failed' | 'launched';
  output: string | null;
  error: string | null;
  duration: number | null;
  timestamp: string;
}

interface StatusData {
  totalTasks: number;
  activeTasks: number;
  cronJobsRunning: number;
  totalExecutions: number;
  runningNow: number;
  timezone: string;
}

function formatDuration(ms: number | null) {
  if (!ms) return '-';
  if (ms < 60000) return `${Math.round(ms / 1000)}s`;
  return `${Math.round(ms / 60000)}min`;
}

// ─── KPI CARD ───────────────────────────────────────────────────────────────

function KpiCard({ title, value, subtitle, icon: Icon, color }: {
  title: string; value: string | number; subtitle?: string; icon: typeof Terminal; color: string;
}) {
  return (
    <div
      className="rounded-lg border border-[rgba(255,255,255,0.08)] p-5 flex items-start gap-4"
      style={{ background: '#16161f' }}
    >
      <div
        className="w-10 h-10 rounded-md flex items-center justify-center shrink-0"
        style={{ background: `${color}20`, border: `1px solid ${color}40` }}
      >
        <Icon size={18} style={{ color }} />
      </div>
      <div className="min-w-0">
        <p className="text-[12px] font-medium text-[#9898aa] uppercase tracking-wide mb-0.5">{title}</p>
        <p className="text-2xl font-bold text-[#f0f0f5]" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
          {value}
        </p>
        {subtitle && <p className="text-xs text-[#6a6a7a] mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}

// ─── MODE TOGGLE ────────────────────────────────────────────────────────────

function ModeToggle({ mode, onChange }: { mode: string; onChange: (m: 'background' | 'interactive') => void }) {
  return (
    <div className="flex gap-1.5">
      <button
        onClick={() => onChange('background')}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-medium transition-colors border-none cursor-pointer"
        style={{
          background: mode === 'background' ? 'rgba(124,106,239,0.2)' : 'rgba(255,255,255,0.04)',
          color: mode === 'background' ? '#a78bfa' : '#9898aa',
          border: mode === 'background' ? '1px solid rgba(124,106,239,0.3)' : '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <Cpu size={10} /> Background
      </button>
      <button
        onClick={() => onChange('interactive')}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-medium transition-colors border-none cursor-pointer"
        style={{
          background: mode === 'interactive' ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.04)',
          color: mode === 'interactive' ? '#22c55e' : '#9898aa',
          border: mode === 'interactive' ? '1px solid rgba(34,197,94,0.3)' : '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <Monitor size={10} /> Terminal
      </button>
    </div>
  );
}

// ─── TASK CARD ──────────────────────────────────────────────────────────────

function TaskCard({ task, onRun, onToggle, onRemove, running }: {
  task: Task;
  onRun: () => void;
  onToggle: () => void;
  onRemove: () => void;
  running: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const isBg = task.mode === 'background';

  return (
    <div
      className="rounded-lg border border-[rgba(255,255,255,0.08)]"
      style={{ background: '#16161f', marginBottom: 8, padding: 14 }}
    >
      <div className="flex items-center gap-2.5">
        <button
          onClick={() => setExpanded(!expanded)}
          className="p-0 bg-transparent border-none cursor-pointer"
        >
          {expanded
            ? <ChevronDown size={14} className="text-[#6a6a7a]" />
            : <ChevronRight size={14} className="text-[#6a6a7a]" />
          }
        </button>
        {isBg
          ? <Cpu size={16} style={{ color: task.enabled ? '#a78bfa' : '#6a6a7a', flexShrink: 0 }} />
          : <Terminal size={16} style={{ color: task.enabled ? '#22c55e' : '#6a6a7a', flexShrink: 0 }} />
        }
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold text-[#f0f0f5] truncate">
            {task.title}
          </p>
          <div className="flex gap-3 text-[11px] text-[#6a6a7a] mt-0.5">
            <span className="flex items-center gap-1">
              <Clock size={10} /> {task.cronExpression}
            </span>
            <span
              className="px-1.5 py-0 rounded text-[10px] font-bold uppercase"
              style={{
                color: isBg ? '#a78bfa' : '#22c55e',
                background: isBg ? 'rgba(167,139,250,0.1)' : 'rgba(34,197,94,0.1)'
              }}
            >
              {isBg ? 'BG' : 'Terminal'}
            </span>
            {task.runCount > 0 && (
              <span className="flex items-center gap-1">
                <Play size={10} /> {task.runCount}x
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={onToggle}
            className="p-1.5 rounded-md transition-colors hover:bg-[rgba(255,255,255,0.06)] bg-transparent border-none cursor-pointer"
            title={task.enabled ? 'Desativar' : 'Ativar'}
          >
            {task.enabled
              ? <ToggleRight size={18} style={{ color: '#22c55e' }} />
              : <ToggleLeft size={18} style={{ color: '#6a6a7a' }} />
            }
          </button>
          <button
            onClick={onRun}
            disabled={running}
            className="p-1.5 rounded-md transition-colors hover:bg-[rgba(59,130,246,0.15)] bg-transparent border-none cursor-pointer disabled:opacity-50"
            title="Executar agora"
          >
            {running
              ? <Loader2 size={16} className="animate-spin" style={{ color: '#3b82f6' }} />
              : <Zap size={16} style={{ color: '#3b82f6' }} />
            }
          </button>
          <button
            onClick={onRemove}
            className="p-1.5 rounded-md transition-colors hover:bg-[rgba(239,68,68,0.15)] bg-transparent border-none cursor-pointer"
            title="Remover"
          >
            <Trash2 size={14} style={{ color: '#ef4444' }} />
          </button>
        </div>
      </div>

      {expanded && (
        <div
          className="rounded-md text-[12px] text-[#9898aa] mt-3"
          style={{ marginLeft: 32, padding: '10px 14px', background: '#0a0a0f', border: '1px solid rgba(255,255,255,0.05)' }}
        >
          <p className="font-semibold text-[#f0f0f5] mb-1.5">Prompt:</p>
          <p className="mb-2 whitespace-pre-wrap font-mono text-[11px] leading-relaxed">{task.prompt}</p>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-[#6a6a7a] mt-2 pt-2 border-t border-[rgba(255,255,255,0.05)]">
            <span>Criado: {task.createdAt ? (() => { const d = new Date(task.createdAt); return isNaN(d.getTime()) ? task.createdAt : d.toLocaleString('pt-BR'); })() : '-'}</span>
            {task.lastRun && <span>Ultima: {(() => { const d = new Date(task.lastRun!); return isNaN(d.getTime()) ? task.lastRun : d.toLocaleString('pt-BR'); })()}</span>}
            <span>Modo: {task.mode === 'background' ? 'Background (captura output)' : 'Terminal (interativo)'}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── HISTORY CARD (COM OUTPUT) ──────────────────────────────────────────────

function HistoryCard({ entry }: { entry: HistoryEntry }) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const statusColor: Record<string, string> = {
    completed: '#22c55e',
    launched: '#3b82f6',
    running: '#f59e0b',
    failed: '#ef4444',
  };
  const statusLabel: Record<string, string> = {
    completed: 'Concluido',
    launched: 'Terminal',
    running: 'Rodando',
    failed: 'Falha',
  };

  const color = statusColor[entry.status] || '#6a6a7a';
  const label = statusLabel[entry.status] || entry.status;
  const isTelegram = entry.source === 'telegram';
  const hasOutput = !!entry.output;

  const copyOutput = () => {
    if (entry.output) {
      navigator.clipboard.writeText(entry.output);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div
      className="rounded-lg border border-[rgba(255,255,255,0.08)]"
      style={{ background: '#16161f', marginBottom: 6, padding: 12 }}
    >
      <div onClick={() => setExpanded(!expanded)} className="flex items-center gap-2.5 cursor-pointer">
        {expanded ? <ChevronDown size={12} className="text-[#6a6a7a]" /> : <ChevronRight size={12} className="text-[#6a6a7a]" />}
        <div className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
        {entry.status === 'running' && (
          <Loader2 size={12} className="animate-spin shrink-0" style={{ color: '#f59e0b' }} />
        )}
        <div className="flex-1 min-w-0">
          <p className="text-[12px] font-medium text-[#f0f0f5] truncate">
            {entry.taskTitle}
          </p>
          <div className="flex gap-2 text-[10px] text-[#6a6a7a]">
            <span>{entry.timestamp ? (() => { const d = new Date(entry.timestamp); return isNaN(d.getTime()) ? entry.timestamp : d.toLocaleString('pt-BR'); })() : '-'}</span>
            {entry.duration != null && <span>{formatDuration(entry.duration)}</span>}
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {isTelegram && (
            <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded"
              style={{ color: '#0088cc', background: 'rgba(0,136,204,0.12)' }}>
              Telegram
            </span>
          )}
          {hasOutput && (
            <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded"
              style={{ color: '#a78bfa', background: 'rgba(167,139,250,0.12)' }}>
              Output
            </span>
          )}
          <span
            className="text-[9px] font-bold uppercase px-2 py-0.5 rounded"
            style={{ color, background: `${color}18` }}
          >
            {label}
          </span>
        </div>
      </div>

      {expanded && (
        <div className="mt-2" style={{ marginLeft: 22 }}>
          {/* Prompt */}
          <div
            className="rounded-md text-[11px] text-[#6a6a7a] mb-2"
            style={{ padding: '6px 10px', background: '#0a0a0f', border: '1px solid rgba(255,255,255,0.05)' }}
          >
            <p className="text-[10px] font-bold text-[#6a6a7a] uppercase mb-1">Prompt</p>
            <p className="font-mono whitespace-pre-wrap leading-relaxed">{entry.prompt.slice(0, 300)}{entry.prompt.length > 300 ? '...' : ''}</p>
          </div>

          {/* Output */}
          {entry.output && (
            <div
              className="rounded-md text-[11px] text-[#d4d4d8] mb-2 relative"
              style={{ padding: '8px 12px', background: '#0a0a0f', border: '1px solid rgba(34,197,94,0.15)' }}
            >
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-[10px] font-bold text-[#22c55e] uppercase">Resposta do Claude Code</p>
                <button
                  onClick={(e) => { e.stopPropagation(); copyOutput(); }}
                  className="p-1 rounded hover:bg-[rgba(255,255,255,0.06)] bg-transparent border-none cursor-pointer"
                  title="Copiar output"
                >
                  {copied ? <Check size={12} style={{ color: '#22c55e' }} /> : <Copy size={12} className="text-[#6a6a7a]" />}
                </button>
              </div>
              <pre className="font-mono whitespace-pre-wrap leading-relaxed text-[11px] max-h-[400px] overflow-y-auto">
                {entry.output.slice(0, 5000)}{entry.output.length > 5000 ? '\n\n... (output truncado)' : ''}
              </pre>
            </div>
          )}

          {/* Error */}
          {entry.error && (
            <div
              className="rounded-md text-[11px] mb-2"
              style={{ padding: '6px 10px', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)', color: '#ef4444' }}
            >
              <p className="text-[10px] font-bold uppercase mb-1">Erro</p>
              <p className="font-mono">{entry.error}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── CREATE TASK MODAL ──────────────────────────────────────────────────────

function CreateTaskModal({ onClose, onCreate }: {
  onClose: () => void;
  onCreate: (data: { title: string; prompt: string; cronExpression: string; mode: string }) => void;
}) {
  const [title, setTitle] = useState('');
  const [prompt, setPrompt] = useState('');
  const [cronExpression, setCronExpression] = useState('0 8 * * *');
  const [mode, setMode] = useState<'background' | 'interactive'>('background');

  const cronPresets = [
    { label: 'Diario 8h', value: '0 8 * * *' },
    { label: 'Diario 18h', value: '0 18 * * *' },
    { label: 'Seg-Sex 9h', value: '0 9 * * 1-5' },
    { label: 'Semanal (Seg 9h)', value: '0 9 * * 1' },
    { label: 'A cada 6h', value: '0 */6 * * *' },
    { label: 'A cada 1h', value: '0 * * * *' },
  ];

  const handleSubmit = () => {
    if (!prompt.trim()) return;
    onCreate({
      title: title.trim() || prompt.slice(0, 50),
      prompt: prompt.trim(),
      cronExpression,
      mode,
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="rounded-xl border border-[rgba(255,255,255,0.1)] w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto"
        style={{ background: '#16161f', padding: 24 }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-md flex items-center justify-center"
              style={{ background: 'rgba(124,106,239,0.15)', border: '1px solid rgba(124,106,239,0.3)' }}
            >
              <Terminal size={16} style={{ color: '#7c6aef' }} />
            </div>
            <h3 className="text-[16px] font-bold text-[#f0f0f5]">Nova Tarefa Agendada</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md hover:bg-[rgba(255,255,255,0.06)] bg-transparent border-none cursor-pointer"
          >
            <X size={18} className="text-[#6a6a7a]" />
          </button>
        </div>

        <div className="flex flex-col gap-4">
          {/* Titulo */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold text-[#9898aa] uppercase">Titulo (opcional)</label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Ex: Analise diaria do projeto X"
              className="px-3 py-2.5 rounded-md text-sm text-[#f0f0f5] outline-none placeholder:text-[#4a4a5a]"
              style={{ background: '#0a0a0f', border: '1px solid rgba(255,255,255,0.08)' }}
            />
          </div>

          {/* Prompt */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold text-[#9898aa] uppercase">Prompt / Instrucoes *</label>
            <textarea
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              rows={5}
              placeholder={"Ex: Analise o projeto em ~/meu-projeto e gere um relatorio de qualidade.\n\nOu: Verifique o servidor, rode os testes e me avise o resultado."}
              className="px-3 py-2.5 rounded-md text-sm text-[#f0f0f5] outline-none resize-y placeholder:text-[#4a4a5a] font-mono"
              style={{ background: '#0a0a0f', border: '1px solid rgba(255,255,255,0.08)' }}
            />
          </div>

          {/* Modo de execucao */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold text-[#9898aa] uppercase">Modo de Execucao</label>
            <ModeToggle mode={mode} onChange={setMode} />
            <p className="text-[10px] text-[#6a6a7a]">
              {mode === 'background'
                ? 'Background: executa silenciosamente, captura a resposta e envia via Telegram + exibe no historico.'
                : 'Terminal: abre uma janela do Claude Code na sua maquina para execucao interativa.'
              }
            </p>
          </div>

          {/* Cron */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold text-[#9898aa] uppercase">Frequencia (Cron)</label>
            <div className="flex flex-wrap gap-1.5 mb-1.5">
              {cronPresets.map(p => (
                <button
                  key={p.value}
                  onClick={() => setCronExpression(p.value)}
                  className="px-2.5 py-1 rounded text-[11px] font-medium transition-colors border-none cursor-pointer"
                  style={{
                    background: cronExpression === p.value ? 'rgba(124,106,239,0.2)' : 'rgba(255,255,255,0.04)',
                    color: cronExpression === p.value ? '#a78bfa' : '#9898aa',
                    border: cronExpression === p.value ? '1px solid rgba(124,106,239,0.3)' : '1px solid rgba(255,255,255,0.06)',
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <input
              value={cronExpression}
              onChange={e => setCronExpression(e.target.value)}
              placeholder="0 8 * * *"
              className="px-3 py-2.5 rounded-md text-sm text-[#f0f0f5] outline-none font-mono placeholder:text-[#4a4a5a]"
              style={{ background: '#0a0a0f', border: '1px solid rgba(255,255,255,0.08)' }}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-[rgba(255,255,255,0.08)]">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-md text-sm text-[#9898aa] hover:text-[#f0f0f5] hover:bg-[rgba(255,255,255,0.06)] transition-colors bg-transparent border-none cursor-pointer"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={!prompt.trim()}
            className="px-5 py-2.5 rounded-md text-sm font-semibold text-white hover:opacity-90 transition-opacity disabled:opacity-40 border-none cursor-pointer flex items-center gap-2"
            style={{ background: 'var(--accent, #7c6aef)' }}
          >
            <Terminal size={14} /> Criar Tarefa
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── QUICK LAUNCH ───────────────────────────────────────────────────────────

function QuickLaunch({ onDone }: { onDone: () => void }) {
  const [prompt, setPrompt] = useState('');
  const [mode, setMode] = useState<'background' | 'interactive'>('background');
  const [launching, setLaunching] = useState(false);
  const [lastResult, setLastResult] = useState<{ output?: string; error?: string; status?: string } | null>(null);

  const launch = async () => {
    if (!prompt.trim()) return;
    setLaunching(true);
    setLastResult(null);
    try {
      const res = await fetch(`${API}/launch`, {
        method: 'POST',
        headers: hdrs(),
        body: JSON.stringify({ prompt: prompt.trim(), title: 'Execucao Rapida', mode }),
      });
      if (res.ok) {
        const data = await res.json();
        setLastResult(data);
        if (mode === 'background' && data.output) {
          // Manter prompt para referencia
        } else {
          setPrompt('');
        }
        onDone();
      }
    } catch (e) {
      console.error('Erro ao executar:', e);
    } finally {
      setLaunching(false);
    }
  };

  return (
    <div
      className="rounded-lg border border-[rgba(255,255,255,0.08)] p-4"
      style={{ background: '#16161f' }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Terminal size={14} style={{ color: '#7c6aef' }} />
          <p className="text-[12px] font-bold text-[#f0f0f5] uppercase tracking-wide">Execucao Rapida</p>
        </div>
        <ModeToggle mode={mode} onChange={setMode} />
      </div>
      <div className="flex gap-2">
        <textarea
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          rows={2}
          placeholder={mode === 'background'
            ? "Digite um prompt — executa em background e captura a resposta..."
            : "Digite um prompt — abre um terminal do Claude Code..."
          }
          className="flex-1 px-3 py-2 rounded-md text-sm text-[#f0f0f5] outline-none resize-none placeholder:text-[#4a4a5a] font-mono"
          style={{ background: '#0a0a0f', border: '1px solid rgba(255,255,255,0.08)' }}
          onKeyDown={e => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
              e.preventDefault();
              launch();
            }
          }}
        />
        <button
          onClick={launch}
          disabled={!prompt.trim() || launching}
          className="px-4 rounded-md text-sm font-semibold text-white hover:opacity-90 transition-opacity disabled:opacity-40 border-none cursor-pointer self-end"
          style={{ background: 'var(--accent, #7c6aef)', height: 40 }}
          title="Ctrl+Enter para enviar"
        >
          {launching
            ? <Loader2 size={16} className="animate-spin" />
            : <Send size={16} />
          }
        </button>
      </div>
      <p className="text-[10px] text-[#6a6a7a] mt-1.5">
        Ctrl+Enter para enviar. {mode === 'background' ? 'A resposta aparece aqui e no historico.' : 'Abre um terminal interativo.'}
      </p>

      {/* Inline result */}
      {lastResult?.output && (
        <div
          className="mt-3 rounded-md text-[11px] text-[#d4d4d8]"
          style={{ padding: '8px 12px', background: '#0a0a0f', border: '1px solid rgba(34,197,94,0.15)', maxHeight: 300, overflowY: 'auto' }}
        >
          <p className="text-[10px] font-bold text-[#22c55e] uppercase mb-1.5">Resposta</p>
          <pre className="font-mono whitespace-pre-wrap leading-relaxed">
            {lastResult.output.slice(0, 3000)}{(lastResult.output.length || 0) > 3000 ? '\n...' : ''}
          </pre>
        </div>
      )}
      {lastResult?.error && (
        <div className="mt-3 rounded-md text-[11px] p-2" style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)', color: '#ef4444' }}>
          Erro: {lastResult.error}
        </div>
      )}
    </div>
  );
}

// ─── COMPONENTE PRINCIPAL ───────────────────────────────────────────────────

export function ScheduledTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [statusData, setStatusData] = useState<StatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [runningTask, setRunningTask] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showHistory, setShowHistory] = useState(true);

  // Normaliza os campos da API (name/cron/command/created_at/status/type)
  // para os nomes esperados pelo componente (title/cronExpression/prompt/createdAt/enabled/mode)
  const normalizeTask = (raw: Record<string, unknown>): Task => ({
    id: String(raw.id ?? ''),
    title: String(raw.title ?? raw.name ?? ''),
    prompt: String(raw.prompt ?? raw.command ?? ''),
    cronExpression: String(raw.cronExpression ?? raw.cron ?? ''),
    enabled: raw.enabled !== undefined ? Boolean(raw.enabled) : raw.status === 'active',
    mode: (raw.mode as Task['mode']) ?? (raw.type === 'shell' || raw.type === 'node' ? 'background' : 'background'),
    createdAt: String(raw.createdAt ?? raw.created_at ?? ''),
    lastRun: raw.lastRun != null ? String(raw.lastRun) : (raw.last_run != null ? String(raw.last_run) : null),
    runCount: Number(raw.runCount ?? raw.run_count ?? 0),
    status: String(raw.status ?? ''),
    cronRunning: Boolean(raw.cronRunning ?? raw.cron_running ?? false),
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [tasksRes, statusRes, historyRes] = await Promise.all([
        fetch(API, { headers: hdrs() }),
        fetch(`${API}/status`, { headers: hdrs() }),
        fetch(`${API}/history?limit=30`, { headers: hdrs() }),
      ]);
      if (tasksRes.ok) {
        const raw = await tasksRes.json();
        setTasks(Array.isArray(raw) ? raw.map(normalizeTask) : []);
      }
      if (statusRes.ok) setStatusData(await statusRes.json());
      if (historyRes.ok) setHistory(await historyRes.json());
    } catch (e) {
      console.error('Erro ao buscar dados:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Auto-refresh para pegar updates de execucoes background
  useEffect(() => {
    const hasRunning = history.some(h => h.status === 'running');
    if (!hasRunning) return;
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [history, fetchData]);

  const createTask = async (data: { title: string; prompt: string; cronExpression: string; mode: string }) => {
    try {
      const res = await fetch(API, {
        method: 'POST', headers: hdrs(), body: JSON.stringify(data),
      });
      if (res.ok) {
        setShowCreateModal(false);
        await fetchData();
      }
    } catch (e) {
      console.error('Erro ao criar tarefa:', e);
    }
  };

  const toggleTask = async (id: string, enabled: boolean) => {
    try {
      await fetch(`${API}/${id}`, {
        method: 'PUT', headers: hdrs(), body: JSON.stringify({ enabled: !enabled }),
      });
      await fetchData();
    } catch (e) {
      console.error('Erro ao toggle tarefa:', e);
    }
  };

  const removeTask = async (id: string) => {
    try {
      await fetch(`${API}/${id}`, { method: 'DELETE', headers: hdrs() });
      await fetchData();
    } catch (e) {
      console.error('Erro ao remover tarefa:', e);
    }
  };

  const runTaskNow = async (id: string) => {
    setRunningTask(id);
    try {
      await fetch(`${API}/${id}/run`, { method: 'POST', headers: hdrs() });
      await fetchData();
    } catch (e) {
      console.error('Erro ao executar tarefa:', e);
    } finally {
      setRunningTask(null);
    }
  };

  if (loading && tasks.length === 0) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={32} className="animate-spin" style={{ color: '#7c6aef' }} />
          <p className="text-sm text-[#9898aa]">Carregando tarefas agendadas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col" style={{ gap: 'var(--space-xl)' }}>

      <PageHeader
        title="Tarefas Agendadas"
        description="Agende prompts para execucao automatica via Claude Code. Background captura resposta; Terminal abre interativo."
      />

      {/* KPIs */}
      {statusData && (
        <section className="flex flex-col">
          <SectionLabel>Resumo</SectionLabel>
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            <KpiCard
              title="Tarefas Ativas"
              value={statusData.activeTasks}
              subtitle={`${statusData.totalTasks} total`}
              icon={CalendarClock}
              color="#22c55e"
            />
            <KpiCard
              title="Crons Rodando"
              value={statusData.cronJobsRunning}
              icon={Clock}
              color="#3b82f6"
            />
            <KpiCard
              title="Execucoes"
              value={statusData.totalExecutions}
              icon={Terminal}
              color="#7c6aef"
            />
            <KpiCard
              title="Rodando Agora"
              value={statusData.runningNow}
              icon={Loader2}
              color={statusData.runningNow > 0 ? '#f59e0b' : '#6a6a7a'}
            />
          </div>
        </section>
      )}

      {/* Quick Launch */}
      <section className="flex flex-col">
        <SectionLabel>Execucao Rapida</SectionLabel>
        <QuickLaunch onDone={fetchData} />
      </section>

      {/* Tarefas Agendadas */}
      <section className="flex flex-col">
        <div className="flex items-center justify-between mb-2">
          <SectionLabel>Tarefas Agendadas</SectionLabel>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md text-[12px] font-semibold text-white hover:opacity-90 transition-all border-none cursor-pointer"
            style={{ background: 'var(--accent, #7c6aef)' }}
          >
            <Plus size={14} /> Nova Tarefa
          </button>
        </div>

        {tasks.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center py-12 gap-3 rounded-lg border border-[rgba(255,255,255,0.08)]"
            style={{ background: '#16161f' }}
          >
            <div
              className="w-12 h-12 rounded-lg flex items-center justify-center"
              style={{ background: '#7c6aef20', border: '1px solid #7c6aef40' }}
            >
              <Terminal size={22} style={{ color: '#7c6aef' }} />
            </div>
            <div className="text-center">
              <p className="text-[#f0f0f5] font-medium text-sm">Nenhuma tarefa agendada</p>
              <p className="text-[12px] text-[#6a6a7a] mt-1 max-w-sm">
                Crie tarefas com prompts que serao executados automaticamente via Claude Code nos horarios definidos.
              </p>
            </div>
          </div>
        ) : (
          tasks.map(t => (
            <TaskCard
              key={t.id}
              task={t}
              onRun={() => runTaskNow(t.id)}
              onToggle={() => toggleTask(t.id, t.enabled)}
              onRemove={() => removeTask(t.id)}
              running={runningTask === t.id}
            />
          ))
        )}
      </section>

      {/* Controles */}
      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm text-[#9898aa] hover:text-[#f0f0f5] transition-colors bg-transparent cursor-pointer"
          style={{ border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <History size={14} /> {showHistory ? 'Ocultar Historico' : 'Ver Historico'}
        </button>
        <button
          onClick={fetchData}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm text-[#9898aa] hover:text-[#f0f0f5] transition-colors bg-transparent cursor-pointer"
          style={{ border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Atualizar
        </button>
      </div>

      {/* Historico de Execucoes */}
      {showHistory && (
        <section className="flex flex-col">
          <SectionLabel>Historico de Execucoes</SectionLabel>
          {history.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 gap-3">
              <History size={24} style={{ color: '#6a6a7a' }} />
              <p className="text-[12px] text-[#6a6a7a]">Nenhuma execucao registrada ainda</p>
            </div>
          ) : (
            history.map(entry => <HistoryCard key={entry.id} entry={entry} />)
          )}
        </section>
      )}

      {/* Create Task Modal */}
      {showCreateModal && (
        <CreateTaskModal
          onClose={() => setShowCreateModal(false)}
          onCreate={createTask}
        />
      )}
    </div>
  );
}
