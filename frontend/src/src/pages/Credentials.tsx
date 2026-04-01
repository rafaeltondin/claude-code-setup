// Página de Credenciais — visualização segura (sem expor valores)
import { useMemo } from 'react';
import { KeyRound, ShieldCheck, ShieldAlert, Clock, Loader2, Lock, AlertCircle } from 'lucide-react';
import { useCredentials } from '../api/ecosystem-hooks';
import { PageHeader, SectionLabel } from '../components/PageHeader';
import type { Credential } from '../types';

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

/** Extrai o prefixo de um nome de credencial (ex: FB_ → FB_) */
function extractPrefix(name: string): string {
  const match = name.match(/^([A-Z0-9]+_)/);
  return match ? match[1] : 'OUTROS';
}

/** Rótulo amigável para cada prefixo */
const PREFIX_LABELS: Record<string, string> = {
  'FB_': 'Meta / Facebook Ads',
  'SHOPIFY_': 'Shopify',
  'PINHA_': 'Pinha Shopify',
  'FACT_': 'Fact Shopify',
  'FIBER_': 'Fiber',
  'EVOLUTION_': 'Evolution API',
  'GOOGLE_': 'Google',
  'SERVER_': 'Servidor',
  'VNC_': 'VNC',
  'OUTROS': 'Outras Credenciais',
};

function prefixLabel(prefix: string): string {
  return PREFIX_LABELS[prefix] ?? prefix.replace(/_$/, '');
}

/** Cor de acento por grupo */
const PREFIX_COLORS: Record<string, string> = {
  'FB_': '#7c6aef',
  'SHOPIFY_': '#22c55e',
  'PINHA_': '#a855f7',
  'FACT_': '#f59e0b',
  'FIBER_': '#9080f5',
  'EVOLUTION_': '#10b981',
  'GOOGLE_': '#ef4444',
  'SERVER_': '#9898aa',
  'VNC_': '#9898aa',
  'OUTROS': '#6a6a7a',
};

function prefixColor(prefix: string): string {
  return PREFIX_COLORS[prefix] ?? '#6a6a7a';
}

// ─── KPI CARD ─────────────────────────────────────────────────────────────────

interface KpiCardProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
}

function KpiCard({ label, value, icon, color }: KpiCardProps) {
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
      <div>
        <p className="text-[13px] font-medium text-[#6a6a7a] uppercase tracking-wide mb-1">{label}</p>
        <p className="text-4xl font-bold text-[#f0f0f5]" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
          {value}
        </p>
      </div>
    </div>
  );
}

// ─── CREDENTIAL CARD ─────────────────────────────────────────────────────────

