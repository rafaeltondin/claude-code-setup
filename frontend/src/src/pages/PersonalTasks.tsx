// Página Minhas Tarefas — Kanban + Tabela, CRUD completo
import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ListTodo,
  Plus,
  Loader2,
  AlertCircle,
  LayoutList,
  LayoutGrid,
  Pencil,
  Trash2,
  Calendar,
  CheckCircle2,
  Clock,
  XCircle,
  CircleDot,
  CalendarCheck,
} from 'lucide-react';
import {
  usePersonalTasks,
  useCreatePersonalTask,
  useUpdatePersonalTask,
  useDeletePersonalTask,
  useUpdatePersonalTaskStatus,
  useCreateCalendarEvent,
  type PersonalTask,
} from '../api/new-hooks';
import { Modal } from '../components/Modal';
import { useToast } from '../contexts/ToastContext';
import { PageHeader, ActionButton, SectionLabel } from '../components/PageHeader';

// ─── CONSTANTES ───────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  PersonalTask['status'],
  { label: string; color: string; icon: React.ReactNode }
> = {
  pending:     { label: 'Pendente',      color: '#a855f7', icon: <Clock     size={14} /> },
  in_progress: { label: 'Em Progresso',  color: '#3b82f6', icon: <CircleDot size={14} /> },
  completed:   { label: 'Concluída',     color: '#22c55e', icon: <CheckCircle2 size={14} /> },
  cancelled:   { label: 'Cancelada',     color: '#6a6a7a', icon: <XCircle   size={14} /> },
};

const PRIORITY_CONFIG: Record<
  PersonalTask['priority'],
  { label: string; color: string; bg: string }
> = {
  high:   { label: 'Alta',   color: '#ef4444', bg: '#ef444420' },
  medium: { label: 'Média',  color: '#f59e0b', bg: '#f59e0b20' },
  low:    { label: 'Baixa',  color: '#22c55e', bg: '#22c55e20' },
};

const KANBAN_COLUMNS: { status: PersonalTask['status']; label: string; color: string }[] = [
  { status: 'pending',     label: 'Pendente',     color: '#a855f7' },
  { status: 'in_progress', label: 'Em Progresso', color: '#3b82f6' },
  { status: 'completed',   label: 'Concluída',    color: '#22c55e' },
  { status: 'cancelled',   label: 'Cancelada',    color: '#6a6a7a' },
];

// ─── UTILITÁRIOS ──────────────────────────────────────────────────────────────

function formatDate(iso?: string): string {
  if (!iso) return '—';
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  }).format(new Date(iso));
}

function isDueDateOverdue(dueDate?: string): boolean {
  if (!dueDate) return false;
  return new Date(dueDate) < new Date();
}

function parseTags(tags?: string): string[] {
  if (!tags) return [];
  try {
    const parsed = JSON.parse(tags);
    if (Array.isArray(parsed)) return parsed;
  } catch { /* noop */ }
  // Fallback: comma-separated
  return tags.split(',').map(t => t.trim()).filter(Boolean);
}

// ─── COMPONENTES AUXILIARES ───────────────────────────────────────────────────

function StatusBadge({ status }: { status: PersonalTask['status'] }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span
      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium"
      style={{
        background: `${cfg.color}20`,
        color: cfg.color,
        border: `1px solid ${cfg.color}40`,
      }}
    >
      {cfg.icon}
      {cfg.label}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: PersonalTask['priority'] }) {
  const cfg = PRIORITY_CONFIG[priority];
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold"
      style={{ background: cfg.bg, color: cfg.color }}
    >
      {cfg.label}
    </span>
  );
}

interface KpiCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: string;
}

