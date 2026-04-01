// Página de Tarefas do Ecosystem — lista, kanban, criação e detalhes
import { useState, useMemo, useCallback } from 'react';
import {
  CheckSquare,
  Clock,
  Loader2,
  TrendingUp,
  Plus,
  Play,
  Pause,
  Trash2,
  LayoutList,
  LayoutGrid,
  AlertCircle,
  ChevronRight,
  Calendar,
  RefreshCw,
  Tag,
  Zap,
  BarChart2,
} from 'lucide-react';
import {
  useEcoTasks,
  useCreateEcoTask,
  useDeleteEcoTask,
  useRunEcoTask,
  usePauseEcoTask,
} from '../api/ecosystem-hooks';
import { Modal } from '../components/Modal';
import { useToast } from '../contexts/ToastContext';
import { PageHeader, ActionButton, SectionLabel } from '../components/PageHeader';
import type { EcoTask, EcoTaskStatus } from '../types';

// ─── CONSTANTES ───────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<EcoTaskStatus, string> = {
  scheduled:  'Agendada',
  running:    'Executando',
  completed:  'Concluída',
  failed:     'Falhou',
  paused:     'Pausada',
  cancelled:  'Cancelada',
};

const STATUS_COLORS: Record<EcoTaskStatus, { bg: string; text: string; border: string }> = {
  scheduled:  { bg: '#a855f720', text: '#a855f7', border: '#a855f740' },
  running:    { bg: '#f9731620', text: '#f97316', border: '#f9731640' },
  completed:  { bg: '#22c55e20', text: '#22c55e', border: '#22c55e40' },
  failed:     { bg: '#ef444420', text: '#ef4444', border: '#ef444440' },
  paused:     { bg: '#9898aa20', text: '#9898aa', border: '#9898aa40' },
  cancelled:  { bg: '#6a6a7a20', text: '#6a6a7a', border: '#6a6a7a40' },
};

const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  'Marketing': { bg: '#ec489920', text: '#ec4899' },
  'Ads':       { bg: '#f9731620', text: '#f97316' },
  'Código':    { bg: '#9080f520', text: '#9080f5' },
  'SEO':       { bg: '#22c55e20', text: '#22c55e' },
  'DevOps':    { bg: '#a855f720', text: '#a855f7' },
  'Conteúdo':  { bg: '#eab30820', text: '#eab308' },
  'Design':    { bg: '#7c6aef20', text: '#7c6aef' },
  'Geral':     { bg: '#9898aa20', text: '#9898aa' },
};

const CATEGORIES = ['Marketing', 'Ads', 'Código', 'SEO', 'DevOps', 'Conteúdo', 'Design', 'Geral'];

const KANBAN_COLUMNS: { status: EcoTaskStatus; label: string; color: string }[] = [
  { status: 'scheduled',  label: 'Agendada',   color: '#a855f7' },
  { status: 'running',    label: 'Executando',  color: '#f97316' },
  { status: 'completed',  label: 'Concluída',   color: '#22c55e' },
  { status: 'failed',     label: 'Falhou',      color: '#ef4444' },
];

const STATUS_FILTER_OPTIONS: { value: string; label: string }[] = [
  { value: 'all',        label: 'Todos os status' },
  { value: 'scheduled',  label: 'Agendada' },
  { value: 'running',    label: 'Executando' },
  { value: 'completed',  label: 'Concluída' },
  { value: 'failed',     label: 'Falhou' },
  { value: 'paused',     label: 'Pausada' },
  { value: 'cancelled',  label: 'Cancelada' },
];

// ─── UTILITÁRIOS ──────────────────────────────────────────────────────────────

