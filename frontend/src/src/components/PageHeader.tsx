// PageHeader padronizado: titulo + descricao + CTA + breadcrumb
import React from 'react';
import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

interface BreadcrumbItem {
  label: string;
  to?: string;
}

interface PageHeaderProps {
  title: string;
  description?: string | ReactNode;
  action?: ReactNode;
  breadcrumb?: BreadcrumbItem[];
}

export function PageHeader({ title, description, action, breadcrumb }: PageHeaderProps) {
  const crumbs: BreadcrumbItem[] = breadcrumb ?? [
    { label: 'Home', to: '/' },
    { label: title },
  ];

  return (
    <div className="flex flex-col gap-1.5">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-[13px]" aria-label="Breadcrumb">
        {crumbs.map((crumb, i) => (
          <span key={i} className="flex items-center gap-1.5">
            {i > 0 && <ChevronRight size={12} className="text-[#4a4a58]" />}
            {crumb.to ? (
              <NavLink
                to={crumb.to}
                className="text-[#6a6a7a] hover:text-[#9898aa] transition-colors flex items-center gap-1"
              >
                {i === 0 && <Home size={12} />}
                {crumb.label}
              </NavLink>
            ) : (
              <span className="text-[#9898aa] font-medium">{crumb.label}</span>
            )}
          </span>
        ))}
      </nav>

      {/* Titulo + CTA */}
      <div className="flex items-center justify-between mt-1">
        <div>
          <h1 className="text-[28px] font-bold text-[#f0f0f5] leading-tight">
            {title}
          </h1>
          {description && (
            <p className="text-[#9898aa] text-sm mt-1">{description}</p>
          )}
        </div>
        {action && <div className="shrink-0 ml-4">{action}</div>}
      </div>
    </div>
  );
}

// ─── SectionLabel padronizado (igual ao Dashboard) ────────────────────────

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center" style={{ gap: '12px', marginTop: 'var(--space-lg)', marginBottom: 'var(--space-md)' }}>
      <h2 className="text-[13px] font-semibold text-[#6a6a7a] uppercase tracking-wide whitespace-nowrap">
        {children}
      </h2>
      <div className="flex-1 h-px bg-[#1e293b]" />
    </div>
  );
}

// ─── Botao Padronizado ──────────────────────────────────────────────────────

interface ActionButtonProps {
  onClick: () => void;
  icon?: ReactNode;
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
}

export function ActionButton({ onClick, icon, children, variant = 'primary', disabled }: ActionButtonProps) {
  const base = 'inline-flex items-center gap-2 px-5 h-10 rounded-md text-sm font-semibold transition-all disabled:opacity-50 cursor-pointer';
  const variants = {
    primary: 'text-white hover:opacity-90',
    secondary: 'text-[#9898aa] hover:text-[#f0f0f5] border border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.14)]',
    danger: 'text-white bg-red-500 hover:bg-red-600',
  };
  const bg = variant === 'primary'
    ? { background: 'var(--accent)' }
    : variant === 'secondary'
      ? { background: 'transparent' }
      : undefined;

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${variants[variant]}`}
      style={bg}
    >
      {icon}
      {children}
    </button>
  );
}
