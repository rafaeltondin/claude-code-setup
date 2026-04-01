// Dashboard — Ecosystem + Finanças
import {
  CheckSquare,
  Clock,
  Play,
  BarChart3,
  Loader2,
  AlertCircle,
  Wallet,
  TrendingUp,
} from 'lucide-react';
import { useEcoStatus } from '../api/ecosystem-hooks';
import { PageHeader, SectionLabel } from '../components/PageHeader';

// ─── TIPOS ────────────────────────────────────────────────────────────────────

interface KpiCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  subtitle?: string;
}

// ─── COMPONENTES AUXILIARES ───────────────────────────────────────────────────

function KpiCard({ title, value, icon, color, subtitle }: KpiCardProps) {
  return (
    <div
      className="rounded-lg border border-[rgba(255,255,255,0.08)] flex items-start"
      style={{ background: 'var(--surface)', padding: 'var(--space-lg)', gap: 'var(--space-md)', minHeight: '120px' }}
    >
      <div
        className="w-12 h-12 rounded-md flex items-center justify-center shrink-0"
        style={{ background: `${color}1a`, border: `1px solid ${color}40` }}
      >
        <span style={{ color }}>{icon}</span>
      </div>
      <div className="flex-1 min-w-0 flex flex-col" style={{ gap: 'var(--space-sm)' }}>
        <p className="text-[13px] font-medium text-[#9898aa] uppercase tracking-wide truncate">
          {title}
        </p>
        <p
          className="text-4xl font-bold text-[#f0f0f5]"
          style={{ fontFamily: 'JetBrains Mono, monospace' }}
        >
          {value}
        </p>
        {subtitle && (
          <p className="text-xs text-[#6a6a7a]">{subtitle}</p>
        )}
      </div>
    </div>
  );
}

// ─── COMPONENTE PRINCIPAL ─────────────────────────────────────────────────────

export function Dashboard() {
  const { data: ecoStatus, isLoading: ecoLoading, error: ecoError } = useEcoStatus();

  const eco = ecoStatus ?? {
    running: false,
    totalTasks: 0,
    scheduledTasks: 0,
    runningTasks: 0,
    completedTasks: 0,
    failedTasks: 0,
    successRate: 0,
  };

  if (ecoLoading) {
    return (
      <div className="flex items-center justify-center h-64 gap-3">
        <Loader2 size={24} className="animate-spin text-[#7c6aef]" />
        <span className="text-[#9898aa] text-sm">Carregando dashboard...</span>
      </div>
    );
  }

  if (ecoError) {
    return (
      <div className="flex items-center gap-3 p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
        <AlertCircle size={18} className="shrink-0" />
        <span>Erro ao carregar dashboard: {ecoError.message}</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col" style={{ gap: 'var(--space-xl)' }}>

      <PageHeader
        title="Dashboard"
        description="Visão geral do Ecosystem"
        breadcrumb={[{ label: 'Dashboard' }]}
      />

      {/* Seção Ecosystem */}
      <section className="flex flex-col">
        <SectionLabel>Ecosystem — Automação</SectionLabel>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4" style={{ gap: 'var(--space-lg)' }}>
          <KpiCard
            title="Total de Tarefas"
            value={eco.totalTasks}
            icon={<CheckSquare size={20} />}
            color="#7c6aef"
            subtitle="Cadastradas"
          />
          <KpiCard
            title="Agendadas"
            value={eco.scheduledTasks}
            icon={<Clock size={20} />}
            color="#a855f7"
            subtitle="Aguardando execução"
          />
          <KpiCard
            title="Executando"
            value={eco.runningTasks}
            icon={<Play size={20} />}
            color="#F97316"
            subtitle={eco.running ? 'Scheduler ativo' : 'Scheduler pausado'}
          />
          <KpiCard
            title="Taxa de Sucesso"
            value={`${(eco.successRate ?? 0).toFixed(1)}%`}
            icon={<BarChart3 size={20} />}
            color="#22c55e"
            subtitle={`${eco.completedTasks} concluídas`}
          />
        </div>
      </section>

      {/* Atalhos rápidos */}
      <section className="flex flex-col">
        <SectionLabel>Atalhos</SectionLabel>

        <div className="grid grid-cols-1 sm:grid-cols-3" style={{ gap: 'var(--space-lg)' }}>
          <a
            href="/finance"
            className="rounded-lg border border-[rgba(255,255,255,0.08)] p-6 flex items-center gap-4 transition-all hover:border-[#7c6aef40]"
            style={{ background: 'var(--surface)' }}
          >
            <Wallet size={24} style={{ color: '#22c55e' }} />
            <div>
              <p className="text-sm font-semibold text-[#f0f0f5]">Financeiro</p>
              <p className="text-xs text-[#6a6a7a]">Receitas, despesas e metas</p>
            </div>
          </a>
          <a
            href="/personal-tasks"
            className="rounded-lg border border-[rgba(255,255,255,0.08)] p-6 flex items-center gap-4 transition-all hover:border-[#7c6aef40]"
            style={{ background: 'var(--surface)' }}
          >
            <CheckSquare size={24} style={{ color: '#a855f7' }} />
            <div>
              <p className="text-sm font-semibold text-[#f0f0f5]">Minhas Tarefas</p>
              <p className="text-xs text-[#6a6a7a]">Tarefas pessoais e projetos</p>
            </div>
          </a>
          <a
            href="/notes"
            className="rounded-lg border border-[rgba(255,255,255,0.08)] p-6 flex items-center gap-4 transition-all hover:border-[#7c6aef40]"
            style={{ background: 'var(--surface)' }}
          >
            <TrendingUp size={24} style={{ color: '#F97316' }} />
            <div>
              <p className="text-sm font-semibold text-[#f0f0f5]">Notas</p>
              <p className="text-xs text-[#6a6a7a]">Anotações e ideias</p>
            </div>
          </a>
        </div>
      </section>

    </div>
  );
}