function formatDateBR(iso?: string): string {
  if (!iso) return '—';
  return new Intl.DateTimeFormat('pt-BR', {
    day:    '2-digit',
    month:  '2-digit',
    year:   'numeric',
    hour:   '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

function calcSuccessRate(task: EcoTask): number {
  const total = task.successCount + task.failCount;
  if (total === 0) return 0;
  return Math.round((task.successCount / total) * 100);
}

// ─── COMPONENTES MENORES ───────────────────────────────────────────────────────

interface StatusBadgeProps {
  status: EcoTaskStatus;
  pulse?: boolean;
}

function StatusBadge({ status, pulse }: StatusBadgeProps) {
  const colors = STATUS_COLORS[status] ?? STATUS_COLORS.cancelled;
  const isRunning = status === 'running';

  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
      style={{ background: colors.bg, color: colors.text, border: `1px solid ${colors.border}` }}
    >
      {(isRunning || pulse) && (
        <span
          className="w-1.5 h-1.5 rounded-full animate-pulse"
          style={{ background: colors.text }}
        />
      )}
      {STATUS_LABELS[status]}
    </span>
  );
}

interface CategoryBadgeProps {
  category?: string;
}

function CategoryBadge({ category }: CategoryBadgeProps) {
  if (!category) return null;
  const colors = CATEGORY_COLORS[category] ?? { bg: '#9898aa20', text: '#9898aa' };

  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium"
      style={{ background: colors.bg, color: colors.text }}
    >
      <Tag size={10} />
      {category}
    </span>
  );
}

interface KpiCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  subtitle?: string;
}

function KpiCard({ title, value, icon, color, subtitle }: KpiCardProps) {
  return (
    <div
      className="rounded-lg border border-[rgba(255,255,255,0.08)] p-6 flex items-start gap-4"
      style={{ background: '#16161f' }}
    >
      <div
        className="w-12 h-12 rounded-md flex items-center justify-center shrink-0"
        style={{ background: `${color}20`, border: `1px solid ${color}40` }}
      >
        <span style={{ color }}>{icon}</span>
      </div>
      <div className="min-w-0">
        <p className="text-[13px] font-medium text-[#9898aa] uppercase tracking-wide mb-1 truncate">
          {title}
        </p>
        <p className="text-4xl font-bold text-[#f0f0f5]" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
          {value}
        </p>
        {subtitle && <p className="text-xs text-[#6a6a7a] mt-1">{subtitle}</p>}
      </div>
    </div>
  );
}

// ─── MODAL CRIAR TAREFA ────────────────────────────────────────────────────────

interface CreateTaskFormData {
  name: string;
  prompt: string;
  category: string;
  cronExpression: string;
  priority: number;
  description: string;
}