function CredentialCard({ cred }: { cred: Credential }) {
  return (
    <div
      className="rounded-lg border p-5 flex flex-col gap-3 transition-colors"
      style={{
        background: '#16161f',
        borderColor: cred.hasValue ? 'rgba(255,255,255,0.08)' : '#ef444420',
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className="w-8 h-8 rounded-md flex items-center justify-center shrink-0"
            style={{
              background: cred.hasValue ? '#22c55e18' : '#ef444418',
              border: `1px solid ${cred.hasValue ? '#22c55e30' : '#ef444430'}`,
            }}
          >
            {cred.hasValue ? (
              <ShieldCheck size={14} className="text-green-400" />
            ) : (
              <ShieldAlert size={14} className="text-red-400" />
            )}
          </div>
          <p className="text-[13px] font-semibold text-[#f0f0f5] font-mono truncate">{cred.name}</p>
        </div>
        <span
          className={`shrink-0 px-2 py-0.5 rounded-sm text-xs font-medium border ${
            cred.hasValue
              ? 'bg-green-500/10 text-green-400 border-green-500/20'
              : 'bg-red-500/10 text-red-400 border-red-500/20'
          }`}
        >
          {cred.hasValue ? 'Configurada' : 'Pendente'}
        </span>
      </div>

      {/* Descrição */}
      {cred.description && (
        <p className="text-sm text-[#9898aa] leading-relaxed">{cred.description}</p>
      )}

      {/* Categoria */}
      {cred.category && (
        <span className="self-start px-2 py-0.5 rounded-sm text-xs bg-[rgba(255,255,255,0.06)] text-[#9898aa] border border-[rgba(255,255,255,0.08)]">
          {cred.category}
        </span>
      )}

      {/* Valor mascarado */}
      <div
        className="flex items-center gap-1.5 px-2 py-1.5 rounded-md"
        style={{ background: 'rgba(255,255,255,0.04)' }}
      >
        <Lock size={11} className="text-[#6a6a7a] shrink-0" />
        <span className="text-xs text-[#6a6a7a] font-mono tracking-widest">
          {cred.hasValue ? '••••••••••••' : 'não configurado'}
        </span>
      </div>

      {/* Última vez usada */}
      {cred.lastUsed && (
        <div className="flex items-center gap-1 text-[13px] text-[#6a6a7a]">
          <Clock size={11} />
          <span>Usado em {formatDate(cred.lastUsed)}</span>
        </div>
      )}
    </div>
  );
}

// ─── CREDENTIAL GROUP ─────────────────────────────────────────────────────────

interface CredentialGroupProps {
  prefix: string;
  credentials: Credential[];
}

function CredentialGroup({ prefix, credentials }: CredentialGroupProps) {
  const configured = credentials.filter((c) => c.hasValue).length;
  const total = credentials.length;
  const pct = total > 0 ? Math.round((configured / total) * 100) : 0;
  const color = prefixColor(prefix);

  return (
    <section className="flex flex-col gap-5">
      {/* Header do grupo */}
      <div
        className="flex items-center justify-between px-5 py-4 rounded-lg border border-[rgba(255,255,255,0.08)]"
        style={{ background: '#16161f' }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: `${color}18`, border: `1px solid ${color}30` }}
          >
            <KeyRound size={15} style={{ color }} />
          </div>
          <div>
            <p className="text-sm font-semibold text-[#f0f0f5]">{prefixLabel(prefix)}</p>
            <p className="text-xs text-[#6a6a7a]">{configured}/{total} configuradas</p>
          </div>
        </div>

        {/* Barra de progresso */}
        <div className="flex flex-col items-end gap-1 min-w-[120px]">
          <span className="text-xs font-medium" style={{ color }}>
            {pct}%
          </span>
          <div className="w-28 h-1.5 rounded-sm bg-[rgba(255,255,255,0.08)] overflow-hidden">
            <div
              className="h-full rounded-sm transition-all duration-500"
              style={{ width: `${pct}%`, background: color }}
            />
          </div>
        </div>
      </div>

      {/* Cards de credenciais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pl-2">
        {credentials.map((cred) => (
          <CredentialCard key={cred.id} cred={cred} />
        ))}
      </div>
    </section>
  );
}

// ─── COMPONENTE PRINCIPAL ─────────────────────────────────────────────────────

export function Credentials() {
  const { data: credentials = [], isLoading, isError, error, refetch: refetchCredentials } = useCredentials();

  const configured = useMemo(() => credentials.filter((c) => c.hasValue).length, [credentials]);
  const pending = useMemo(() => credentials.filter((c) => !c.hasValue).length, [credentials]);

  /** Agrupar por prefixo preservando a ordem de aparição */
  const groups = useMemo(() => {
    const map = new Map<string, Credential[]>();
    for (const cred of credentials) {
      const prefix = cred.prefix ?? extractPrefix(cred.name);
      if (!map.has(prefix)) map.set(prefix, []);
      map.get(prefix)!.push(cred);
    }
    return map;
  }, [credentials]);

  return (
    <div className="flex flex-col" style={{ gap: 'var(--space-xl)' }}>
      {/* Header */}
      <PageHeader
        title="Credenciais"
        description={`${credentials.length} credencial${credentials.length !== 1 ? 'is' : ''} no vault`}
        breadcrumb={[{ label: 'Home', to: '/' }, { label: 'Credenciais' }]}
      />

      {/* KPI Cards */}
      <section className="flex flex-col">
        <SectionLabel>Métricas</SectionLabel>
      <div className="grid grid-cols-1 sm:grid-cols-3" style={{ gap: 'var(--space-lg)' }}>
        <KpiCard
          label="Total de Credenciais"
          value={credentials.length}
          icon={<KeyRound size={20} />}
          color="#7c6aef"
        />
        <KpiCard
          label="Configuradas"
          value={configured}
          icon={<ShieldCheck size={20} />}
          color="#22c55e"
        />
        <KpiCard
          label="Pendentes"
          value={pending}
          icon={<ShieldAlert size={20} />}
          color="#ef4444"
        />
      </div>
      </section>

      {/* Aviso de segurança */}
      <div
        className="flex items-start gap-3 px-5 py-4 rounded-lg border"
        style={{
          background: 'rgba(245, 158, 11, 0.06)',
          borderColor: 'rgba(245, 158, 11, 0.15)',
        }}
      >
        <ShieldAlert size={16} className="text-amber-500 shrink-0 mt-0.5" />
        <p className="text-sm text-[#9898aa] leading-relaxed">
          Os valores das credenciais nunca são exibidos nesta interface por segurança.
          Para gerenciar os valores, utilize o Credential CLI diretamente no terminal.
        </p>
      </div>

      {/* Conteúdo */}
      {isLoading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 size={24} className="animate-spin text-[#9080f5]" />
        </div>
      ) : isError ? (
        <div className="flex flex-col gap-3 p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-sm">
          <div className="flex items-center gap-3 text-red-400">
            <AlertCircle size={18} />
            Erro ao carregar credenciais: {error instanceof Error ? error.message : 'Erro desconhecido'}
          </div>
          <button
            onClick={() => refetchCredentials()}
            className="self-start text-xs text-[#7c6aef] hover:text-[#9080f5] transition-colors"
          >
            Tentar novamente
          </button>
        </div>
      ) : credentials.length === 0 ? (
        <div
          className="text-center py-16 rounded-lg border border-[rgba(255,255,255,0.08)] flex flex-col items-center gap-3"
          style={{ background: '#16161f' }}
        >
          <KeyRound size={48} className="text-[rgba(255,255,255,0.08)]" />
          <p className="text-[#9898aa] text-[15px]">Nenhuma credencial encontrada no vault</p>
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          {Array.from(groups.entries()).map(([prefix, creds]) => (
            <CredentialGroup key={prefix} prefix={prefix} credentials={creds} />
          ))}
        </div>
      )}
    </div>
  );
}
