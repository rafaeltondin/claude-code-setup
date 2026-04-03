// Página Financeiro — Dashboard com transações, metas e investimentos
import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Wallet,
  Plus,
  Loader2,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Clock,
  Trash2,
  Pencil,
  CheckCircle,
  Circle,
  Target,
  BarChart2,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
} from 'lucide-react';
import {
  useTransactions,
  useFinanceSummary,
  useFinanceCategories,
  useGoals,
  useInvestments,
  useCreateTransaction,
  useUpdateTransaction,
  useDeleteTransaction,
  useCreateFinanceCategory,
  useUpdateFinanceCategory,
  useDeleteFinanceCategory,
  type Transaction,
  type FinanceSummary,
  type FinanceCategory,
  type Goal,
  type Investment,
  type PaginationInfo,
} from '../api/new-hooks';
import { Modal } from '../components/Modal';
import { useToast } from '../contexts/ToastContext';
import { PageHeader, ActionButton, SectionLabel } from '../components/PageHeader';

// ─── UTILITÁRIOS ──────────────────────────────────────────────────────────────

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style:    'currency',
    currency: 'BRL',
  }).format(value);
}

function formatDate(iso?: string): string {
  if (!iso) return '—';
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  }).format(new Date(iso));
}

function getMonthYear(): { month: number; year: number } {
  const now = new Date();
  return { month: now.getMonth() + 1, year: now.getFullYear() };
}

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

// ─── HOOK DE SORTING ──────────────────────────────────────────────────────────

type SortDir = 'asc' | 'desc' | null;

function useTableSort<T>(data: T[], extractors: Record<string, (row: T) => string | number>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>(null);

  const sorted = useMemo(() => {
    if (!sortKey || !sortDir) return data;
    const extract = extractors[sortKey];
    if (!extract) return data;
    return [...data].sort((a, b) => {
      const av = extract(a);
      const bv = extract(b);
      if (typeof av === 'number' && typeof bv === 'number') {
        return sortDir === 'asc' ? av - bv : bv - av;
      }
      const as = String(av).toLowerCase();
      const bs = String(bv).toLowerCase();
      return sortDir === 'asc' ? as.localeCompare(bs) : bs.localeCompare(as);
    });
  }, [data, sortKey, sortDir, extractors]);

  const toggle = useCallback((key: string) => {
    if (sortKey !== key) { setSortKey(key); setSortDir('asc'); }
    else if (sortDir === 'asc') { setSortDir('desc'); }
    else { setSortKey(null); setSortDir(null); }
  }, [sortKey, sortDir]);

  return { sorted, sortKey, sortDir, toggle };
}

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return <ChevronsUpDown size={12} className="text-[#6a6a7a]" />;
  if (dir === 'asc') return <ChevronUp size={12} className="text-[#7c6aef]" />;
  return <ChevronDown size={12} className="text-[#7c6aef]" />;
}