const EMPTY_FORM: CreateTaskFormData = {
  name:           '',
  prompt:         '',
  category:       'Geral',
  cronExpression: '',
  priority:       3,
  description:    '',
};

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function CreateTaskModal({ isOpen, onClose }: CreateTaskModalProps) {
  const { showToast } = useToast();
  const createTask = useCreateEcoTask();
  const [form, setForm] = useState<CreateTaskFormData>(EMPTY_FORM);

  const handleChange = useCallback(
    (field: keyof CreateTaskFormData, value: string | number) => {
      setForm((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!form.name.trim()) {
        showToast('Nome da tarefa é obrigatório.', 'error');
        return;
      }
      if (!form.prompt.trim()) {
        showToast('O prompt é obrigatório.', 'error');
        return;
      }

      const payload: Partial<EcoTask> = {
        name:           form.name.trim(),
        prompt:         form.prompt.trim(),
        description:    form.description.trim() || undefined,
        category:       form.category || undefined,
        priority:       form.priority,
        cronExpression: form.cronExpression.trim() || undefined,
        recurring:      !!form.cronExpression.trim(),
        type:           'prompt',
        enabled:        true,
        status:         'scheduled',
      };

      try {
        await createTask.mutateAsync(payload);
        showToast('Tarefa criada com sucesso!', 'success');
        setForm(EMPTY_FORM);
        onClose();
      } catch {
        showToast('Erro ao criar tarefa. Tente novamente.', 'error');
      }
    },
    [form, createTask, showToast, onClose]
  );

  const handleClose = useCallback(() => {
    setForm(EMPTY_FORM);
    onClose();
  }, [onClose]);

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Nova Tarefa" size="xl">
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        {/* Nome */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-[#f0f0f5]">
            Nome <span className="text-[#ef4444]">*</span>
          </label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => handleChange('name', e.target.value)}
            placeholder="Ex: Gerar relatório semanal de tráfego"
            className="w-full px-3 py-2.5 rounded-md text-sm text-[#f0f0f5] placeholder-[#6a6a7a] outline-none transition-colors"
            style={{ background: '#0a0a0f', border: '1px solid rgba(255,255,255,0.08)' }}
            onFocus={(e) => (e.currentTarget.style.borderColor = '#7c6aef')}
            onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)')}
          />
        </div>

        {/* Descrição */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-[#f0f0f5]">Descrição</label>
          <input
            type="text"
            value={form.description}
            onChange={(e) => handleChange('description', e.target.value)}
            placeholder="Breve descrição do objetivo da tarefa"
            className="w-full px-3 py-2.5 rounded-md text-sm text-[#f0f0f5] placeholder-[#6a6a7a] outline-none transition-colors"
            style={{ background: '#0a0a0f', border: '1px solid rgba(255,255,255,0.08)' }}
            onFocus={(e) => (e.currentTarget.style.borderColor = '#7c6aef')}
            onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)')}
          />
        </div>

        {/* Prompt */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-[#f0f0f5]">
            Prompt <span className="text-[#ef4444]">*</span>
          </label>
          <textarea
            value={form.prompt}
            onChange={(e) => handleChange('prompt', e.target.value)}
            placeholder="Descreva detalhadamente o que o agente deve fazer..."
            rows={6}
            className="w-full px-3 py-2.5 rounded-md text-sm text-[#f0f0f5] placeholder-[#6a6a7a] outline-none transition-colors resize-y"
            style={{ background: '#0a0a0f', border: '1px solid rgba(255,255,255,0.08)', minHeight: '120px' }}
            onFocus={(e) => (e.currentTarget.style.borderColor = '#7c6aef')}
            onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)')}
          />
          <p className="text-xs text-[#6a6a7a]">{form.prompt.length} caracteres</p>
        </div>

        {/* Categoria e Prioridade lado a lado */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[#f0f0f5]">Categoria</label>
            <select
              value={form.category}
              onChange={(e) => handleChange('category', e.target.value)}
              className="w-full px-3 py-2.5 rounded-md text-sm text-[#f0f0f5] outline-none transition-colors"
              style={{ background: '#0a0a0f', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[#f0f0f5]">
              Prioridade <span className="text-[#9898aa]">(1 = baixa, 5 = alta)</span>
            </label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => handleChange('priority', p)}
                  className="flex-1 py-2 rounded-md text-sm font-bold transition-all"
                  style={{
                    background:   form.priority === p ? '#7c6aef' : '#0a0a0f',
                    border:       `1px solid ${form.priority === p ? '#7c6aef' : 'rgba(255,255,255,0.08)'}`,
                    color:        form.priority === p ? '#ffffff' : '#9898aa',
                  }}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Cron Expression */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-[#f0f0f5]">
            Cron Expression <span className="text-[#6a6a7a]">(opcional — para execução recorrente)</span>
          </label>
          <input
            type="text"
            value={form.cronExpression}
            onChange={(e) => handleChange('cronExpression', e.target.value)}
            placeholder="Ex: 0 9 * * 1 (toda segunda às 9h)"
            className="w-full px-3 py-2.5 rounded-md text-sm text-[#f0f0f5] placeholder-[#6a6a7a] outline-none transition-colors font-mono"
            style={{ background: '#0a0a0f', border: '1px solid rgba(255,255,255,0.08)' }}
            onFocus={(e) => (e.currentTarget.style.borderColor = '#7c6aef')}
            onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)')}
          />
        </div>

        {/* Ações */}
        <div className="flex justify-end gap-3 pt-2 border-t border-[rgba(255,255,255,0.08)]">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 rounded-md text-sm text-[#9898aa] hover:text-[#f0f0f5] hover:bg-[rgba(255,255,255,0.06)] transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={createTask.isPending}
            className="px-5 py-2 rounded-md text-sm font-medium text-white flex items-center gap-2 transition-opacity disabled:opacity-60"
            style={{ background: '#7c6aef' }}
          >
            {createTask.isPending ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Plus size={14} />
            )}
            Criar Tarefa
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ─── MODAL DETALHES DA TAREFA ─────────────────────────────────────────────────

interface TaskDetailModalProps {
  task: EcoTask | null;
  onClose: () => void;
}

function TaskDetailModal({ task, onClose }: TaskDetailModalProps) {
  if (!task) return null;

  const successRate = calcSuccessRate(task);

  return (
    <Modal isOpen={!!task} onClose={onClose} title={task.name} size="xl">
      <div className="flex flex-col gap-5">
        {/* Status e categoria */}
        <div className="flex items-center gap-3 flex-wrap">
          <StatusBadge status={task.status} />
          <CategoryBadge category={task.category} />
          {task.recurring && (
            <span
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium"
              style={{ background: '#7c6aef20', color: '#7c6aef', border: '1px solid #7c6aef40' }}
            >
              <RefreshCw size={10} />
              Recorrente
            </span>
          )}
          <span
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium"
            style={{ background: '#eab30820', color: '#eab308', border: '1px solid #eab30840' }}
          >
            <Zap size={10} />
            Prioridade {task.priority}
          </span>
        </div>

        {/* Descrição */}
        {task.description && (
          <p className="text-sm text-[#9898aa]">{task.description}</p>
        )}

        {/* Prompt completo */}
        {task.prompt && (
          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold text-[#9898aa] uppercase tracking-wide">Prompt</p>
            <div
              className="p-4 rounded-md text-sm text-[#f0f0f5] whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto"
              style={{ background: '#0a0a0f', border: '1px solid rgba(255,255,255,0.08)', fontFamily: 'monospace' }}
            >
              {task.prompt}
            </div>
          </div>
        )}

        {/* Cron */}
        {task.cronExpression && (
          <div className="flex items-center gap-2 text-sm">
            <RefreshCw size={14} className="text-[#9898aa]" />
            <span className="text-[#9898aa]">Cron:</span>
            <code className="px-2 py-0.5 rounded text-[#9080f5]" style={{ background: '#9080f510' }}>
              {task.cronExpression}
            </code>
          </div>
        )}

        {/* Grid de informações */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Criada em',       value: formatDateBR(task.createdAt) },
            { label: 'Atualizada em',   value: formatDateBR(task.updatedAt) },
            { label: 'Última execução', value: formatDateBR(task.lastRunAt) },
            { label: 'Próxima execução',value: formatDateBR(task.nextRunAt) },
          ].map(({ label, value }) => (
            <div
              key={label}
              className="p-3 rounded-md"
              style={{ background: '#0a0a0f', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <p className="text-xs text-[#6a6a7a] mb-1">{label}</p>
              <p className="text-sm text-[#f0f0f5]">{value}</p>
            </div>
          ))}
        </div>

        {/* Stats de execução */}
        <div
          className="p-4 rounded-md flex items-center gap-6"
          style={{ background: '#0a0a0f', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <div className="flex flex-col items-center gap-1">
            <p className="text-xl font-bold text-[#22c55e]" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
              {task.successCount}
            </p>
            <p className="text-xs text-[#6a6a7a]">Sucessos</p>
          </div>
          <div className="h-8 w-px bg-[rgba(255,255,255,0.08)]" />
          <div className="flex flex-col items-center gap-1">
            <p className="text-xl font-bold text-[#ef4444]" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
              {task.failCount}
            </p>
            <p className="text-xs text-[#6a6a7a]">Falhas</p>
          </div>
          <div className="h-8 w-px bg-[rgba(255,255,255,0.08)]" />
          <div className="flex flex-col items-center gap-1">
            <p
              className="text-xl font-bold"
              style={{
                fontFamily: 'JetBrains Mono, monospace',
                color: successRate >= 80 ? '#22c55e' : successRate >= 50 ? '#eab308' : '#ef4444',
              }}
            >
              {successRate}%
            </p>
            <p className="text-xs text-[#6a6a7a]">Taxa de Sucesso</p>
          </div>
          {/* Barra de progresso */}
          <div className="flex-1">
            <div className="h-2 rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }}>
              <div
                className="h-2 rounded-full transition-all"
                style={{
                  width:      `${successRate}%`,
                  background: successRate >= 80 ? '#22c55e' : successRate >= 50 ? '#eab308' : '#ef4444',
                }}
              />
            </div>
          </div>
        </div>

        {/* Source */}
        {task.source && (
          <p className="text-xs text-[#6a6a7a]">
            Origem: <span className="text-[#9898aa]">{task.source}</span>
          </p>
        )}

        <div className="flex justify-end pt-2 border-t border-[rgba(255,255,255,0.08)]">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-md text-sm text-[#9898aa] hover:text-[#f0f0f5] hover:bg-[rgba(255,255,255,0.06)] transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ─── CARD DE TAREFA (LISTA) ───────────────────────────────────────────────────

interface TaskCardListProps {
  task: EcoTask;
  onRun:    (id: string) => void;
  onPause:  (id: string) => void;
  onDelete: (id: string) => void;
  onClick:  (task: EcoTask) => void;
  isRunningMutation:  boolean;
  isPausingMutation:  boolean;
  isDeletingMutation: boolean;
}

function TaskCardList({
  task,
  onRun,
  onPause,
  onDelete,
  onClick,
  isRunningMutation,
  isPausingMutation,
  isDeletingMutation,
}: TaskCardListProps) {
  const successRate = calcSuccessRate(task);
  const isRunning = task.status === 'running';

  return (
    <div
      className="group rounded-lg border border-[rgba(255,255,255,0.08)] p-4 flex items-start gap-4 transition-all cursor-pointer hover:border-[#7c6aef40]"
      style={{ background: '#16161f' }}
      onClick={() => onClick(task)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick(task)}
      aria-label={`Ver detalhes da tarefa ${task.name}`}
    >
      {/* Indicador de prioridade */}
      <div
        className="w-1 self-stretch rounded-full shrink-0"
        style={{
          background:
            task.priority >= 4 ? '#ef4444' :
            task.priority === 3 ? '#eab308' :
            '#22c55e',
        }}
      />

      {/* Conteúdo principal */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-[#f0f0f5] truncate group-hover:text-[#9080f5] transition-colors">
              {task.name}
            </h3>
            {task.description && (
              <p className="text-xs text-[#6a6a7a] mt-0.5 truncate">{task.description}</p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <StatusBadge status={task.status} />
            <CategoryBadge category={task.category} />
          </div>
        </div>

        {/* Meta info */}
        <div className="flex items-center gap-4 text-xs text-[#6a6a7a]">
          {task.nextRunAt && (
            <span className="flex items-center gap-1">
              <Calendar size={11} />
              Próxima: {formatDateBR(task.nextRunAt)}
            </span>
          )}
          {task.lastRunAt && (
            <span className="flex items-center gap-1">
              <Clock size={11} />
              Última: {formatDateBR(task.lastRunAt)}
            </span>
          )}
          {task.cronExpression && (
            <span className="flex items-center gap-1">
              <RefreshCw size={11} />
              <code className="font-mono">{task.cronExpression}</code>
            </span>
          )}
          {(task.successCount + task.failCount) > 0 && (
            <span className="flex items-center gap-1" style={{ color: successRate >= 80 ? '#22c55e' : successRate >= 50 ? '#eab308' : '#ef4444' }}>
              <BarChart2 size={11} />
              {successRate}% sucesso
            </span>
          )}
        </div>
      </div>

      {/* Ações */}
      <div
        className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
        onClick={(e) => e.stopPropagation()}
      >
        {!isRunning && (
          <button
            onClick={() => onRun(task.id)}
            disabled={isRunningMutation}
            className="p-2 rounded-md text-[#22c55e] hover:bg-[#22c55e20] transition-colors disabled:opacity-40"
            title="Executar agora"
          >
            {isRunningMutation ? <Loader2 size={15} className="animate-spin" /> : <Play size={15} />}
          </button>
        )}
        {isRunning && (
          <button
            onClick={() => onPause(task.id)}
            disabled={isPausingMutation}
            className="p-2 rounded-md text-[#eab308] hover:bg-[#eab30820] transition-colors disabled:opacity-40"
            title="Pausar"
          >
            {isPausingMutation ? <Loader2 size={15} className="animate-spin" /> : <Pause size={15} />}
          </button>
        )}
        <button
          onClick={() => onDelete(task.id)}
          disabled={isDeletingMutation}
          className="p-2 rounded-md text-[#ef4444] hover:bg-[#ef444420] transition-colors disabled:opacity-40"
          title="Deletar tarefa"
        >
          {isDeletingMutation ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
        </button>
        <ChevronRight size={14} className="text-[#6a6a7a] ml-1" />
      </div>
    </div>
  );
}

// ─── CARD DE TAREFA (KANBAN) ──────────────────────────────────────────────────

interface TaskCardKanbanProps {
  task: EcoTask;
  onRun:    (id: string) => void;
  onPause:  (id: string) => void;
  onDelete: (id: string) => void;
  onClick:  (task: EcoTask) => void;
}

function TaskCardKanban({ task, onRun, onPause, onDelete, onClick }: TaskCardKanbanProps) {
  const isRunning = task.status === 'running';

  return (
    <div
      className="group rounded-lg border border-[rgba(255,255,255,0.08)] p-3 flex flex-col gap-2 transition-all cursor-pointer hover:border-[#7c6aef40]"
      style={{ background: '#16161f' }}
      onClick={() => onClick(task)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick(task)}
      aria-label={`Ver detalhes da tarefa ${task.name}`}
    >
      {/* Header com categoria e prioridade */}
      <div className="flex items-center justify-between gap-2">
        <CategoryBadge category={task.category} />
        <span
          className="text-xs font-bold px-1.5 rounded"
          style={{
            background:
              task.priority >= 4 ? '#ef444420' :
              task.priority === 3 ? '#eab30820' :
              '#22c55e20',
            color:
              task.priority >= 4 ? '#ef4444' :
              task.priority === 3 ? '#eab308' :
              '#22c55e',
          }}
        >
          P{task.priority}
        </span>
      </div>

      {/* Nome */}
      <h4 className="text-sm font-medium text-[#f0f0f5] leading-snug group-hover:text-[#9080f5] transition-colors line-clamp-2">
        {task.name}
      </h4>

      {/* Próxima execução */}
      {task.nextRunAt && (
        <p className="text-xs text-[#6a6a7a] flex items-center gap-1">
          <Calendar size={10} />
          {formatDateBR(task.nextRunAt)}
        </p>
      )}

      {/* Ações */}
      <div
        className="flex items-center gap-1 border-t border-[rgba(255,255,255,0.08)] pt-2 mt-1"
        onClick={(e) => e.stopPropagation()}
      >
        {!isRunning ? (
          <button
            onClick={() => onRun(task.id)}
            className="flex-1 flex items-center justify-center gap-1 py-1 rounded-md text-xs text-[#22c55e] hover:bg-[#22c55e20] transition-colors"
          >
            <Play size={12} /> Executar
          </button>
        ) : (
          <button
            onClick={() => onPause(task.id)}
            className="flex-1 flex items-center justify-center gap-1 py-1 rounded-md text-xs text-[#eab308] hover:bg-[#eab30820] transition-colors"
          >
            <Pause size={12} /> Pausar
          </button>
        )}
        <button
          onClick={() => onDelete(task.id)}
          className="p-1.5 rounded-md text-[#6a6a7a] hover:text-[#ef4444] hover:bg-[#ef444420] transition-colors"
          title="Deletar"
        >
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  );
}

// ─── ESTADO VAZIO ─────────────────────────────────────────────────────────────

function EmptyState({ onNew }: { onNew: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <div
        className="w-16 h-16 rounded-lg flex items-center justify-center"
        style={{ background: '#7c6aef20', border: '1px solid #7c6aef40' }}
      >
        <CheckSquare size={28} style={{ color: '#7c6aef' }} />
      </div>
      <div className="text-center">
        <p className="text-[#f0f0f5] font-medium">Nenhuma tarefa encontrada</p>
        <p className="text-sm text-[#6a6a7a] mt-1">Crie sua primeira tarefa para o agente executar.</p>
      </div>
      <button
        onClick={onNew}
        className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium text-white transition-opacity hover:opacity-90"
        style={{ background: '#7c6aef' }}
      >
        <Plus size={16} />
        Nova Tarefa
      </button>
    </div>
  );
}

// ─── COMPONENTE PRINCIPAL ─────────────────────────────────────────────────────

export function EcoTasks() {
  const { showToast } = useToast();

  // Dados
  const { data: tasks = [], isLoading, isError } = useEcoTasks();

  // Mutations
  const deleteTask  = useDeleteEcoTask();
  const runTask     = useRunEcoTask();
  const pauseTask   = usePauseEcoTask();

  // UI state
  const [view,            setView]            = useState<'list' | 'kanban'>('list');
  const [statusFilter,    setStatusFilter]    = useState<string>('all');
  const [categoryFilter,  setCategoryFilter]  = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTask,    setSelectedTask]    = useState<EcoTask | null>(null);

  // IDs das mutations em andamento (para feedback individual)
  const [runningId,  setRunningId]  = useState<string | null>(null);
  const [pausingId,  setPausingId]  = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // ─── KPIs ──────────────────────────────────────────────────────────────────

  const kpis = useMemo(() => {
    const total      = tasks.length;
    const scheduled  = tasks.filter((t) => t.status === 'scheduled').length;
    const running    = tasks.filter((t) => t.status === 'running').length;

    const totalExecs = tasks.reduce((acc, t) => acc + t.successCount + t.failCount, 0);
    const totalOk    = tasks.reduce((acc, t) => acc + t.successCount, 0);
    const successRate = totalExecs > 0 ? Math.round((totalOk / totalExecs) * 100) : 0;

    return { total, scheduled, running, successRate };
  }, [tasks]);

  // ─── Filtros ───────────────────────────────────────────────────────────────

  const categoryOptions = useMemo(() => {
    const cats = Array.from(new Set(tasks.map((t) => t.category).filter(Boolean))) as string[];
    return cats.sort();
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      const matchStatus   = statusFilter   === 'all' || t.status   === statusFilter;
      const matchCategory = categoryFilter === 'all' || t.category === categoryFilter;
      return matchStatus && matchCategory;
    });
  }, [tasks, statusFilter, categoryFilter]);

  // ─── Handlers ──────────────────────────────────────────────────────────────

  const handleRun = useCallback(
    async (id: string) => {
      setRunningId(id);
      try {
        await runTask.mutateAsync(id);
        showToast('Tarefa iniciada!', 'success');
      } catch {
        showToast('Erro ao iniciar tarefa.', 'error');
      } finally {
        setRunningId(null);
      }
    },
    [runTask, showToast]
  );

  const handlePause = useCallback(
    async (id: string) => {
      setPausingId(id);
      try {
        await pauseTask.mutateAsync(id);
        showToast('Tarefa pausada.', 'info');
      } catch {
        showToast('Erro ao pausar tarefa.', 'error');
      } finally {
        setPausingId(null);
      }
    },
    [pauseTask, showToast]
  );

  const handleDelete = useCallback(
    async (id: string) => {
      const task = tasks.find((t) => t.id === id);
      const confirmed = window.confirm(
        `Deletar a tarefa "${task?.name ?? id}"?\n\nEsta ação não pode ser desfeita.`
      );
      if (!confirmed) return;

      setDeletingId(id);
      try {
        await deleteTask.mutateAsync(id);
        showToast('Tarefa deletada.', 'success');
        if (selectedTask?.id === id) setSelectedTask(null);
      } catch {
        showToast('Erro ao deletar tarefa.', 'error');
      } finally {
        setDeletingId(null);
      }
    },
    [deleteTask, tasks, showToast, selectedTask]
  );

  // ─── LOADING ───────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={32} className="animate-spin" style={{ color: '#7c6aef' }} />
          <p className="text-sm text-[#9898aa]">Carregando tarefas...</p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="flex flex-col items-center gap-3 text-center">
          <AlertCircle size={32} style={{ color: '#ef4444' }} />
          <p className="text-[#f0f0f5] font-medium">Erro ao carregar tarefas</p>
          <p className="text-sm text-[#6a6a7a]">Verifique a conexão com o Ecosystem.</p>
        </div>
      </div>
    );
  }

  // ─── RENDER PRINCIPAL ───────────────────────────────────────────────────────

  return (
    <div className="flex flex-col" style={{ gap: 'var(--space-xl)' }}>

      {/* Cabeçalho */}
      <PageHeader
        title="Tarefas do Ecosystem"
        description="Gerencie e monitore as tarefas executadas pelo agente."
        breadcrumb={[{ label: 'Home', to: '/' }, { label: 'Tarefas do Ecosystem' }]}
        action={
          <ActionButton
            onClick={() => setShowCreateModal(true)}
            icon={<Plus size={16} />}
          >
            Nova Tarefa
          </ActionButton>
        }
      />

      {/* KPI Cards */}
      <section className="flex flex-col">
        <SectionLabel>Métricas</SectionLabel>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4" style={{ gap: 'var(--space-lg)' }}>
        <KpiCard
          title="Total de Tarefas"
          value={kpis.total}
          icon={<CheckSquare size={20} />}
          color="#7c6aef"
        />
        <KpiCard
          title="Agendadas"
          value={kpis.scheduled}
          icon={<Clock size={20} />}
          color="#a855f7"
          subtitle="Aguardando execução"
        />
        <KpiCard
          title="Executando"
          value={kpis.running}
          icon={<Loader2 size={20} className={kpis.running > 0 ? 'animate-spin' : ''} />}
          color="#f97316"
          subtitle={kpis.running > 0 ? 'Em andamento' : 'Nenhuma agora'}
        />
        <KpiCard
          title="Taxa de Sucesso"
          value={`${kpis.successRate}%`}
          icon={<TrendingUp size={20} />}
          color={kpis.successRate >= 80 ? '#22c55e' : kpis.successRate >= 50 ? '#eab308' : '#ef4444'}
          subtitle="De todas as execuções"
        />
      </div>
      </section>

      {/* Barra de ações */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Filtro status */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 rounded-md text-sm text-[#f0f0f5] outline-none transition-colors"
          style={{ background: '#16161f', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          {STATUS_FILTER_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>

        {/* Filtro categoria */}
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-3 py-2 rounded-md text-sm text-[#f0f0f5] outline-none transition-colors"
          style={{ background: '#16161f', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <option value="all">Todas as categorias</option>
          {categoryOptions.map((cat) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>

        {/* Contador de resultados */}
        <span className="text-sm text-[#6a6a7a] ml-1">
          {filteredTasks.length} {filteredTasks.length === 1 ? 'tarefa' : 'tarefas'}
        </span>

        {/* Toggle lista / kanban */}
        <div
          className="ml-auto flex items-center rounded-md overflow-hidden"
          style={{ border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <button
            onClick={() => setView('list')}
            className="flex items-center gap-1.5 px-3 py-2 text-sm transition-colors"
            style={{
              background: view === 'list' ? '#7c6aef20' : 'transparent',
              color:      view === 'list' ? '#7c6aef'   : '#9898aa',
            }}
            title="Vista em lista"
          >
            <LayoutList size={16} />
            Lista
          </button>
          <button
            onClick={() => setView('kanban')}
            className="flex items-center gap-1.5 px-3 py-2 text-sm transition-colors"
            style={{
              background: view === 'kanban' ? '#7c6aef20' : 'transparent',
              color:      view === 'kanban' ? '#7c6aef'   : '#9898aa',
            }}
            title="Vista kanban"
          >
            <LayoutGrid size={16} />
            Kanban
          </button>
        </div>
      </div>

      {/* Conteúdo principal */}
      {filteredTasks.length === 0 ? (
        <EmptyState onNew={() => setShowCreateModal(true)} />
      ) : view === 'list' ? (

        // ── VISTA LISTA ─────────────────────────────────────────────────────
        <div className="flex flex-col gap-2">
          {filteredTasks.map((task) => (
            <TaskCardList
              key={task.id}
              task={task}
              onRun={handleRun}
              onPause={handlePause}
              onDelete={handleDelete}
              onClick={setSelectedTask}
              isRunningMutation={runningId  === task.id}
              isPausingMutation={pausingId  === task.id}
              isDeletingMutation={deletingId === task.id}
            />
          ))}
        </div>

      ) : (

        // ── VISTA KANBAN ─────────────────────────────────────────────────────
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {KANBAN_COLUMNS.map((col) => {
            const columnTasks = filteredTasks.filter((t) => t.status === col.status);
            return (
              <div key={col.status} className="flex flex-col gap-3">
                {/* Cabeçalho da coluna */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ background: col.color }}
                    />
                    <span className="text-sm font-semibold text-[#f0f0f5]">{col.label}</span>
                  </div>
                  <span
                    className="text-xs font-bold px-2 py-0.5 rounded-full"
                    style={{ background: `${col.color}20`, color: col.color }}
                  >
                    {columnTasks.length}
                  </span>
                </div>

                {/* Linha separadora colorida */}
                <div className="h-0.5 rounded-full" style={{ background: `${col.color}40` }} />

                {/* Cards */}
                <div className="flex flex-col gap-2">
                  {columnTasks.length === 0 ? (
                    <div
                      className="rounded-lg border border-dashed p-6 flex items-center justify-center text-center"
                      style={{ borderColor: 'rgba(255,255,255,0.08)' }}
                    >
                      <p className="text-xs text-[#6a6a7a]">Nenhuma tarefa</p>
                    </div>
                  ) : (
                    columnTasks.map((task) => (
                      <TaskCardKanban
                        key={task.id}
                        task={task}
                        onRun={handleRun}
                        onPause={handlePause}
                        onDelete={handleDelete}
                        onClick={setSelectedTask}
                      />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modais */}
      <CreateTaskModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />
      <TaskDetailModal
        task={selectedTask}
        onClose={() => setSelectedTask(null)}
      />
    </div>
  );
}
