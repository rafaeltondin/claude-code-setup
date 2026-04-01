// Planejador IA — Arvore de Decisao Visual do Orchestrator
import { useState, useEffect, useCallback } from 'react';
import {
  GitBranch,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Sparkles,
  Eye,
} from 'lucide-react';
import { PageHeader, SectionLabel } from '../components/PageHeader';

const API = '/api/ai/plans';
const token = () => localStorage.getItem('auth_token') || 'local-dev-token';
const hdrs = () => ({ Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' });

interface Reflection {
  quality: number;
  issues: string[];
  suggestion: string | null;
  needsRevision: boolean;
}

interface PlanStep {
  id: string;
  name: string;
  agent: string;
  description: string;
  blockedBy: string[];
  status: string;
  error: string | null;
  reflected: boolean;
  reflection: Reflection | null;
}

interface Plan {
  id: string;
  instruction: string;
  steps: PlanStep[];
  status: string;
  createdAt: string;
  updatedAt: string;
}

const STATUS_CONFIG: Record<string, { color: string; bg: string; Icon: typeof CheckCircle }> = {
  completed:   { color: '#22c55e', bg: '#22c55e', Icon: CheckCircle },
  failed:      { color: '#ef4444', bg: '#ef4444', Icon: XCircle },
  running:     { color: '#3b82f6', bg: '#3b82f6', Icon: Loader2 },
  in_progress: { color: '#3b82f6', bg: '#3b82f6', Icon: Loader2 },
  pending:     { color: '#94a3b8', bg: '#94a3b8', Icon: Clock },
  planned:     { color: '#a78bfa', bg: '#a78bfa', Icon: Clock },
  partial:     { color: '#f59e0b', bg: '#f59e0b', Icon: Clock },
};

// ─── KPI CARD ───────────────────────────────────────────────────────────────

function KpiCard({ title, value, color }: { title: string; value: number; color: string }) {
  return (
    <div
      className="rounded-lg border border-[rgba(255,255,255,0.08)] p-5 flex items-start gap-4"
      style={{ background: '#16161f' }}
    >
      <div
        className="w-10 h-10 rounded-md flex items-center justify-center shrink-0"
        style={{ background: `${color}20`, border: `1px solid ${color}40` }}
      >
        <GitBranch size={18} style={{ color }} />
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

// ─── STEP NODE ──────────────────────────────────────────────────────────────

function StepNode({ step, allSteps }: { step: PlanStep; allSteps: PlanStep[] }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = STATUS_CONFIG[step.status] || STATUS_CONFIG.pending;
  const { Icon } = cfg;
  const deps = step.blockedBy?.map(id => allSteps.find(s => s.id === id)?.name).filter(Boolean) || [];

  return (
    <div style={{ marginBottom: 6 }}>
      <div
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2.5 rounded-lg cursor-pointer transition-colors hover:bg-[rgba(255,255,255,0.03)]"
        style={{
          padding: '10px 14px',
          background: `${cfg.bg}10`,
          border: `1px solid ${cfg.color}30`,
        }}
      >
        {expanded ? <ChevronDown size={14} style={{ color: cfg.color }} /> : <ChevronRight size={14} style={{ color: cfg.color }} />}
        <Icon
          size={16}
          style={{ color: cfg.color, flexShrink: 0 }}
          className={step.status === 'running' || step.status === 'in_progress' ? 'animate-spin' : ''}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-[13px] font-semibold text-[#f0f0f5]">
              #{step.id} {step.name}
            </span>
            {step.reflected && (
              <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded" style={{ color: '#a78bfa', background: 'rgba(167,139,250,0.15)' }}>
                <Sparkles size={10} /> Refletido
              </span>
            )}
          </div>
          <span className="text-[11px] text-[#6a6a7a]">
            Agente: {step.agent}
            {deps.length > 0 && ` | Depende: ${deps.join(', ')}`}
          </span>
        </div>
        <span
          className="text-[10px] font-bold uppercase px-2 py-0.5 rounded"
          style={{ color: cfg.color, background: `${cfg.bg}15` }}
        >
          {step.status}
        </span>
      </div>

      {expanded && (
        <div
          className="rounded-md text-[12px] text-[#9898aa]"
          style={{ marginLeft: 36, marginTop: 6, padding: '8px 12px', background: '#0a0a0f' }}
        >
          <p className="mb-1.5">{step.description}</p>
          {step.error && (
            <p className="text-[#ef4444] mt-1">Erro: {step.error}</p>
          )}
          {step.reflection && (
            <div className="mt-2 rounded-md" style={{ padding: '6px 10px', background: 'rgba(167,139,250,0.08)', border: '1px solid rgba(167,139,250,0.2)' }}>
              <div className="flex items-center gap-1 mb-1 text-[11px] font-semibold" style={{ color: '#a78bfa' }}>
                <Eye size={12} /> Self-Reflection (Qualidade: {step.reflection.quality}/10)
              </div>
              {step.reflection.issues?.length > 0 && (
                <ul className="pl-4 list-disc">
                  {step.reflection.issues.map((issue, i) => (
                    <li key={i} className="text-[11px] text-[#6a6a7a]">{issue}</li>
                  ))}
                </ul>
              )}
              {step.reflection.suggestion && (
                <p className="text-[11px] text-[#6a6a7a] mt-1">Sugestao: {step.reflection.suggestion}</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── PLAN TREE ──────────────────────────────────────────────────────────────

function PlanTree({ plan }: { plan: Plan }) {
  const [open, setOpen] = useState(false);
  const cfg = STATUS_CONFIG[plan.status] || STATUS_CONFIG.planned;

  const levels: PlanStep[][] = [];
  const placed = new Set<string>();

  const getLevel = (step: PlanStep): number => {
    if (!step.blockedBy || step.blockedBy.length === 0) return 0;
    return Math.max(...step.blockedBy.map(depId => {
      const dep = plan.steps.find(s => s.id === depId);
      return dep ? getLevel(dep) + 1 : 0;
    }));
  };

  plan.steps.forEach(step => {
    const lvl = getLevel(step);
    if (!levels[lvl]) levels[lvl] = [];
    if (!placed.has(step.id)) {
      levels[lvl].push(step);
      placed.add(step.id);
    }
  });

  const completedCount = plan.steps.filter(s => s.status === 'completed').length;
  const reflectedCount = plan.steps.filter(s => s.reflected).length;

  return (
    <div
      className="rounded-lg border border-[rgba(255,255,255,0.08)]"
      style={{ background: '#16161f', marginBottom: 10, padding: 16 }}
    >
      <div onClick={() => setOpen(!open)} className="flex items-center gap-2.5 cursor-pointer">
        {open ? <ChevronDown size={16} className="text-[#6a6a7a]" /> : <ChevronRight size={16} className="text-[#6a6a7a]" />}
        <GitBranch size={16} style={{ color: cfg.color }} />
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-semibold text-[#f0f0f5] truncate">
            {plan.instruction?.slice(0, 80)}{(plan.instruction?.length || 0) > 80 ? '...' : ''}
          </p>
          <div className="flex gap-3 mt-0.5 text-[11px] text-[#6a6a7a]">
            <span>{completedCount}/{plan.steps.length} steps</span>
            {reflectedCount > 0 && <span style={{ color: '#a78bfa' }}>{reflectedCount} refletidas</span>}
            <span>{new Date(plan.createdAt).toLocaleString('pt-BR')}</span>
          </div>
        </div>
        <span
          className="text-[10px] font-bold uppercase px-2.5 py-1 rounded"
          style={{ color: cfg.color, background: `${cfg.bg}15` }}
        >
          {plan.status}
        </span>
      </div>

      {open && (
        <div className="mt-4">
          {levels.map((lvlSteps, lvlIdx) => (
            <div key={lvlIdx} style={{ marginBottom: lvlIdx < levels.length - 1 ? 8 : 0 }}>
              {lvlSteps.length > 1 && (
                <p className="text-[10px] text-[#6a6a7a] mb-1 pl-1">
                  Nivel {lvlIdx} — {lvlSteps.length} steps paralelas
                </p>
              )}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: lvlSteps.length > 1 ? `repeat(${Math.min(lvlSteps.length, 3)}, 1fr)` : '1fr',
                  gap: 6,
                }}
              >
                {lvlSteps.map(step => (
                  <StepNode key={step.id} step={step} allSteps={plan.steps} />
                ))}
              </div>
              {lvlIdx < levels.length - 1 && (
                <div className="text-center text-[#6a6a7a] text-lg my-0.5">&#8595;</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── COMPONENTE PRINCIPAL ───────────────────────────────────────────────────

export function AgentPlanner() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPlans = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(API, { headers: hdrs() });
      if (res.ok) setPlans(await res.json());
    } catch (e) {
      console.error('Erro ao buscar planos:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPlans(); }, [fetchPlans]);

  useEffect(() => {
    const hasRunning = plans.some(p => p.status === 'running');
    if (!hasRunning) return;
    const interval = setInterval(fetchPlans, 10000);
    return () => clearInterval(interval);
  }, [plans, fetchPlans]);

  const stats = {
    total: plans.length,
    completed: plans.filter(p => p.status === 'completed').length,
    running: plans.filter(p => p.status === 'running').length,
    totalSteps: plans.reduce((sum, p) => sum + p.steps.length, 0),
    reflectedSteps: plans.reduce((sum, p) => sum + p.steps.filter(s => s.reflected).length, 0),
  };

  if (loading && plans.length === 0) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={32} className="animate-spin" style={{ color: '#7c6aef' }} />
          <p className="text-sm text-[#9898aa]">Carregando planos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col" style={{ gap: 'var(--space-xl)' }}>

      <PageHeader
        title="Planejador IA"
        description="Arvore de decisao visual das orquestracoes de agentes."
        action={
          <button
            onClick={fetchPlans}
            disabled={loading}
            className="inline-flex items-center gap-2 px-5 h-10 rounded-md text-sm font-semibold text-white hover:opacity-90 transition-all cursor-pointer disabled:opacity-50"
            style={{ background: 'var(--accent)' }}
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Atualizar
          </button>
        }
      />

      {/* KPIs */}
      <section className="flex flex-col">
        <SectionLabel>Resumo</SectionLabel>
        <div className="grid grid-cols-2 xl:grid-cols-5 gap-4">
          <KpiCard title="Planos"         value={stats.total}          color="#94a3b8" />
          <KpiCard title="Concluidos"     value={stats.completed}      color="#22c55e" />
          <KpiCard title="Em Execucao"    value={stats.running}        color="#3b82f6" />
          <KpiCard title="Total Steps"    value={stats.totalSteps}     color="#a78bfa" />
          <KpiCard title="Self-Reflected" value={stats.reflectedSteps} color="#f59e0b" />
        </div>
      </section>

      {/* Lista de Planos */}
      <section className="flex flex-col">
        <SectionLabel>Planos de Orquestracao</SectionLabel>
        {plans.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div
              className="w-14 h-14 rounded-lg flex items-center justify-center"
              style={{ background: '#7c6aef20', border: '1px solid #7c6aef40' }}
            >
              <GitBranch size={24} style={{ color: '#7c6aef' }} />
            </div>
            <div className="text-center">
              <p className="text-[#f0f0f5] font-medium">Nenhum plano encontrado</p>
              <p className="text-sm text-[#6a6a7a] mt-1">Use o Chat IA com /auto para gerar planos automaticamente.</p>
            </div>
          </div>
        ) : (
          plans.map(plan => <PlanTree key={plan.id} plan={plan} />)
        )}
      </section>
    </div>
  );
}