function SortableHeader({ label, colKey, sortKey, sortDir, onSort }: {
  label: string; colKey: string; sortKey: string | null; sortDir: SortDir; onSort: (k: string) => void;
}) {
  return (
    <th
      className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-[#6a6a7a] cursor-pointer select-none hover:text-[#9898aa] transition-colors"
      onClick={() => onSort(colKey)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        <SortIcon active={sortKey === colKey} dir={sortKey === colKey ? sortDir : null} />
      </span>
    </th>
  );
}

// ─── KPI CARD ─────────────────────────────────────────────────────────────────

interface KpiCardProps {
  title:    string;
  value:    string;
  icon:     React.ReactNode;
  color:    string;
  subtitle?: string;
}

function KpiCard({ title, value, icon, color, subtitle }: KpiCardProps) {
  return (
    <div
      className="rounded-lg border border-[rgba(255,255,255,0.08)] p-5 flex items-start gap-4"
      style={{ background: '#16161f' }}
    >
      <div
        className="w-11 h-11 rounded-md flex items-center justify-center shrink-0"
        style={{ background: `${color}20`, border: `1px solid ${color}40` }}
      >
        <span style={{ color }}>{icon}</span>
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

// ─── MODAL CRIAR / EDITAR TRANSAÇÃO ──────────────────────────────────────────

interface TransactionFormData {
  description: string;
  amount:      string;
  date:        string;
  categoryId:  string;
  isRecurring: boolean;
  paid:        boolean;
  type:        'income' | 'expense';
}

const EMPTY_TRANSACTION: TransactionFormData = {
  description: '',
  amount:      '',
  date:        new Date().toISOString().split('T')[0],
  categoryId:  '',
  isRecurring: false,
  paid:        true,
  type:        'expense',
};

interface TransactionModalProps {
  isOpen:      boolean;
  onClose:     () => void;
  editItem?:   Transaction | null;
}

function TransactionModal({ isOpen, onClose, editItem }: TransactionModalProps) {
  const { showToast } = useToast();
  const { data: categories = [] } = useFinanceCategories();
  const createTx = useCreateTransaction();
  const updateTx = useUpdateTransaction();
  const isEditing = !!editItem;

  const [form, setForm] = useState<TransactionFormData>(() =>
    editItem
      ? {
          description: editItem.description,
          amount:      String(Math.abs(editItem.amount)),
          date:        editItem.date?.split('T')[0] ?? '',
          categoryId:  editItem.categoryId ?? '',
          isRecurring: editItem.isRecurring,
          paid:        editItem.paid,
          type:        editItem.category?.type === 'expense' ? 'expense' : 'income',
        }
      : EMPTY_TRANSACTION
  );

  useEffect(() => {
    if (isOpen) {
      setForm(editItem
        ? {
            description: editItem.description,
            amount:      String(Math.abs(editItem.amount)),
            date:        editItem.date?.split('T')[0] ?? '',
            categoryId:  editItem.categoryId ?? '',
            isRecurring: editItem.isRecurring,
            paid:        editItem.paid,
            type:        editItem.category?.type === 'expense' ? 'expense' : 'income',
          }
        : EMPTY_TRANSACTION
      );
    }
  }, [isOpen, editItem]);

  const set = useCallback(<K extends keyof TransactionFormData>(
    field: K, value: TransactionFormData[K]
  ) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  const filteredCategories = useMemo(
    () => categories.filter((c) => c.type === form.type),
    [categories, form.type]
  );

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.description.trim()) { showToast('Descrição é obrigatória.', 'error'); return; }
    if (!form.amount || isNaN(Number(form.amount))) { showToast('Valor inválido.', 'error'); return; }

    const amount = Math.abs(Number(form.amount));

    const payload: Partial<Transaction> = {
      description: form.description.trim(),
      amount,
      date:        form.date ? new Date(form.date + 'T12:00:00').toISOString() : undefined,
      categoryId:  form.categoryId || undefined,
      isRecurring: form.isRecurring,
      paid:        form.paid,
    };

    try {
      if (isEditing && editItem) {
        await updateTx.mutateAsync({ id: editItem.id, data: payload });
        showToast('Transação atualizada!', 'success');
      } else {
        await createTx.mutateAsync(payload);
        showToast('Transação criada!', 'success');
      }
      setForm(EMPTY_TRANSACTION);
      onClose();
    } catch {
      showToast('Erro ao salvar transação.', 'error');
    }
  }, [form, isEditing, editItem, createTx, updateTx, showToast, onClose]);

  const isPending = createTx.isPending || updateTx.isPending;

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => { setForm(EMPTY_TRANSACTION); onClose(); }}
      title={isEditing ? 'Editar Transação' : 'Nova Transação'}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">

        {/* Tipo */}
        <div className="grid grid-cols-2 gap-2">
          {(['income', 'expense'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => { set('type', t); set('categoryId', ''); }}
              className="py-2.5 rounded-md text-sm font-semibold transition-all"
              style={{
                background: form.type === t
                  ? (t === 'income' ? '#22c55e20' : '#ef444420')
                  : 'transparent',
                border: `1px solid ${form.type === t ? (t === 'income' ? '#22c55e' : '#ef4444') : 'rgba(255,255,255,0.08)'}`,
                color: form.type === t
                  ? (t === 'income' ? '#22c55e' : '#ef4444')
                  : '#9898aa',
              }}
            >
              {t === 'income' ? 'Receita' : 'Despesa'}
            </button>
          ))}
        </div>

        {/* Descrição */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-[#f0f0f5]">
            Descrição <span className="text-[#ef4444]">*</span>
          </label>
          <input
            type="text"
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
            placeholder="Ex: Salário mensal"
            className="w-full px-3 py-2.5 rounded-md text-sm text-[#f0f0f5] placeholder-[#6a6a7a] outline-none"
            style={{ background: '#0a0a0f', border: '1px solid rgba(255,255,255,0.08)' }}
            onFocus={(e) => (e.currentTarget.style.borderColor = '#7c6aef')}
            onBlur={(e)  => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)')}
            autoFocus
          />
        </div>

        {/* Valor + Data */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[#f0f0f5]">
              Valor (R$) <span className="text-[#ef4444]">*</span>
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.amount}
              onChange={(e) => set('amount', e.target.value)}
              placeholder="0,00"
              className="w-full px-3 py-2.5 rounded-md text-sm text-[#f0f0f5] placeholder-[#6a6a7a] outline-none"
              style={{ background: '#0a0a0f', border: '1px solid rgba(255,255,255,0.08)' }}
              onFocus={(e) => (e.currentTarget.style.borderColor = '#7c6aef')}
              onBlur={(e)  => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)')}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[#f0f0f5]">Data</label>
            <input
              type="date"
              value={form.date}
              onChange={(e) => set('date', e.target.value)}
              className="w-full px-3 py-2.5 rounded-md text-sm text-[#f0f0f5] outline-none"
              style={{ background: '#0a0a0f', border: '1px solid rgba(255,255,255,0.08)', colorScheme: 'dark' }}
              onFocus={(e) => (e.currentTarget.style.borderColor = '#7c6aef')}
              onBlur={(e)  => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)')}
            />
          </div>
        </div>

        {/* Categoria */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-[#f0f0f5]">Categoria</label>
          <select
            value={form.categoryId}
            onChange={(e) => set('categoryId', e.target.value)}
            className="w-full px-3 py-2.5 rounded-md text-sm text-[#f0f0f5] outline-none"
            style={{ background: '#0a0a0f', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <option value="">Sem categoria</option>
            {filteredCategories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        {/* Recorrente + Pago */}
        <div className="flex items-center gap-6">
          {[
            { field: 'isRecurring' as const, label: 'Recorrente' },
            { field: 'paid'        as const, label: 'Pago'       },
          ].map(({ field, label }) => (
            <label key={field} className="flex items-center gap-2 cursor-pointer">
              <button
                type="button"
                onClick={() => set(field, !form[field] as boolean)}
                className="w-10 h-5 rounded-full relative transition-colors"
                style={{ background: form[field] ? '#7c6aef' : 'rgba(255,255,255,0.12)' }}
              >
                <div
                  className="w-4 h-4 rounded-full bg-white absolute top-0.5 transition-transform"
                  style={{ transform: form[field] ? 'translateX(22px)' : 'translateX(2px)' }}
                />
              </button>
              <span className="text-sm text-[#9898aa]">{label}</span>
            </label>
          ))}
        </div>

        {/* Ações */}
        <div className="flex justify-end gap-3 pt-2 border-t border-[rgba(255,255,255,0.08)]">
          <button
            type="button"
            onClick={() => { setForm(EMPTY_TRANSACTION); onClose(); }}
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
            {isEditing ? 'Salvar' : 'Criar'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ─── MODAL CRIAR / EDITAR CATEGORIA ───────────────────────────────────────────

interface CategoryModalProps {
  isOpen:    boolean;
  onClose:   () => void;
  editItem?: FinanceCategory | null;
}

function CategoryModal({ isOpen, onClose, editItem }: CategoryModalProps) {
  const { showToast } = useToast();
  const createCat = useCreateFinanceCategory();
  const updateCat = useUpdateFinanceCategory();
  const isEditing = !!editItem;

  const [name, setName] = useState('');
  const [type, setType] = useState<'income' | 'expense'>('expense');

  // Preencher form ao editar
  useEffect(() => {
    if (editItem) {
      setName(editItem.name);
      setType(editItem.type);
    } else {
      setName('');
      setType('expense');
    }
  }, [editItem, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { showToast('Nome é obrigatório.', 'error'); return; }
    try {
      if (isEditing && editItem) {
        await updateCat.mutateAsync({ id: editItem.id, data: { name: name.trim(), type } });
        showToast('Categoria atualizada!', 'success');
      } else {
        await createCat.mutateAsync({ name: name.trim(), type });
        showToast('Categoria criada!', 'success');
      }
      onClose();
    } catch {
      showToast('Erro ao salvar categoria.', 'error');
    }
  };

  const isPending = createCat.isPending || updateCat.isPending;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEditing ? 'Editar Categoria' : 'Nova Categoria'} size="sm">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-2">
          {(['expense', 'income'] as const).map((t) => (
            <button key={t} type="button" onClick={() => setType(t)}
              className="py-2 rounded-md text-sm font-semibold transition-all"
              style={{
                background: type === t ? (t === 'income' ? '#22c55e20' : '#ef444420') : 'transparent',
                border: `1px solid ${type === t ? (t === 'income' ? '#22c55e' : '#ef4444') : 'rgba(255,255,255,0.08)'}`,
                color: type === t ? (t === 'income' ? '#22c55e' : '#ef4444') : '#9898aa',
              }}
            >
              {t === 'income' ? 'Receita' : 'Despesa'}
            </button>
          ))}
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-[#f0f0f5]">Nome <span className="text-[#ef4444]">*</span></label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: Alimentação, Transporte..."
            className="w-full px-3 py-2.5 rounded-md text-sm text-[#f0f0f5] placeholder-[#6a6a7a] outline-none"
            style={{ background: '#0a0a0f', border: '1px solid rgba(255,255,255,0.08)' }}
            onFocus={(e) => (e.currentTarget.style.borderColor = '#7c6aef')}
            onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)')}
            autoFocus
          />
        </div>
        <div className="flex justify-end gap-3 pt-2 border-t border-[rgba(255,255,255,0.08)]">
          <button
            type="button"
            onClick={onClose}
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
            {isEditing ? 'Salvar' : 'Criar'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ─── SEÇÃO GERENCIAR CATEGORIAS ───────────────────────────────────────────────

function CategoriesSection() {
  const { data: categories = [], isLoading } = useFinanceCategories();
  const deleteCat = useDeleteFinanceCategory();
  const { showToast } = useToast();
  const [showCatModal, setShowCatModal] = useState(false);
  const [editCat, setEditCat] = useState<FinanceCategory | null>(null);

  const incomeCategories = categories.filter((c) => c.type === 'income');
  const expenseCategories = categories.filter((c) => c.type === 'expense');

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Deletar categoria "${name}"? As transações vinculadas ficarão sem categoria.`)) return;
    try {
      await deleteCat.mutateAsync(id);
      showToast('Categoria deletada.', 'success');
    } catch {
      showToast('Erro ao deletar categoria.', 'error');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-[#6a6a7a]">
        <Loader2 size={16} className="animate-spin" /> Carregando...
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <button
          onClick={() => { setEditCat(null); setShowCatModal(true); }}
          className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium text-white hover:opacity-90 transition-opacity"
          style={{ background: '#7c6aef' }}
        >
          <Plus size={14} /> Nova Categoria
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Receitas */}
        <div className="rounded-lg border border-[rgba(255,255,255,0.08)] overflow-hidden" style={{ background: '#16161f' }}>
          <div className="px-4 py-3 border-b border-[rgba(255,255,255,0.06)] flex items-center gap-2">
            <TrendingUp size={14} style={{ color: '#22c55e' }} />
            <span className="text-sm font-semibold text-[#22c55e]">Receitas ({incomeCategories.length})</span>
          </div>
          {incomeCategories.length === 0 ? (
            <div className="p-6 text-center text-sm text-[#6a6a7a]">Nenhuma categoria de receita</div>
          ) : (
            <div className="divide-y divide-[rgba(255,255,255,0.04)]">
              {incomeCategories.map((cat) => (
                <div
                  key={cat.id}
                  className="flex items-center justify-between px-4 py-3 group hover:bg-[rgba(255,255,255,0.03)] transition-colors"
                >
                  <span className="text-sm text-[#f0f0f5]">{cat.name}</span>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => { setEditCat(cat); setShowCatModal(true); }}
                      className="p-1.5 rounded-md text-[#6a6a7a] hover:text-[#7c6aef] hover:bg-[#7c6aef20] transition-colors"
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      onClick={() => handleDelete(cat.id, cat.name)}
                      className="p-1.5 rounded-md text-[#6a6a7a] hover:text-[#ef4444] hover:bg-[#ef444420] transition-colors"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Despesas */}
        <div className="rounded-lg border border-[rgba(255,255,255,0.08)] overflow-hidden" style={{ background: '#16161f' }}>
          <div className="px-4 py-3 border-b border-[rgba(255,255,255,0.06)] flex items-center gap-2">
            <TrendingDown size={14} style={{ color: '#ef4444' }} />
            <span className="text-sm font-semibold text-[#ef4444]">Despesas ({expenseCategories.length})</span>
          </div>
          {expenseCategories.length === 0 ? (
            <div className="p-6 text-center text-sm text-[#6a6a7a]">Nenhuma categoria de despesa</div>
          ) : (
            <div className="divide-y divide-[rgba(255,255,255,0.04)]">
              {expenseCategories.map((cat) => (
                <div
                  key={cat.id}
                  className="flex items-center justify-between px-4 py-3 group hover:bg-[rgba(255,255,255,0.03)] transition-colors"
                >
                  <span className="text-sm text-[#f0f0f5]">{cat.name}</span>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => { setEditCat(cat); setShowCatModal(true); }}
                      className="p-1.5 rounded-md text-[#6a6a7a] hover:text-[#7c6aef] hover:bg-[#7c6aef20] transition-colors"
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      onClick={() => handleDelete(cat.id, cat.name)}
                      className="p-1.5 rounded-md text-[#6a6a7a] hover:text-[#ef4444] hover:bg-[#ef444420] transition-colors"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <CategoryModal
        key={editCat?.id ?? 'new'}
        isOpen={showCatModal}
        onClose={() => { setShowCatModal(false); setEditCat(null); }}
        editItem={editCat}
      />
    </div>
  );
}

// ─── SEÇÃO METAS ──────────────────────────────────────────────────────────────

function GoalsSection({ goals }: { goals: Goal[] }) {
  if (goals.length === 0) {
    return (
      <div
        className="rounded-lg border border-dashed border-[rgba(255,255,255,0.08)] p-8 flex flex-col items-center gap-3"
      >
        <Target size={24} style={{ color: '#6a6a7a' }} />
        <p className="text-sm text-[#6a6a7a]">Nenhuma meta cadastrada</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {goals.map((goal) => {
        const pct = goal.targetAmount > 0
          ? Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100))
          : 0;
        const color = pct >= 100 ? '#22c55e' : pct >= 60 ? '#7c6aef' : pct >= 30 ? '#f59e0b' : '#ef4444';

        return (
          <div
            key={goal.id}
            className="rounded-lg border border-[rgba(255,255,255,0.08)] p-4"
            style={{ background: '#16161f' }}
          >
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm font-medium text-[#f0f0f5]">{goal.name}</p>
                {goal.deadline && (
                  <p className="text-xs text-[#6a6a7a] mt-0.5">Prazo: {formatDate(goal.deadline)}</p>
                )}
              </div>
              <div className="text-right">
                <p className="text-sm font-bold" style={{ color, fontFamily: 'JetBrains Mono, monospace' }}>
                  {pct}%
                </p>
                <p className="text-xs text-[#6a6a7a]">
                  {formatCurrency(goal.currentAmount)} / {formatCurrency(goal.targetAmount)}
                </p>
              </div>
            </div>
            <div className="h-2 rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }}>
              <div
                className="h-2 rounded-full transition-all"
                style={{ width: `${pct}%`, background: color }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── SEÇÃO INVESTIMENTOS ──────────────────────────────────────────────────────

const INV_EXTRACTORS: Record<string, (row: Investment) => string | number> = {
  name: (r) => r.name,
  type: (r) => r.type,
  amount: (r) => r.amount,
  date: (r) => r.date ?? '',
};

function InvestmentsSection({ investments }: { investments: Investment[] }) {
  const { sorted, sortKey, sortDir, toggle } = useTableSort(investments, INV_EXTRACTORS);

  if (investments.length === 0) {
    return (
      <div
        className="rounded-lg border border-dashed border-[rgba(255,255,255,0.08)] p-8 flex flex-col items-center gap-3"
      >
        <BarChart2 size={24} style={{ color: '#6a6a7a' }} />
        <p className="text-sm text-[#6a6a7a]">Nenhum investimento cadastrado</p>
      </div>
    );
  }

  const cols = [
    { key: 'name', label: 'Nome' },
    { key: 'type', label: 'Tipo' },
    { key: 'amount', label: 'Valor' },
    { key: 'date', label: 'Data' },
  ];

  return (
    <div
      className="rounded-lg border border-[rgba(255,255,255,0.08)] overflow-hidden"
      style={{ background: '#16161f' }}
    >
      <table className="w-full text-sm">
        <thead>
          <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            {cols.map((c) => (
              <SortableHeader key={c.key} label={c.label} colKey={c.key} sortKey={sortKey} sortDir={sortDir} onSort={toggle} />
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((inv) => (
            <tr
              key={inv.id}
              className="transition-colors hover:bg-[rgba(255,255,255,0.03)]"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
            >
              <td className="px-4 py-3 text-[#f0f0f5] font-medium">{inv.name}</td>
              <td className="px-4 py-3">
                <span
                  className="px-2 py-0.5 rounded text-xs font-medium"
                  style={{ background: '#7c6aef20', color: '#7c6aef' }}
                >
                  {inv.type}
                </span>
              </td>
              <td className="px-4 py-3 text-[#22c55e] font-semibold" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                {formatCurrency(inv.amount)}
              </td>
              <td className="px-4 py-3 text-[#9898aa] text-xs">{formatDate(inv.date)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── COMPONENTE PRINCIPAL ─────────────────────────────────────────────────────

const ITEMS_PER_PAGE = 50;

export function Finance() {
  const { showToast } = useToast();
  const now = getMonthYear();

  const [activeTab, setActiveTab] = useState<'transactions' | 'categories'>('transactions');
  const [month,     setMonth]     = useState(now.month);
  const [year,      setYear]      = useState(now.year);
  const [page,      setPage]      = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [editItem,  setEditItem]  = useState<Transaction | null>(null);

  // Resetar página ao mudar mês/ano
  useEffect(() => { setPage(1); }, [month, year]);

  const { data: summary,     isLoading: loadingSum }  = useFinanceSummary(month, year);
  const { data: txResult,    isLoading: loadingTx }    = useTransactions({ month, year, page, limit: ITEMS_PER_PAGE });
  const { data: goals        = [] }                    = useGoals();
  const { data: investments  = [] }                    = useInvestments();

  const transactions = txResult?.data ?? [];
  const pagination: PaginationInfo = txResult?.pagination ?? { page: 1, limit: ITEMS_PER_PAGE, total: 0, totalPages: 1 };

  const txExtractors = useMemo<Record<string, (row: Transaction) => string | number>>(() => ({
    description: (r) => r.description,
    category: (r) => r.category?.name ?? '',
    type: (r) => r.category?.type === 'income' ? 'receita' : 'despesa',
    date: (r) => r.date ?? '',
    status: (r) => r.paid ? 'pago' : 'pendente',
    amount: (r) => r.amount,
  }), []);
  const { sorted: sortedTx, sortKey: txSortKey, sortDir: txSortDir, toggle: txToggleSort } = useTableSort(transactions, txExtractors);

  const deleteTx = useDeleteTransaction();
  const updateTx = useUpdateTransaction();

  const handleDelete = useCallback(async (id: string) => {
    if (!window.confirm('Deletar esta transação?')) return;
    try {
      await deleteTx.mutateAsync(id);
      showToast('Transação deletada.', 'success');
    } catch {
      showToast('Erro ao deletar.', 'error');
    }
  }, [deleteTx, showToast]);

  const handleEdit = useCallback((tx: Transaction) => {
    setEditItem(tx);
    setShowModal(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setShowModal(false);
    setEditItem(null);
  }, []);

  const isLoading = loadingSum || loadingTx;

  // Anos disponíveis
  const years = useMemo(() => {
    const cur = new Date().getFullYear();
    return [cur - 2, cur - 1, cur, cur + 1];
  }, []);

  // Resumo seguro — usa dados do summary (que calcula sobre TODAS as transações do mês)
  const safeSum: FinanceSummary = summary
    ? summary
    : { income: 0, expense: 0, balance: 0, pendingCount: 0, totalRecebido: 0, totalPago: 0, faltaReceber: 0, faltaPagar: 0, byCategory: [] };

  // Métricas detalhadas vêm do summary (calculadas no backend sobre todas as transações)
  const detailedMetrics = useMemo(() => ({
    totalRecebido: safeSum.totalRecebido,
    totalPago: safeSum.totalPago,
    faltaReceber: safeSum.faltaReceber,
    faltaPagar: safeSum.faltaPagar,
  }), [safeSum]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={32} className="animate-spin" style={{ color: '#7c6aef' }} />
          <p className="text-sm text-[#9898aa]">Carregando dados financeiros...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col" style={{ gap: 'var(--space-xl)' }}>

      {/* Header */}
      <PageHeader
        title="Financeiro"
        description="Controle de receitas, despesas, metas e investimentos."
        action={
          <ActionButton onClick={() => { setEditItem(null); setShowModal(true); }} icon={<Plus size={16} />}>
            Nova Transação
          </ActionButton>
        }
      />

      {/* Tabs de navegação */}
      <div className="flex gap-1 p-1 rounded-lg" style={{ background: '#16161f', width: 'fit-content' }}>
        {([
          { id: 'transactions', label: 'Transações' },
          { id: 'categories',   label: 'Categorias' },
        ] as const).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="px-4 py-2 rounded-md text-sm font-medium transition-all"
            style={{
              background: activeTab === tab.id ? '#7c6aef' : 'transparent',
              color: activeTab === tab.id ? '#fff' : '#9898aa',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'categories' ? (
        <section className="flex flex-col">
          <SectionLabel>Gerenciar Categorias</SectionLabel>
          <CategoriesSection />
        </section>
      ) : (
        <>
          {/* Filtros de período */}
          <div className="flex items-center gap-3">
            <select
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className="px-3 py-2 rounded-md text-sm text-[#f0f0f5] outline-none"
              style={{ background: '#16161f', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              {MONTHS.map((m, i) => (
                <option key={i + 1} value={i + 1}>{m}</option>
              ))}
            </select>
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="px-3 py-2 rounded-md text-sm text-[#f0f0f5] outline-none"
              style={{ background: '#16161f', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              {years.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <span className="text-xs text-[#6a6a7a]">
              {MONTHS[month - 1]} / {year}
            </span>
          </div>

          {/* KPIs */}
          <section className="flex flex-col">
            <SectionLabel>Resumo do Período</SectionLabel>
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
              <KpiCard
                title="Receita"
                value={formatCurrency(safeSum.income)}
                icon={<TrendingUp size={18} />}
                color="#22c55e"
                subtitle="Previsto no mês"
              />
              <KpiCard
                title="Despesa"
                value={formatCurrency(Math.abs(safeSum.expense))}
                icon={<TrendingDown size={18} />}
                color="#ef4444"
                subtitle="Previsto no mês"
              />
              <KpiCard
                title="Saldo"
                value={formatCurrency(safeSum.balance)}
                icon={<DollarSign size={18} />}
                color={safeSum.balance >= 0 ? '#7c6aef' : '#ef4444'}
                subtitle={safeSum.balance >= 0 ? 'Positivo' : 'Negativo'}
              />
              <KpiCard
                title="Pendentes"
                value={String(safeSum.pendingCount)}
                icon={<Clock size={18} />}
                color="#f59e0b"
                subtitle="A pagar/receber"
              />
            </div>
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mt-4">
              <KpiCard
                title="Total Recebido"
                value={formatCurrency(detailedMetrics.totalRecebido)}
                icon={<CheckCircle size={18} />}
                color="#22c55e"
                subtitle="Receitas pagas"
              />
              <KpiCard
                title="Total Pago"
                value={formatCurrency(detailedMetrics.totalPago)}
                icon={<CheckCircle size={18} />}
                color="#ef4444"
                subtitle="Despesas pagas"
              />
              <KpiCard
                title="Falta Receber"
                value={formatCurrency(detailedMetrics.faltaReceber)}
                icon={<Clock size={18} />}
                color="#3b82f6"
                subtitle="Receitas pendentes"
              />
              <KpiCard
                title="Falta Pagar"
                value={formatCurrency(detailedMetrics.faltaPagar)}
                icon={<Clock size={18} />}
                color="#f59e0b"
                subtitle="Despesas pendentes"
              />
            </div>
          </section>

          {/* Transações Recentes */}
          <section className="flex flex-col">
            <SectionLabel>Transações do Período</SectionLabel>
            {transactions.length === 0 ? (
              <div
                className="rounded-lg border border-dashed border-[rgba(255,255,255,0.08)] p-10 flex flex-col items-center gap-3"
              >
                <Wallet size={28} style={{ color: '#6a6a7a' }} />
                <p className="text-sm text-[#6a6a7a]">Nenhuma transação neste período</p>
                <button
                  onClick={() => { setEditItem(null); setShowModal(true); }}
                  className="flex items-center gap-2 px-4 py-2 rounded-md text-sm text-white hover:opacity-90 transition-opacity"
                  style={{ background: '#7c6aef' }}
                >
                  <Plus size={14} /> Nova Transação
                </button>
              </div>
            ) : (
              <div
                className="rounded-lg border border-[rgba(255,255,255,0.08)] overflow-hidden"
                style={{ background: '#16161f' }}
              >
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                      {[
                        { key: 'description', label: 'Descrição' },
                        { key: 'category', label: 'Categoria' },
                        { key: 'type', label: 'Tipo' },
                        { key: 'date', label: 'Data' },
                        { key: 'status', label: 'Status' },
                        { key: 'amount', label: 'Valor' },
                      ].map((c) => (
                        <SortableHeader key={c.key} label={c.label} colKey={c.key} sortKey={txSortKey} sortDir={txSortDir} onSort={txToggleSort} />
                      ))}
                      <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-[#6a6a7a]" />
                    </tr>
                  </thead>
                  <tbody>
                    {sortedTx.map((tx) => {
                      const isIncome = tx.category?.type === 'income';
                      return (
                        <tr
                          key={tx.id}
                          className="group transition-colors hover:bg-[rgba(255,255,255,0.03)]"
                          style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              {tx.isRecurring && (
                                <RefreshCw size={12} className="text-[#6a6a7a] shrink-0" />
                              )}
                              <p className="text-[#f0f0f5] font-medium truncate max-w-[200px]">
                                {tx.description}
                              </p>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            {tx.category ? (
                              <span
                                className="px-2 py-0.5 rounded text-xs font-medium"
                                style={{ background: '#9898aa20', color: '#9898aa' }}
                              >
                                {tx.category.name}
                              </span>
                            ) : (
                              <span className="text-xs text-[#6a6a7a]">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className="px-2 py-0.5 rounded text-xs font-semibold"
                              style={isIncome
                                ? { background: '#22c55e18', color: '#22c55e' }
                                : { background: '#ef444418', color: '#ef4444' }
                              }
                            >
                              {isIncome ? 'Receita' : 'Despesa'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-[#9898aa] text-xs whitespace-nowrap">
                            {formatDate(tx.date)}
                          </td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => updateTx.mutateAsync({ id: tx.id, data: { paid: !tx.paid } })}
                              title={tx.paid ? 'Marcar como pendente' : 'Marcar como pago'}
                              className="flex items-center gap-1 text-xs rounded px-2 py-0.5 transition-colors hover:opacity-80 cursor-pointer"
                              style={{
                                color: tx.paid ? '#22c55e' : '#f59e0b',
                                background: tx.paid ? '#22c55e18' : '#f59e0b18',
                              }}
                            >
                              {tx.paid ? <CheckCircle size={12} /> : <Circle size={12} />}
                              {tx.paid ? 'Pago' : 'Pendente'}
                            </button>
                          </td>
                          <td
                            className="px-4 py-3 font-semibold whitespace-nowrap"
                            style={{
                              color: isIncome ? '#22c55e' : '#ef4444',
                              fontFamily: 'JetBrains Mono, monospace',
                            }}
                          >
                            {isIncome ? '+' : '-'}{formatCurrency(tx.amount)}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => handleEdit(tx)}
                                className="p-1.5 rounded-md text-[#6a6a7a] hover:text-[#7c6aef] hover:bg-[#7c6aef20] transition-colors"
                                title="Editar"
                              >
                                <Pencil size={13} />
                              </button>
                              <button
                                onClick={() => handleDelete(tx.id)}
                                className="p-1.5 rounded-md text-[#6a6a7a] hover:text-[#ef4444] hover:bg-[#ef444420] transition-colors"
                                title="Deletar"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {/* Controles de paginação */}
                {pagination.totalPages > 1 && (
                  <div
                    className="flex items-center justify-between px-4 py-3"
                    style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
                  >
                    <span className="text-xs text-[#6a6a7a]">
                      {((pagination.page - 1) * pagination.limit) + 1}–{Math.min(pagination.page * pagination.limit, pagination.total)} de {pagination.total} transações
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setPage(1)}
                        disabled={pagination.page <= 1}
                        className="p-1.5 rounded-md text-[#9898aa] hover:text-[#f0f0f5] hover:bg-[rgba(255,255,255,0.06)] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Primeira página"
                      >
                        <ChevronsLeft size={16} />
                      </button>
                      <button
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={pagination.page <= 1}
                        className="p-1.5 rounded-md text-[#9898aa] hover:text-[#f0f0f5] hover:bg-[rgba(255,255,255,0.06)] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Página anterior"
                      >
                        <ChevronLeft size={16} />
                      </button>
                      <span className="px-3 py-1 text-sm text-[#f0f0f5] font-medium" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                        {pagination.page} / {pagination.totalPages}
                      </span>
                      <button
                        onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                        disabled={pagination.page >= pagination.totalPages}
                        className="p-1.5 rounded-md text-[#9898aa] hover:text-[#f0f0f5] hover:bg-[rgba(255,255,255,0.06)] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Próxima página"
                      >
                        <ChevronRight size={16} />
                      </button>
                      <button
                        onClick={() => setPage(pagination.totalPages)}
                        disabled={pagination.page >= pagination.totalPages}
                        className="p-1.5 rounded-md text-[#9898aa] hover:text-[#f0f0f5] hover:bg-[rgba(255,255,255,0.06)] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Última página"
                      >
                        <ChevronsRight size={16} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Metas e Investimentos lado a lado */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* Metas */}
            <section className="flex flex-col">
              <SectionLabel>Metas</SectionLabel>
              <GoalsSection goals={goals} />
            </section>

            {/* Investimentos */}
            <section className="flex flex-col">
              <SectionLabel>Investimentos</SectionLabel>
              <InvestmentsSection investments={investments} />
            </section>
          </div>
        </>
      )}

      {/* Modal de transação */}
      <TransactionModal
        key={editItem?.id ?? 'new'}
        isOpen={showModal}
        onClose={handleCloseModal}
        editItem={editItem}
      />
    </div>
  );
}
