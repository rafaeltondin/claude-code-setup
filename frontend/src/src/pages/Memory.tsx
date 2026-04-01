// Página de Sessões de Memória — histórico de contexto de trabalho
import { useState, useMemo } from 'react';
import {
  Brain,
  Plus,
  Trash2,
  CheckCircle2,
  Clock,
  ChevronRight,
  Loader2,
  GitBranch,
  ListChecks,
  Layers,
  Flag,
  Circle,
  AlertCircle,
} from 'lucide-react';
import { Modal } from '../components/Modal';
import { useToast } from '../contexts/ToastContext';
import { PageHeader, ActionButton, SectionLabel } from '../components/PageHeader';
import {
  useMemorySessions,
  useMemorySession,
  useMemoryStats,
  useCreateMemorySession,
  useFinalizeMemorySession,
  useDeleteMemorySession,
  useCreateCheckpoint,
} from '../api/ecosystem-hooks';
import type { MemorySession, MemoryTask, MemoryCheckpoint } from '../types';

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDateShort(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ─── KPI CARD ─────────────────────────────────────────────────────────────────

interface KpiCardProps {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  color: string;
  sub?: string;
}

function KpiCard({ label, value, icon, color, sub }: KpiCardProps) {
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
        <p className="text-[13px] font-medium text-[#6a6a7a] uppercase tracking-wide mb-1">{label}</p>
        <p className="text-4xl font-bold text-[#f0f0f5]" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
          {value}
        </p>
        {sub && <p className="text-[13px] text-[#6a6a7a] mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ─── TASK STATUS ICON ─────────────────────────────────────────────────────────

function TaskStatusIcon({ status }: { status: MemoryTask['status'] }) {
  if (status === 'completed') return <CheckCircle2 size={14} className="text-green-400 shrink-0" />;
  if (status === 'in_progress') return <Clock size={14} className="text-[#9080f5] shrink-0 animate-pulse" />;
  return <Circle size={14} className="text-[#6a6a7a] shrink-0" />;
}

function taskStatusLabel(status: MemoryTask['status']): string {
  if (status === 'completed') return 'Concluída';
  if (status === 'in_progress') return 'Em andamento';
  return 'Pendente';
}

// ─── SESSION DETAIL MODAL ─────────────────────────────────────────────────────

interface SessionDetailModalProps {
  sessionId: string;
  onClose: () => void;
}

function SessionDetailModal({ sessionId, onClose }: SessionDetailModalProps) {
  const { showToast } = useToast();
  const { data: session, isLoading } = useMemorySession(sessionId);
  const finalizeMutation = useFinalizeMemorySession();
  const checkpointMutation = useCreateCheckpoint();
  const [checkpointText, setCheckpointText] = useState('');
  const [addingCheckpoint, setAddingCheckpoint] = useState(false);

  async function handleFinalize() {
    try {
      await finalizeMutation.mutateAsync(sessionId);
      showToast('Sessão finalizada com sucesso', 'success');
      onClose();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Erro ao finalizar sessão', 'error');
    }
  }

  async function handleAddCheckpoint() {
    const desc = checkpointText.trim();
    if (!desc) return;
    try {
      await checkpointMutation.mutateAsync({ sessionId, description: desc });
      showToast('Checkpoint registrado', 'success');
      setCheckpointText('');
      setAddingCheckpoint(false);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Erro ao criar checkpoint', 'error');
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-40">
        <Loader2 size={24} className="animate-spin text-[#9080f5]" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex items-center justify-center h-40 gap-2 text-[#9898aa]">
        <AlertCircle size={18} />
        <span className="text-sm">Sessão não encontrada</span>
      </div>
    );
  }

  const tasks = session.tasks ?? [];
  const checkpoints = session.checkpoints ?? [];
  const completedTasks = tasks.filter((t) => t.status === 'completed').length;

  return (
    <div className="flex flex-col gap-5">
      {/* Info principal */}
      <div className="rounded-md border border-[rgba(255,255,255,0.08)] p-4 flex flex-col gap-2" style={{ background: '#0a0a0f' }}>
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm text-xs font-medium ${
              session.status === 'active'
                ? 'bg-green-500/15 text-green-400 border border-green-500/25'
                : 'bg-[rgba(255,255,255,0.06)] text-[#9898aa] border border-[rgba(255,255,255,0.06)]'
            }`}
          >
            {session.status === 'active' && (
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            )}
            {session.status === 'active' ? 'Ativa' : 'Finalizada'}
          </span>
          {session.phase && (
            <span className="px-2 py-0.5 rounded-sm text-xs bg-[rgba(255,255,255,0.06)] text-[#9898aa] border border-[rgba(255,255,255,0.06)]">
              Fase: {session.phase}
            </span>
          )}
        </div>
        {session.project && (
          <p className="text-sm font-semibold text-[#f0f0f5]">{session.project}</p>
        )}
        {session.objective && (
          <p className="text-xs text-[#9898aa] leading-relaxed">{session.objective}</p>
        )}
        <div className="flex items-center gap-4 mt-1">
          <span className="text-xs text-[#6a6a7a]">Iniciada: {formatDate(session.startedAt)}</span>
          {session.finalizedAt && (
            <span className="text-xs text-[#6a6a7a]">Finalizada: {formatDate(session.finalizedAt)}</span>
          )}
        </div>
      </div>

      {/* Tasks */}
      {tasks.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-[13px] font-semibold text-[#9898aa] flex items-center gap-1.5">
              <ListChecks size={13} />
              Tasks ({completedTasks}/{tasks.length})
            </h3>
          </div>
          <div className="flex flex-col gap-1.5">
            {tasks.map((task) => (
              <div
                key={task.id}
                className="rounded-md border border-[rgba(255,255,255,0.06)] px-3 py-2 flex items-start gap-2.5"
                style={{ background: '#0a0a0f' }}
              >
                <TaskStatusIcon status={task.status} />
                <div className="min-w-0">
                  <p className={`text-xs font-medium ${task.status === 'completed' ? 'line-through text-[#6a6a7a]' : 'text-[#f0f0f5]'}`}>
                    {task.title}
                  </p>
                  {task.description && (
                    <p className="text-xs text-[#6a6a7a] mt-0.5">{task.description}</p>
                  )}
                  <p className="text-xs text-[#6a6a7a] mt-0.5">{taskStatusLabel(task.status)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Timeline de checkpoints */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-[13px] font-semibold text-[#9898aa] flex items-center gap-1.5">
            <GitBranch size={13} />
            Checkpoints ({checkpoints.length})
          </h3>
          {session.status === 'active' && (
            <button
              onClick={() => setAddingCheckpoint((v) => !v)}
              className="text-xs text-[#9080f5] hover:text-cyan-300 transition-colors"
            >
              + Adicionar
            </button>
          )}
        </div>

        {addingCheckpoint && (
          <div className="mb-3 flex gap-2">
            <input
              value={checkpointText}
              onChange={(e) => setCheckpointText(e.target.value)}
              placeholder="Descreva o checkpoint..."
              className="flex-1 px-3 py-2.5 bg-[#0a0a0f] border border-[rgba(255,255,255,0.06)] rounded-md text-xs text-[#f0f0f5] placeholder-[#6a6a7a] focus:outline-none focus:border-cyan-500/50"
              onKeyDown={(e) => e.key === 'Enter' && handleAddCheckpoint()}
            />
            <button
              onClick={handleAddCheckpoint}
              disabled={checkpointMutation.isPending || !checkpointText.trim()}
              className="px-5 py-2.5 rounded-md text-xs font-semibold text-white transition-colors disabled:opacity-50"
              style={{ background: '#7c6aef' }}
            >
              {checkpointMutation.isPending ? <Loader2 size={12} className="animate-spin" /> : 'Salvar'}
            </button>
          </div>
        )}

        {checkpoints.length === 0 ? (
          <p className="text-xs text-[#6a6a7a] text-center py-4">Nenhum checkpoint registrado</p>
        ) : (
          <div className="relative pl-4">
            <div className="absolute left-1.5 top-1 bottom-1 w-px bg-[rgba(255,255,255,0.06)]" />
            <div className="flex flex-col gap-3">
              {checkpoints.map((cp: MemoryCheckpoint, idx) => (
                <div key={cp.id} className="relative">
                  <div
                    className="absolute -left-3 top-1.5 w-2 h-2 rounded-full border-2"
                    style={{
                      background: idx === 0 ? '#9080f5' : 'rgba(255,255,255,0.06)',
                      borderColor: idx === 0 ? '#9080f5' : '#6a6a7a',
                    }}
                  />
                  <div
                    className="rounded-md border border-[rgba(255,255,255,0.06)] px-3 py-2"
                    style={{ background: '#0a0a0f' }}
                  >
                    <p className="text-xs text-[#f0f0f5]">{cp.description}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {cp.phase && (
                        <span className="text-xs text-[#6a6a7a]">Fase: {cp.phase}</span>
                      )}
                      <span className="text-xs text-[#6a6a7a]">{formatDateShort(cp.createdAt)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Ações */}
      <div className="flex justify-end gap-3 pt-2 border-t border-[rgba(255,255,255,0.06)]">
        <button
          onClick={onClose}
          className="px-5 py-2.5 rounded-md text-sm text-[#9898aa] border border-[rgba(255,255,255,0.08)] hover:border-[#7c6aef]/40 hover:text-[#f0f0f5] transition-colors"
        >
          Fechar
        </button>
        {session.status === 'active' && (
          <button
            onClick={handleFinalize}
            disabled={finalizeMutation.isPending}
            className="flex items-center gap-2 px-5 py-2.5 rounded-md text-sm font-semibold text-white transition-colors disabled:opacity-60"
            style={{ background: '#22c55e' }}
          >
            {finalizeMutation.isPending && <Loader2 size={14} className="animate-spin" />}
            <Flag size={14} />
            Finalizar Sessão
          </button>
        )}
      </div>
    </div>
  );
}

// ─── SESSION CARD ─────────────────────────────────────────────────────────────

interface SessionCardProps {
  session: MemorySession;
  onClick: () => void;
  onDelete: () => void;
}

function SessionCard({ session, onClick, onDelete }: SessionCardProps) {
  const checkpointCount = session.checkpoints?.length ?? 0;
  const taskCount = session.tasks?.length ?? 0;
  const completedCount = session.tasks?.filter((t) => t.status === 'completed').length ?? 0;

  return (
    <div
      className="rounded-lg border border-[rgba(255,255,255,0.08)] p-6 flex flex-col gap-3 cursor-pointer hover:border-[#7c6aef]/50 transition-all group"
      style={{ background: '#16161f' }}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {session.status === 'active' ? (
            <span className="flex items-center gap-1.5 shrink-0 px-2 py-0.5 rounded-sm text-xs font-medium bg-green-500/15 text-green-400 border border-green-500/25">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              Ativa
            </span>
          ) : (
            <span className="shrink-0 px-2 py-0.5 rounded-sm text-xs font-medium bg-[rgba(255,255,255,0.06)] text-[#9898aa] border border-[rgba(255,255,255,0.06)]">
              Finalizada
            </span>
          )}
          {session.phase && (
            <span className="truncate text-xs text-[#6a6a7a]">Fase: {session.phase}</span>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="p-1.5 rounded hover:bg-red-500/10 text-[#6a6a7a] hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
            title="Excluir sessão"
            aria-label="Excluir sessão"
          >
            <Trash2 size={13} />
          </button>
          <ChevronRight size={14} className="text-[#6a6a7a] group-hover:text-[#9898aa] transition-colors" />
        </div>
      </div>

      {/* Projeto / objetivo */}
      <div className="min-w-0">
        <p className="text-[15px] font-semibold text-[#f0f0f5] truncate">
          {session.project ?? session.objective ?? session.id}
        </p>
        {session.project && session.objective && (
          <p className="text-sm text-[#9898aa] mt-0.5 line-clamp-2 leading-relaxed">
            {session.objective}
          </p>
        )}
      </div>

      {/* Métricas */}
      <div className="flex items-center gap-5">
        <div className="flex items-center gap-1.5 text-[13px] text-[#6a6a7a]">
          <GitBranch size={12} />
          <span>{checkpointCount} checkpoint{checkpointCount !== 1 ? 's' : ''}</span>
        </div>
        {taskCount > 0 && (
          <div className="flex items-center gap-1.5 text-[13px] text-[#6a6a7a]">
            <ListChecks size={12} />
            <span>{completedCount}/{taskCount} tasks</span>
          </div>
        )}
      </div>

      {/* Datas */}
      <div className="flex items-center justify-between text-[13px] text-[#6a6a7a] border-t border-[rgba(255,255,255,0.05)] pt-2 mt-auto">
        <span>Início: {formatDateShort(session.startedAt)}</span>
        {session.finalizedAt && (
          <span>Fim: {formatDateShort(session.finalizedAt)}</span>
        )}
      </div>
    </div>
  );
}

// ─── COMPONENTE PRINCIPAL ─────────────────────────────────────────────────────

export function Memory() {
  const { showToast } = useToast();

  const { data: sessions = [], isLoading, isError, error, refetch: refetchSessions } = useMemorySessions();
  const { data: stats } = useMemoryStats();
  const createMutation = useCreateMemorySession();
  const deleteMutation = useDeleteMemorySession();

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [detailSessionId, setDetailSessionId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [newProject, setNewProject] = useState('');
  const [newObjective, setNewObjective] = useState('');

  const activeSessions = useMemo(
    () => sessions.filter((s) => s.status === 'active'),
    [sessions]
  );
  const totalCheckpoints = useMemo(
    () => sessions.reduce((acc, s) => acc + (s.checkpoints?.length ?? 0), 0),
    [sessions]
  );

  function openCreate() {
    setNewProject('');
    setNewObjective('');
    setCreateModalOpen(true);
  }

  async function handleCreate() {
    try {
      await createMutation.mutateAsync({
        project: newProject.trim() || undefined,
        objective: newObjective.trim() || undefined,
      });
      showToast('Sessão criada com sucesso', 'success');
      setCreateModalOpen(false);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Erro ao criar sessão', 'error');
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteMutation.mutateAsync(id);
      showToast('Sessão removida', 'success');
      setDeleteId(null);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Erro ao deletar sessão', 'error');
    }
  }

  return (
    <div className="flex flex-col" style={{ gap: 'var(--space-xl)' }}>
      {/* Header */}
      <PageHeader
        title="Memória"
        description={`${sessions.length} sess${sessions.length !== 1 ? 'ões' : 'ão'} registrada${sessions.length !== 1 ? 's' : ''}`}
        breadcrumb={[{ label: 'Home', to: '/' }, { label: 'Memória' }]}
        action={
          <ActionButton
            onClick={openCreate}
            icon={<Plus size={16} />}
          >
            Nova Sessão
          </ActionButton>
        }
      />

      {/* KPI Cards */}
      <section className="flex flex-col">
        <SectionLabel>Métricas</SectionLabel>
      <div className="grid grid-cols-1 sm:grid-cols-3" style={{ gap: 'var(--space-lg)' }}>
        <KpiCard
          label="Total de Sessões"
          value={stats?.totalSessions ?? sessions.length}
          icon={<Brain size={20} />}
          color="#7c6aef"
          sub={`${stats?.avgTasksPerSession?.toFixed(1) ?? '—'} tasks/sessão em média`}
        />
        <KpiCard
          label="Sessões Ativas"
          value={stats?.activeSessions ?? activeSessions.length}
          icon={<Layers size={20} />}
          color="#22c55e"
        />
        <KpiCard
          label="Total de Checkpoints"
          value={stats?.totalCheckpoints ?? totalCheckpoints}
          icon={<GitBranch size={20} />}
          color="#9080f5"
        />
      </div>
      </section>

      {/* Lista de sessões */}
      {isLoading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 size={24} className="animate-spin text-[#9080f5]" />
        </div>
      ) : isError ? (
        <div className="flex flex-col gap-3 p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-sm">
          <div className="flex items-center gap-3 text-red-400">
            <AlertCircle size={18} />
            Erro ao carregar sessões: {error instanceof Error ? error.message : 'Erro desconhecido'}
          </div>
          <button
            onClick={() => refetchSessions()}
            className="self-start text-xs text-[#9080f5] hover:text-[#7c6aef] transition-colors"
          >
            Tentar novamente
          </button>
        </div>
      ) : sessions.length === 0 ? (
        <div
          className="text-center py-16 rounded-lg border border-[rgba(255,255,255,0.08)] flex flex-col items-center gap-3"
          style={{ background: '#16161f' }}
        >
          <Brain size={48} className="text-[rgba(255,255,255,0.08)]" />
          <p className="text-[#9898aa] text-[15px]">Nenhuma sessão registrada</p>
          <button
            onClick={openCreate}
            className="text-[14px] text-[#9080f5] hover:text-cyan-300 transition-colors"
          >
            Criar primeira sessão
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3" style={{ gap: 'var(--space-lg)' }}>
          {sessions.map((session) => (
            <SessionCard
              key={session.id}
              session={session}
              onClick={() => setDetailSessionId(session.id)}
              onDelete={() => setDeleteId(session.id)}
            />
          ))}
        </div>
      )}

      {/* Modal — Nova Sessão */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Nova Sessão de Memória"
        size="md"
      >
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label htmlFor="mem-project" className="text-[13px] font-medium text-[#9898aa]">
              Projeto
            </label>
            <input
              id="mem-project"
              value={newProject}
              onChange={(e) => setNewProject(e.target.value)}
              placeholder="Ex: CRM Prospecção IA"
              className="px-3 py-2.5 bg-[#0a0a0f] border border-[rgba(255,255,255,0.08)] rounded-md text-sm text-[#f0f0f5] placeholder-[#6a6a7a] focus:outline-none focus:border-[#7c6aef]/60 transition-colors"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="mem-objective" className="text-[13px] font-medium text-[#9898aa]">
              Objetivo
            </label>
            <textarea
              id="mem-objective"
              value={newObjective}
              onChange={(e) => setNewObjective(e.target.value)}
              placeholder="Descreva o objetivo desta sessão..."
              rows={3}
              className="px-3 py-2.5 bg-[#0a0a0f] border border-[rgba(255,255,255,0.08)] rounded-md text-sm text-[#f0f0f5] placeholder-[#6a6a7a] focus:outline-none focus:border-[#7c6aef]/60 transition-colors resize-none"
            />
          </div>
          <div className="flex justify-end gap-3 pt-1">
            <button
              onClick={() => setCreateModalOpen(false)}
              className="px-5 py-2.5 rounded-md text-sm text-[#9898aa] border border-[rgba(255,255,255,0.08)] hover:border-[#7c6aef]/40 hover:text-[#f0f0f5] transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleCreate}
              disabled={createMutation.isPending}
              className="flex items-center gap-2 px-5 py-2.5 rounded-md text-sm font-semibold text-white transition-colors disabled:opacity-60 hover:opacity-90"
              style={{ background: '#7c6aef' }}
            >
              {createMutation.isPending && <Loader2 size={14} className="animate-spin" />}
              Criar Sessão
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal — Detalhes da sessão */}
      <Modal
        isOpen={!!detailSessionId}
        onClose={() => setDetailSessionId(null)}
        title="Detalhes da Sessão"
        size="xl"
      >
        {detailSessionId && (
          <SessionDetailModal
            sessionId={detailSessionId}
            onClose={() => setDetailSessionId(null)}
          />
        )}
      </Modal>

      {/* Modal — Confirmação de exclusão */}
      <Modal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        title="Excluir Sessão"
        size="sm"
      >
        <p className="text-[#9898aa] text-sm mb-5">
          Tem certeza que deseja excluir esta sessão? Todos os checkpoints e tasks serão removidos permanentemente.
        </p>
        <div className="flex justify-end gap-3">
          <button
            onClick={() => setDeleteId(null)}
            className="px-5 py-2.5 rounded-md text-sm text-[#9898aa] border border-[rgba(255,255,255,0.08)] hover:border-[#7c6aef]/40 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={() => deleteId && handleDelete(deleteId)}
            disabled={deleteMutation.isPending}
            className="flex items-center gap-2 px-5 py-2.5 rounded-md text-sm font-semibold text-white bg-red-500 hover:bg-red-600 transition-colors disabled:opacity-60"
          >
            {deleteMutation.isPending && <Loader2 size={14} className="animate-spin" />}
            Excluir
          </button>
        </div>
      </Modal>
    </div>
  );
}
