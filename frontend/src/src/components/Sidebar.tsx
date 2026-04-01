// Sidebar unificada: CRM + Ecosystem — Premium Theme v5
import { NavLink, Link } from 'react-router-dom';
import {
  BookOpen,
  FileCode,
  KeyRound,
  Layers,
  X,
  Bot,
  ListTodo,
  Wallet,
  StickyNote,
  CalendarDays,
  Terminal,
} from 'lucide-react';
import { useChatContext } from '../contexts/ChatContext';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  end?: boolean;
  badge?: React.ReactNode;
}

const ECO_ITEMS: NavItem[] = [
  { to: '/scheduled-tasks', label: 'Tarefas Agendadas',     icon: Terminal },
  { to: '/knowledge-base', label: 'Base de Conhecimento', icon: BookOpen },
  { to: '/prompts',        label: 'Prompts',              icon: FileCode },
  { to: '/credentials',    label: 'Credenciais',          icon: KeyRound },
  { to: '/telegram',       label: 'Telegram Bot',         icon: Bot },
];

const PERSONAL_ITEMS: NavItem[] = [
  { to: '/personal-tasks',  label: 'Minhas Tarefas',     icon: ListTodo },
  { to: '/finance',          label: 'Financeiro',          icon: Wallet },
  { to: '/notes',            label: 'Notas',               icon: StickyNote },
  { to: '/calendar',         label: 'Calendário',          icon: CalendarDays },
];

function NavGroup({
  label,
  items,
  onItemClick,
}: {
  label: string;
  items: NavItem[];
  onItemClick?: () => void;
}) {
  return (
    <div style={{ marginTop: '20px' }}>
      <p
        className="text-[11px] font-bold uppercase tracking-widest"
        style={{ color: 'var(--text-muted)', padding: '0 var(--space-sm)', marginBottom: '8px' }}
      >
        {label}
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {items.map(({ to, label: itemLabel, icon: Icon, end, badge }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={onItemClick}
            className="nav-item-link"
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '8px 12px',
              borderRadius: '4px',
              fontSize: '14px',
              fontWeight: 600,
              transition: 'all 150ms ease',
              position: 'relative',
              color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
              background: isActive
                ? 'linear-gradient(135deg, var(--accent-subtle), rgba(124,106,239,0.05))'
                : 'transparent',
              borderLeft: isActive ? '2px solid var(--accent)' : '2px solid transparent',
              boxShadow: isActive ? 'var(--shadow-glow)' : 'none',
            })}
          >
            <Icon
              size={18}
              className="shrink-0 opacity-80"
            />
            <span className="flex-1 truncate">{itemLabel}</span>
            {badge}
          </NavLink>
        ))}
      </div>
    </div>
  );
}

const StreamingDot = () => (
  <span
    className="inline-block w-2 h-2 rounded-full shrink-0"
    style={{
      background: '#7c6aef',
      boxShadow: '0 0 6px #7c6aef',
      animation: 'pulse 1.5s ease-in-out infinite',
    }}
  />
);

export function Sidebar({ isOpen = false, onClose }: SidebarProps) {
  const { hasActiveStreaming } = useChatContext();
  const handleNavItemClick = () => {
    if (onClose) onClose();
  };

  const ecoItems = ECO_ITEMS.map((item) =>
    item.to === '/chat' && hasActiveStreaming
      ? { ...item, badge: <StreamingDot /> }
      : item
  );

  return (
    <aside
      aria-label="Navegação principal"
      aria-hidden={undefined}
      style={{
        position: 'fixed',
        left: 0,
        top: 0,
        height: '100%',
        width: 'var(--sidebar-w)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 50,
        background: 'linear-gradient(180deg, var(--bg-secondary) 0%, rgba(18,18,26,0.95) 100%)',
        backdropFilter: 'var(--glass-blur)',
        borderRight: '1px solid var(--surface-border)',
        transform: isOpen ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform 200ms ease-in-out',
      }}
      className="sidebar-drawer"
    >
      {/* Logo + fechar (mobile) */}
      <div
        className="flex items-center gap-3"
        style={{ padding: '16px 12px 20px', borderBottom: '1px solid var(--surface-border)' }}
      >
        <Link
          to="/"
          onClick={handleNavItemClick}
          className="flex items-center gap-3 flex-1 min-w-0"
          style={{ textDecoration: 'none' }}
          aria-label="Ir para Chat IA"
        >
          <div
            className="w-8 h-8 rounded-md flex items-center justify-center shrink-0"
            style={{
              background: 'linear-gradient(135deg, var(--accent), var(--accent-hover))',
              boxShadow: 'var(--shadow-glow)',
            }}
          >
            <Layers size={16} className="text-white" />
          </div>
          <div>
            <p
              className="font-semibold text-sm leading-tight"
              style={{ color: 'var(--text-primary)' }}
            >
              Claude Code
            </p>
            <p className="text-[10px] font-medium" style={{ color: 'var(--text-muted)' }}>
              Ecosystem
            </p>
          </div>
        </Link>

        <button
          onClick={onClose}
          className="sidebar-close-btn p-1.5 rounded-sm transition-colors shrink-0"
          style={{ color: 'var(--text-muted)' }}
          aria-label="Fechar menu lateral"
        >
          <X size={18} />
        </button>
      </div>

      {/* Nav Groups */}
      <nav
        className="flex-1 flex flex-col overflow-y-auto"
        style={{ padding: '0 12px 12px' }}
        aria-label="Menu principal"
      >
        <NavGroup label="Ecosystem" items={ecoItems} onItemClick={handleNavItemClick} />
        <NavGroup label="Pessoal" items={PERSONAL_ITEMS} onItemClick={handleNavItemClick} />
      </nav>

      {/* Footer */}
      <div className="px-5 py-3" style={{ borderTop: '1px solid var(--surface-border)' }}>
        <p className="text-[10px]" style={{ color: 'var(--text-disabled)' }}>
          v2.0.0 — Unified
        </p>
      </div>
    </aside>
  );
}