function KpiCard({ title, value, icon, color }: KpiCardProps) {
  return (
    <div
      className="rounded-lg border border-[rgba(255,255,255,0.08)] p-5 flex items-start gap-4"
      style={{ background: '#16161f' }}
    >
      <div
        className="w-10 h-10 rounded-md flex items-center justify-center shrink-0"
        style={{ background: `${color}20`, border: `1px solid ${color}40` }}
      >
        <span style={{ color }}>{icon}</span>
      </div>
      <div>
        <p className="text-[12px] font-medium text-[#9898aa] uppercase tracking-wide mb-0.5">{title}</p>
        <p className="text-3xl font-bold text-[#f0f0f5]" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
          {value}
        </p>
      </div>
    </div>
  );
}

// ─── MODAL CRIAR / EDITAR ─────────────────────────────────────────────────────

interface TaskFormData {
  title: string;
  description: string;
  priority: PersonalTask['priority'];
  dueDate: string;
  tags: string;
}

const EMPTY_FORM: TaskFormData = {
  title:       '',
  description: '',
  priority:    'medium',
  dueDate:     '',
  tags:        '',
};

interface TaskModalProps {
  isOpen:   boolean;
  onClose:  () => void;
  editTask?: PersonalTask | null;
}

function TaskModal({ isOpen, onClose, editTask }: TaskModalProps) {
  const { showToast } = useToast();
  const createTask = useCreatePersonalTask();
  const updateTask = useUpdatePersonalTask();
  const isEditing  = !!editTask;

  const [form, setForm] = useState<TaskFormData>(() =>
    editTask
      ? {
          title:       editTask.title,
          description: editTask.description ?? '',
          priority:    editTask.priority,
          dueDate:     editTask.dueDate ? editTask.dueDate.split('T')[0] : '',
          tags:        parseTags(editTask.tags).join(', '),
        }
      : EMPTY_FORM
  );

  useEffect(() => {
    if (isOpen) {
      setForm(editTask
        ? {
            title:       editTask.title,
            description: editTask.description ?? '',
            priority:    editTask.priority,
            dueDate:     editTask.dueDate ? editTask.dueDate.split('T')[0] : '',
            tags:        parseTags(editTask.tags).join(', '),
          }
        : EMPTY_FORM
      );
    }
  }, [isOpen, editTask]);

  const set = useCallback(<K extends keyof TaskFormData>(field: K, value: TaskFormData[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      showToast('Título é obrigatório.', 'error');
      return;
    }

    const payload: Partial<PersonalTask> = {
      title:       form.title.trim(),
      description: form.description.trim() || undefined,
      priority:    form.priority,
      dueDate:     form.dueDate ? new Date(form.dueDate + 'T23:59:59').toISOString() : undefined,
      tags:        form.tags.trim()
        ? JSON.stringify(form.tags.split(',').map(t => t.trim()).filter(Boolean))
        : undefined,
    };

    try {
      if (isEditing && editTask) {
        await updateTask.mutateAsync({ id: editTask.id, data: payload });
        showToast('Tarefa atualizada!', 'success');
      } else {
        await createTask.mutateAsync({ ...payload, status: 'pending' });
        showToast('Tarefa criada!', 'success');
      }
      setForm(EMPTY_FORM);
      onClose();
    } catch {
      showToast('Erro ao salvar tarefa.', 'error');
    }
  }, [form, isEditing, editTask, createTask, updateTask, showToast, onClose]);

  const isPending = createTask.isPending || updateTask.isPending;

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => { setForm(EMPTY_FORM); onClose(); }}
      title={isEditing ? 'Editar Tarefa' : 'Nova Tarefa'}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        {/* Título */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-[#f0f0f5]">
            Título <span className="text-[#ef4444]">*</span>
          </label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => set('title', e.target.value)}
            placeholder="Ex: Revisar proposta do cliente"
            className="w-full px-3 py-2.5 rounded-md text-sm text-[#f0f0f5] placeholder-[#6a6a7a] outline-none transition-colors"
            style={{ background: '#0a0a0f', border: '1px solid rgba(255,255,255,0.08)' }}
            onFocus={(e) => (e.currentTarget.style.borderColor = '#7c6aef')}
            onBlur={(e)  => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)')}
            autoFocus
          />
        </div>

        {/* Descrição */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-[#f0f0f5]">Descrição</label>
          <textarea
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
            placeholder="Detalhes opcionais..."
            rows={3}
            className="w-full px-3 py-2.5 rounded-md text-sm text-[#f0f0f5] placeholder-[#6a6a7a] outline-none transition-colors resize-y"
            style={{ background: '#0a0a0f', border: '1px solid rgba(255,255,255,0.08)' }}
            onFocus={(e) => (e.currentTarget.style.borderColor = '#7c6aef')}
            onBlur={(e)  => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)')}
          />
        </div>

        {/* Prioridade + Vencimento */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[#f0f0f5]">Prioridade</label>
            <select
              value={form.priority}
              onChange={(e) => set('priority', e.target.value as PersonalTask['priority'])}
              className="w-full px-3 py-2.5 rounded-md text-sm text-[#f0f0f5] outline-none"
              style={{ background: '#0a0a0f', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <option value="low">Baixa</option>
              <option value="medium">Média</option>
              <option value="high">Alta</option>
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[#f0f0f5]">Vencimento</label>
            <input
              type="date"
              value={form.dueDate}
              onChange={(e) => set('dueDate', e.target.value)}
              className="w-full px-3 py-2.5 rounded-md text-sm text-[#f0f0f5] outline-none transition-colors"
              style={{
                background: '#0a0a0f',
                border: '1px solid rgba(255,255,255,0.08)',
                colorScheme: 'dark',
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = '#7c6aef')}
              onBlur={(e)  => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)')}
            />
          </div>
        </div>

        {/* Tags */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-[#f0f0f5]">Tags</label>
          <input
            type="text"
            value={form.tags}
            onChange={(e) => set('tags', e.target.value)}
            placeholder="Ex: trabalho, urgente, cliente"
            className="w-full px-3 py-2.5 rounded-md text-sm text-[#f0f0f5] placeholder-[#6a6a7a] outline-none transition-colors"
            style={{ background: '#0a0a0f', border: '1px solid rgba(255,255,255,0.08)' }}
            onFocus={(e) => (e.currentTarget.style.borderColor = '#7c6aef')}
            onBlur={(e)  => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)')}
          />
        </div>

        {/* Ações */}
        <div className="flex justify-end gap-3 pt-2 border-t border-[rgba(255,255,255,0.08)]">
          <button
            type="button"
            onClick={() => { setForm(EMPTY_FORM); onClose(); }}
            className="px-4 py-2 rounded-md text-sm text-[#9898aa] hover:text-[#f0f0f5] hover:bg-[rgba(255,255,255,0.06)] transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="px-5 py-2 rounded-md text-sm font-medium text-white flex items-center gap-2 transition-opacity disabled:opacity-60"
            style={{ background: '#7c6aef' }}
          >
            {isPending ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            {isEditing ? 'Salvar' : 'Criar Tarefa'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ─── MODAL AGENDAR NO GOOGLE CALENDAR ─────────────────────────────────────────

interface ScheduleCalendarModalProps {
  isOpen:  boolean;
  onClose: () => void;
  task:    PersonalTask | null;
}

function ScheduleCalendarModal({ isOpen, onClose, task }: ScheduleCalendarModalProps) {
  const { showToast }  = useToast();
  const createEvent    = useCreateCalendarEvent();

  const todayStr = new Date().toISOString().split('T')[0];
  const [date,      setDate]      = useState(task?.dueDate?.split('T')[0] ?? todayStr);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime,   setEndTime]   = useState('10:00');

  const handleClose = useCallback(() => {
    setStartTime('09:00'); setEndTime('10:00');
    onClose();
  }, [onClose]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!task) return;

    const start = `${date}T${startTime}:00`;
    const end   = `${date}T${endTime}:00`;
    if (end <= start) { showToast('Horário de término deve ser após o início.', 'error'); return; }

    try {
      await createEvent.mutateAsync({
        title:       task.title,
        start,
        end,
        description: task.description || undefined,
      });
      showToast('Tarefa agendada no Google Calendar!', 'success');
      handleClose();
    } catch {
      showToast('Erro ao agendar. Verifique as credenciais do Google Calendar.', 'error');
    }
  }, [task, date, startTime, endTime, createEvent, showToast, handleClose]);

  if (!task) return null;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Agendar no Google Calendar" size="md">
      <div className="flex flex-col gap-4">
        {/* Task selecionada */}
        <div
          className="rounded-lg border border-[rgba(255,255,255,0.08)] p-3 flex items-start gap-3"
          style={{ background: '#0a0a0f' }}
        >
          <CalendarCheck size={16} style={{ color: '#2563EB', marginTop: 2 }} className="shrink-0" />
          <div>
            <p className="text-sm font-medium text-[#f0f0f5]">{task.title}</p>
            {task.description && (
              <p className="text-xs text-[#6a6a7a] mt-0.5 line-clamp-2">{task.description}</p>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Data */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[#f0f0f5]">Data do evento</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2.5 rounded-md text-sm text-[#f0f0f5] outline-none"
              style={{ background: '#0a0a0f', border: '1px solid rgba(255,255,255,0.08)', colorScheme: 'dark' }}
              onFocus={(e) => (e.currentTarget.style.borderColor = '#2563EB')}
              onBlur={(e)  => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)')}
            />
          </div>

          {/* Horário */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-[#f0f0f5]">Início</label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3 py-2.5 rounded-md text-sm text-[#f0f0f5] outline-none"
                style={{ background: '#0a0a0f', border: '1px solid rgba(255,255,255,0.08)', colorScheme: 'dark' }}
                onFocus={(e) => (e.currentTarget.style.borderColor = '#2563EB')}
                onBlur={(e)  => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)')}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-[#f0f0f5]">Término</label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-3 py-2.5 rounded-md text-sm text-[#f0f0f5] outline-none"
                style={{ background: '#0a0a0f', border: '1px solid rgba(255,255,255,0.08)', colorScheme: 'dark' }}
                onFocus={(e) => (e.currentTarget.style.borderColor = '#2563EB')}
                onBlur={(e)  => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)')}
              />
            </div>
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
              disabled={createEvent.isPending}
              className="px-5 py-2 rounded-md text-sm font-medium text-white flex items-center gap-2 transition-opacity disabled:opacity-60"
              style={{ background: '#2563EB' }}
            >
              {createEvent.isPending ? <Loader2 size={14} className="animate-spin" /> : <CalendarCheck size={14} />}
              Agendar
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}

// ─── CARD KANBAN ──────────────────────────────────────────────────────────────

interface KanbanCardProps {
  task:      PersonalTask;
  onEdit:    (t: PersonalTask) => void;
  onDelete:  (id: string)      => void;
  onStatus:  (id: string, s: PersonalTask['status']) => void;
  onSchedule?: (t: PersonalTask) => void;
  isDragging?: boolean;
  onDragStart?: (e: React.DragEvent, taskId: string) => void;
  onDragEnd?:   () => void;
}

function KanbanCard({ task, onEdit, onDelete, onStatus, onSchedule, isDragging, onDragStart, onDragEnd }: KanbanCardProps) {
  const overdue = isDueDateOverdue(task.dueDate) && task.status !== 'completed';

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart?.(e, task.id)}
      onDragEnd={onDragEnd}
      className="group rounded-lg border border-[rgba(255,255,255,0.08)] p-3 flex flex-col gap-2 transition-all hover:border-[#7c6aef40] cursor-grab active:cursor-grabbing"
      style={{
        background: '#16161f',
        opacity: isDragging ? 0.4 : 1,
        transform: isDragging ? 'scale(0.95)' : 'none',
      }}
    >
      {/* Prioridade + Tags */}
      <div className="flex items-center justify-between gap-2">
        <PriorityBadge priority={task.priority} />
        {task.tags && parseTags(task.tags).length > 0 && (
          <div className="flex items-center gap-1 overflow-hidden max-w-[120px]">
            {parseTags(task.tags).slice(0, 2).map(tag => (
              <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-[rgba(255,255,255,0.06)] text-[#9898aa] truncate">{tag}</span>
            ))}
            {parseTags(task.tags).length > 2 && (
              <span className="text-[10px] text-[#6a6a7a]">+{parseTags(task.tags).length - 2}</span>
            )}
          </div>
        )}
      </div>

      {/* Título */}
      <p className="text-sm font-medium text-[#f0f0f5] leading-snug line-clamp-2">
        {task.title}
      </p>

      {/* Descrição */}
      {task.description && (
        <p className="text-xs text-[#6a6a7a] line-clamp-2">{task.description}</p>
      )}

      {/* Vencimento */}
      {task.dueDate && (
        <p
          className="text-xs flex items-center gap-1"
          style={{ color: overdue ? '#ef4444' : '#6a6a7a' }}
        >
          <Calendar size={10} />
          {formatDate(task.dueDate)}
          {overdue && <span className="text-[10px] font-semibold text-[#ef4444]">• Atrasado</span>}
        </p>
      )}

      {/* Ações */}
      <div
        className="flex items-center gap-1 border-t border-[rgba(255,255,255,0.08)] pt-2 mt-0.5"
      >
        {/* Mover para próximo status */}
        {task.status === 'pending' && (
          <button
            onClick={() => onStatus(task.id, 'in_progress')}
            className="flex-1 py-1 rounded-md text-[10px] text-[#3b82f6] hover:bg-[#3b82f620] transition-colors"
          >
            Iniciar
          </button>
        )}
        {task.status === 'in_progress' && (
          <button
            onClick={() => onStatus(task.id, 'completed')}
            className="flex-1 py-1 rounded-md text-[10px] text-[#22c55e] hover:bg-[#22c55e20] transition-colors"
          >
            Concluir
          </button>
        )}
        {(task.status === 'completed' || task.status === 'cancelled') && (
          <button
            onClick={() => onStatus(task.id, 'pending')}
            className="flex-1 py-1 rounded-md text-[10px] text-[#a855f7] hover:bg-[#a855f720] transition-colors"
          >
            Reabrir
          </button>
        )}
        <button
          onClick={() => onSchedule?.(task)}
          className="p-1.5 rounded-md text-[#6a6a7a] hover:text-[#2563EB] hover:bg-[#2563EB20] transition-colors"
          title="Agendar no Google Calendar"
        >
          <CalendarCheck size={12} />
        </button>
        <button
          onClick={() => onEdit(task)}
          className="p-1.5 rounded-md text-[#6a6a7a] hover:text-[#7c6aef] hover:bg-[#7c6aef20] transition-colors"
          title="Editar"
        >
          <Pencil size={12} />
        </button>
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

// ─── COMPONENTE PRINCIPAL ─────────────────────────────────────────────────────

export function PersonalTasks() {
  const { showToast } = useToast();

  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [view,         setView]         = useState<'kanban' | 'table'>('kanban');
  const [showModal,      setShowModal]      = useState(false);
  const [editTask,       setEditTask]       = useState<PersonalTask | null>(null);
  const [showSchedule,   setShowSchedule]   = useState(false);
  const [scheduleTask,   setScheduleTask]   = useState<PersonalTask | null>(null);
  const [draggedTaskId,  setDraggedTaskId]  = useState<string | null>(null);
  const [dragOverCol,    setDragOverCol]    = useState<string | null>(null);

  const { data: tasks = [], isLoading, isError } = usePersonalTasks(
    statusFilter !== 'all' ? { status: statusFilter } : undefined
  );

  const deleteTask    = useDeletePersonalTask();
  const updateStatus  = useUpdatePersonalTaskStatus();

  // KPIs locais (todos os status)
  const { data: allTasks = [] } = usePersonalTasks();
  const kpis = useMemo(() => ({
    total:      allTasks.length,
    pending:    allTasks.filter((t) => t.status === 'pending').length,
    in_progress: allTasks.filter((t) => t.status === 'in_progress').length,
    completed:  allTasks.filter((t) => t.status === 'completed').length,
  }), [allTasks]);

  const handleDelete = useCallback(async (id: string) => {
    const task = tasks.find((t) => t.id === id);
    if (!window.confirm(`Deletar "${task?.title ?? id}"?`)) return;
    try {
      await deleteTask.mutateAsync(id);
      showToast('Tarefa deletada.', 'success');
    } catch {
      showToast('Erro ao deletar.', 'error');
    }
  }, [tasks, deleteTask, showToast]);

  const handleStatus = useCallback(async (id: string, status: PersonalTask['status']) => {
    try {
      await updateStatus.mutateAsync({ id, status });
    } catch {
      showToast('Erro ao atualizar status.', 'error');
    }
  }, [updateStatus, showToast]);

  const handleEdit = useCallback((task: PersonalTask) => {
    setEditTask(task);
    setShowModal(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setShowModal(false);
    setEditTask(null);
  }, []);

  const handleSchedule = useCallback((task: PersonalTask) => {
    setScheduleTask(task);
    setShowSchedule(true);
  }, []);

  // ─── DRAG AND DROP ─────────────────────────────────────────────────────────

  const handleDragStart = useCallback((e: React.DragEvent, taskId: string) => {
    setDraggedTaskId(taskId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', taskId);
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggedTaskId(null);
    setDragOverCol(null);
  }, []);

  const handleColumnDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleColumnDragEnter = useCallback((status: string) => {
    setDragOverCol(status);
  }, []);

  const handleColumnDragLeave = useCallback((e: React.DragEvent) => {
    // Only clear if leaving the column itself (not entering a child)
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragOverCol(null);
    }
  }, []);

  const handleColumnDrop = useCallback(async (e: React.DragEvent, targetStatus: PersonalTask['status']) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain');
    setDraggedTaskId(null);
    setDragOverCol(null);

    if (!taskId) return;
    const task = tasks.find(t => t.id === taskId);
    if (!task || task.status === targetStatus) return;

    try {
      await updateStatus.mutateAsync({ id: taskId, status: targetStatus });
      showToast(`Tarefa movida para ${STATUS_CONFIG[targetStatus].label}`, 'success');
    } catch {
      showToast('Erro ao mover tarefa.', 'error');
    }
  }, [tasks, updateStatus, showToast]);

  // ─── LOADING / ERROR ────────────────────────────────────────────────────────

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
          <p className="text-sm text-[#6a6a7a]">Verifique a conexão com o servidor.</p>
        </div>
      </div>
    );
  }

  // ─── RENDER ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col" style={{ gap: 'var(--space-xl)' }}>

      {/* Header */}
      <PageHeader
        title="Minhas Tarefas"
        description="Organize e acompanhe suas tarefas pessoais."
        action={
          <ActionButton onClick={() => { setEditTask(null); setShowModal(true); }} icon={<Plus size={16} />}>
            Nova Tarefa
          </ActionButton>
        }
      />

      {/* KPIs */}
      <section className="flex flex-col">
        <SectionLabel>Resumo</SectionLabel>
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          <KpiCard title="Total"        value={kpis.total}       icon={<ListTodo size={18} />}      color="#7c6aef" />
          <KpiCard title="Pendentes"    value={kpis.pending}     icon={<Clock size={18} />}         color="#a855f7" />
          <KpiCard title="Em Progresso" value={kpis.in_progress} icon={<CircleDot size={18} />}     color="#3b82f6" />
          <KpiCard title="Concluídas"   value={kpis.completed}   icon={<CheckCircle2 size={18} />}  color="#22c55e" />
        </div>
      </section>

      {/* Controles */}
      <div className="flex items-center gap-3 flex-wrap">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 rounded-md text-sm text-[#f0f0f5] outline-none"
          style={{ background: '#16161f', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <option value="all">Todos os status</option>
          <option value="pending">Pendente</option>
          <option value="in_progress">Em Progresso</option>
          <option value="completed">Concluída</option>
          <option value="cancelled">Cancelada</option>
        </select>

        <span className="text-sm text-[#6a6a7a]">
          {tasks.length} {tasks.length === 1 ? 'tarefa' : 'tarefas'}
        </span>

        {/* Toggle Kanban / Tabela */}
        <div
          className="ml-auto flex items-center rounded-md overflow-hidden"
          style={{ border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <button
            onClick={() => setView('kanban')}
            className="flex items-center gap-1.5 px-3 py-2 text-sm transition-colors"
            style={{
              background: view === 'kanban' ? '#7c6aef20' : 'transparent',
              color:      view === 'kanban' ? '#7c6aef'   : '#9898aa',
            }}
          >
            <LayoutGrid size={15} /> Kanban
          </button>
          <button
            onClick={() => setView('table')}
            className="flex items-center gap-1.5 px-3 py-2 text-sm transition-colors"
            style={{
              background: view === 'table' ? '#7c6aef20' : 'transparent',
              color:      view === 'table' ? '#7c6aef'   : '#9898aa',
            }}
          >
            <LayoutList size={15} /> Tabela
          </button>
        </div>
      </div>

      {/* Conteúdo */}
      {tasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div
            className="w-14 h-14 rounded-lg flex items-center justify-center"
            style={{ background: '#7c6aef20', border: '1px solid #7c6aef40' }}
          >
            <ListTodo size={24} style={{ color: '#7c6aef' }} />
          </div>
          <div className="text-center">
            <p className="text-[#f0f0f5] font-medium">Nenhuma tarefa encontrada</p>
            <p className="text-sm text-[#6a6a7a] mt-1">Crie sua primeira tarefa pessoal.</p>
          </div>
          <button
            onClick={() => { setEditTask(null); setShowModal(true); }}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium text-white hover:opacity-90 transition-opacity"
            style={{ background: '#7c6aef' }}
          >
            <Plus size={16} /> Nova Tarefa
          </button>
        </div>
      ) : view === 'kanban' ? (

        // ── KANBAN (drag-and-drop) ─────────────────────────────────────────────
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {KANBAN_COLUMNS.map((col) => {
            const colTasks = tasks.filter((t) => t.status === col.status);
            const isOver = dragOverCol === col.status && draggedTaskId !== null;
            const draggedTask = draggedTaskId ? tasks.find(t => t.id === draggedTaskId) : null;
            const isOriginCol = draggedTask?.status === col.status;

            return (
              <div
                key={col.status}
                className="flex flex-col gap-3 rounded-xl p-2 -m-2 transition-all"
                style={{
                  background: isOver && !isOriginCol
                    ? `${col.color}08`
                    : 'transparent',
                  outline: isOver && !isOriginCol
                    ? `2px dashed ${col.color}60`
                    : '2px dashed transparent',
                }}
                onDragOver={handleColumnDragOver}
                onDragEnter={() => handleColumnDragEnter(col.status)}
                onDragLeave={handleColumnDragLeave}
                onDrop={(e) => handleColumnDrop(e, col.status)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: col.color }} />
                    <span className="text-sm font-semibold text-[#f0f0f5]">{col.label}</span>
                  </div>
                  <span
                    className="text-xs font-bold px-2 py-0.5 rounded-full"
                    style={{ background: `${col.color}20`, color: col.color }}
                  >
                    {colTasks.length}
                  </span>
                </div>
                <div className="h-0.5 rounded-full" style={{ background: `${col.color}40` }} />
                <div className="flex flex-col gap-2 min-h-[60px]">
                  {colTasks.length === 0 ? (
                    <div
                      className="rounded-lg border border-dashed p-6 flex items-center justify-center transition-all"
                      style={{
                        borderColor: isOver && !isOriginCol
                          ? `${col.color}60`
                          : 'rgba(255,255,255,0.08)',
                        background: isOver && !isOriginCol
                          ? `${col.color}10`
                          : 'transparent',
                      }}
                    >
                      <p className="text-xs text-[#6a6a7a]">
                        {isOver && !isOriginCol ? 'Solte aqui' : 'Nenhuma tarefa'}
                      </p>
                    </div>
                  ) : (
                    colTasks.map((task) => (
                      <KanbanCard
                        key={task.id}
                        task={task}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                        onStatus={handleStatus}
                        onSchedule={handleSchedule}
                        isDragging={draggedTaskId === task.id}
                        onDragStart={handleDragStart}
                        onDragEnd={handleDragEnd}
                      />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>

      ) : (

        // ── TABELA ──────────────────────────────────────────────────────────────
        <div
          className="rounded-lg border border-[rgba(255,255,255,0.08)] overflow-hidden"
          style={{ background: '#16161f' }}
        >
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                {['Título', 'Status', 'Prioridade', 'Criação', 'Vencimento', ''].map((h) => (
                  <th
                    key={h}
                    className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-[#6a6a7a]"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tasks.map((task) => {
                const overdue = isDueDateOverdue(task.dueDate) && task.status !== 'completed';
                return (
                  <tr
                    key={task.id}
                    className="group transition-colors hover:bg-[rgba(255,255,255,0.03)]"
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                  >
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-[#f0f0f5] font-medium truncate max-w-[240px]">{task.title}</p>
                        {task.description && (
                          <p className="text-xs text-[#6a6a7a] truncate max-w-[240px] mt-0.5">
                            {task.description}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={task.status} />
                    </td>
                    <td className="px-4 py-3">
                      <PriorityBadge priority={task.priority} />
                    </td>
                    <td className="px-4 py-3 text-[#9898aa] text-xs whitespace-nowrap">
                      {formatDate(task.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: overdue ? '#ef4444' : '#9898aa' }}>
                      {task.dueDate ? (
                        <span className="flex items-center gap-1">
                          <Calendar size={11} />
                          {formatDate(task.dueDate)}
                          {overdue && <span className="text-[10px] font-bold">• Atrasado</span>}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleSchedule(task)}
                          className="p-1.5 rounded-md text-[#6a6a7a] hover:text-[#2563EB] hover:bg-[#2563EB20] transition-colors"
                          title="Agendar no Google Calendar"
                        >
                          <CalendarCheck size={14} />
                        </button>
                        <button
                          onClick={() => handleEdit(task)}
                          className="p-1.5 rounded-md text-[#6a6a7a] hover:text-[#7c6aef] hover:bg-[#7c6aef20] transition-colors"
                          title="Editar"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(task.id)}
                          className="p-1.5 rounded-md text-[#6a6a7a] hover:text-[#ef4444] hover:bg-[#ef444420] transition-colors"
                          title="Deletar"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal criar/editar tarefa */}
      <TaskModal
        key={editTask?.id ?? 'new'}
        isOpen={showModal}
        onClose={handleCloseModal}
        editTask={editTask}
      />

      {/* Modal agendar no Google Calendar */}
      <ScheduleCalendarModal
        isOpen={showSchedule}
        onClose={() => { setShowSchedule(false); setScheduleTask(null); }}
        task={scheduleTask}
      />
    </div>
  );
}
