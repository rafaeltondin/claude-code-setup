// Página de Prompt Templates do Ecosystem
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Zap,
  FolderOpen,
  Braces,
  Plus,
  Search,
  Pencil,
  Trash2,
  Loader2,
  AlertCircle,
  FileCode,
  Tag,
  Clock,
  BarChart2,
  Play,
  Eye,
} from 'lucide-react';
import { Modal } from '../components/Modal';
import { PageHeader, ActionButton, SectionLabel } from '../components/PageHeader';
import {
  usePromptTemplates,
  useCreatePromptTemplate,
  useUpdatePromptTemplate,
  useDeletePromptTemplate,
} from '../api/ecosystem-hooks';
import { useToast } from '../contexts/ToastContext';
import type { PromptTemplate } from '../types';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const VARIABLE_REGEX = /\{\{(\w+)\}\}/g;

function extractVariables(content: string): string[] {
  if (!content) return [];
  const matches = [...content.matchAll(VARIABLE_REGEX)];
  return [...new Set(matches.map((m) => m[1]))];
}

function countTotalVariables(templates: PromptTemplate[]): number {
  const all = templates.flatMap((t) => {
    const vars = t.variables ?? extractVariables(t.content);
    return vars.map((v: unknown) => typeof v === 'string' ? v : (v as { name?: string }).name || String(v));
  });
  return new Set(all).size;
}

function extractCategories(templates: PromptTemplate[]): string[] {
  const cats = templates.map((t) => t.category).filter(Boolean) as string[];
  return [...new Set(cats)].sort();
}

function formatRelativeDate(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days === 0) return 'hoje';
  if (days === 1) return 'ontem';
  if (days < 30) return `${days}d atrás`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}m atrás`;
  return `${Math.floor(months / 12)}a atrás`;
}

// ─── KPI Card ────────────────────────────────────────────────────────────────

interface KpiCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  loading?: boolean;
}

function KpiCard({ title, value, icon, color, loading }: KpiCardProps) {
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
        <p className="text-[13px] font-medium text-[#6a6a7a] uppercase tracking-wide mb-1">{title}</p>
        {loading ? (
          <div className="h-7 w-12 rounded bg-[rgba(255,255,255,0.08)] animate-pulse" />
        ) : (
          <p
            className="text-4xl font-bold text-[#f0f0f5]"
            style={{ fontFamily: 'JetBrains Mono, monospace' }}
          >
            {value}
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Prompt Card ─────────────────────────────────────────────────────────────

interface PromptCardProps {
  template: PromptTemplate;
  onEdit: (t: PromptTemplate) => void;
  onDelete: (id: string, name: string) => void;
}

function PromptCard({ template, onEdit, onDelete }: PromptCardProps) {
  const vars = template.variables?.length
    ? template.variables.map((v: unknown) => typeof v === 'string' ? v : (v as { name?: string }).name || String(v))
    : extractVariables(template.content);

  return (
    <div
      className="rounded-lg border border-[rgba(255,255,255,0.08)] p-4 flex flex-col gap-3 hover:border-[#7c6aef]/40 transition-colors group"
      style={{ background: '#16161f' }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 min-w-0">
          <FileCode size={16} className="text-[#9080f5] shrink-0 mt-0.5" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[#f0f0f5] leading-tight">{template.name}</p>
            {template.description && (
              <p className="text-xs text-[#6a6a7a] mt-0.5 line-clamp-2 leading-relaxed">
                {template.description}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onEdit(template)}
            className="p-1.5 rounded hover:bg-[rgba(255,255,255,0.06)] text-[#6a6a7a] hover:text-[#7c6aef] transition-colors"
            title="Editar template"
            aria-label={`Editar ${template.name}`}
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={() => onDelete(template.id, template.name)}
            className="p-1.5 rounded hover:bg-red-500/10 text-[#6a6a7a] hover:text-red-400 transition-colors"
            title="Excluir template"
            aria-label={`Excluir ${template.name}`}
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Category badge */}
      {template.category && (
        <div>
          <span
            className="px-2 py-0.5 rounded text-xs font-medium"
            style={{
              background: '#9080f518',
              color: '#9080f5',
              border: '1px solid #9080f530',
            }}
          >
            {template.category}
          </span>
        </div>
      )}

      {/* Variáveis chips */}
      {vars.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          <Tag size={11} className="text-[#6a6a7a] shrink-0" />
          {vars.slice(0, 5).map((v) => (
            <span
              key={v}
              className="px-1.5 py-0.5 rounded text-xs font-mono"
              style={{
                background: '#7c6aef18',
                color: '#60a5fa',
                border: '1px solid #7c6aef30',
              }}
            >
              {`{{${v}}}`}
            </span>
          ))}
          {vars.length > 5 && (
            <span className="text-xs text-[#6a6a7a]">+{vars.length - 5}</span>
          )}
        </div>
      )}

      {/* Footer: uso + data */}
      <div className="flex items-center gap-3 pt-1 border-t border-[rgba(255,255,255,0.08)]">
        {template.usageCount !== undefined && (
          <span className="flex items-center gap-1 text-xs text-[#6a6a7a]">
            <BarChart2 size={11} />
            {template.usageCount} uso{template.usageCount !== 1 ? 's' : ''}
          </span>
        )}
        {template.lastUsedAt && (
          <span className="flex items-center gap-1 text-xs text-[#6a6a7a]">
            <Clock size={11} />
            {formatRelativeDate(template.lastUsedAt)}
          </span>
        )}
        <span className="text-xs text-[#6a6a7a] ml-auto">
          {formatRelativeDate(template.updatedAt)}
        </span>
      </div>
    </div>
  );
}

// ─── Modal Form ───────────────────────────────────────────────────────────────

interface PromptFormData {
  name: string;
  content: string;
  category: string;
  description: string;
  model: string;
  tagsRaw: string;
}

const EMPTY_FORM: PromptFormData = {
  name: '',
  content: '',
  category: '',
  description: '',
  model: '',
  tagsRaw: '',
};

function templateToForm(t: PromptTemplate): PromptFormData {
  return {
    name: t.name,
    content: t.content,
    category: t.category ?? '',
    description: t.description ?? '',
    model: t.model ?? '',
    tagsRaw: (t.tags ?? []).join(', '),
  };
}

interface PromptFormProps {
  initial: PromptFormData;
  editing: boolean;
  isSaving: boolean;
  onSave: (data: PromptFormData) => Promise<void>;
  onCancel: () => void;
}

function PromptForm({ initial, editing, isSaving, onSave, onCancel }: PromptFormProps) {
  const [form, setForm]     = useState<PromptFormData>(initial);
  const [errors, setErrors] = useState<Partial<Record<keyof PromptFormData, string>>>({});

  const detectedVars = useMemo(() => extractVariables(form.content), [form.content]);

  function set(field: keyof PromptFormData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  function validate(): boolean {
    const e: Partial<Record<keyof PromptFormData, string>> = {};
    if (!form.name.trim()) e.name = 'Nome obrigatório';
    if (!form.content.trim()) e.content = 'Conteúdo obrigatório';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!validate()) return;
    await onSave(form);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
      {/* Nome + Categoria */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-[#9898aa]">Nome *</label>
          <input
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            placeholder="Ex: Análise de lead"
            className={`px-3 py-2.5 bg-[#0a0a0f] border rounded-md text-sm text-[#f0f0f5] placeholder-[#6a6a7a] focus:outline-none transition-colors ${errors.name ? 'border-red-500/60' : 'border-[rgba(255,255,255,0.08)] focus:border-[#7c6aef]/60'}`}
          />
          {errors.name && <p className="text-xs text-red-400">{errors.name}</p>}
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-[#9898aa]">Categoria</label>
          <input
            value={form.category}
            onChange={(e) => set('category', e.target.value)}
            placeholder="Ex: Prospecção, Análise, CRM..."
            className="px-3 py-2.5 bg-[#0a0a0f] border border-[rgba(255,255,255,0.08)] rounded-md text-sm text-[#f0f0f5] placeholder-[#6a6a7a] focus:outline-none focus:border-[#7c6aef]/60 transition-colors"
          />
        </div>
      </div>

      {/* Descrição */}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-[#9898aa]">Descrição</label>
        <input
          value={form.description}
          onChange={(e) => set('description', e.target.value)}
          placeholder="O que este prompt faz..."
          className="px-3 py-2.5 bg-[#0a0a0f] border border-[rgba(255,255,255,0.08)] rounded-md text-sm text-[#f0f0f5] placeholder-[#6a6a7a] focus:outline-none focus:border-[#7c6aef]/60 transition-colors"
        />
      </div>

      {/* Conteúdo */}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-[#9898aa]">
          Conteúdo *
          <span className="ml-2 font-normal text-[#6a6a7a]">use {'{{variavel}}'} para campos dinâmicos</span>
        </label>
        <textarea
          value={form.content}
          onChange={(e) => set('content', e.target.value)}
          rows={8}
          placeholder="Você é um especialista em prospecção. Analise o lead {{name}} da empresa {{company}}..."
          className={`px-3 py-2.5 bg-[#0a0a0f] border rounded-md text-sm text-[#f0f0f5] placeholder-[#6a6a7a] focus:outline-none resize-none transition-colors font-mono leading-relaxed ${errors.content ? 'border-red-500/60' : 'border-[rgba(255,255,255,0.08)] focus:border-[#7c6aef]/60'}`}
        />
        {errors.content && <p className="text-xs text-red-400">{errors.content}</p>}
      </div>

      {/* Variáveis detectadas */}
      {detectedVars.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap p-2.5 rounded-md" style={{ background: '#0a0a0f', border: '1px solid rgba(255,255,255,0.08)' }}>
          <span className="text-xs text-[#6a6a7a] shrink-0">Variáveis detectadas:</span>
          {detectedVars.map((v) => (
            <span
              key={v}
              className="px-1.5 py-0.5 rounded text-xs font-mono"
              style={{ background: '#7c6aef18', color: '#60a5fa', border: '1px solid #7c6aef30' }}
            >
              {`{{${v}}}`}
            </span>
          ))}
        </div>
      )}

      {/* Tags + Modelo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-[#9898aa]">Tags</label>
          <input
            value={form.tagsRaw}
            onChange={(e) => set('tagsRaw', e.target.value)}
            placeholder="crm, prospecção, análise"
            className="px-3 py-2.5 bg-[#0a0a0f] border border-[rgba(255,255,255,0.08)] rounded-md text-sm text-[#f0f0f5] placeholder-[#6a6a7a] focus:outline-none focus:border-[#7c6aef]/60 transition-colors"
          />
          <p className="text-xs text-[#6a6a7a]">Separadas por vírgula</p>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-[#9898aa]">Modelo preferido</label>
          <input
            value={form.model}
            onChange={(e) => set('model', e.target.value)}
            placeholder="claude-sonnet-4-6, gpt-4o..."
            className="px-3 py-2.5 bg-[#0a0a0f] border border-[rgba(255,255,255,0.08)] rounded-md text-sm text-[#f0f0f5] placeholder-[#6a6a7a] focus:outline-none focus:border-[#7c6aef]/60 transition-colors font-mono"
          />
        </div>
      </div>

      {/* Ações */}
      <div className="flex justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2.5 rounded-md text-sm text-[#9898aa] border border-[rgba(255,255,255,0.08)] hover:border-[#7c6aef]/40 hover:text-[#f0f0f5] transition-colors"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isSaving}
          className="flex items-center gap-2 px-5 py-2.5 rounded-md text-sm font-medium text-white transition-colors disabled:opacity-60"
          style={{ background: 'linear-gradient(135deg, #7c6aef 0%, #9080f5 100%)' }}
        >
          {isSaving && <Loader2 size={14} className="animate-spin" />}
          {editing ? 'Salvar Alterações' : 'Criar Template'}
        </button>
      </div>
    </form>
  );
}

// ─── Execute Form ─────────────────────────────────────────────────────────────

interface ExecuteFormProps {
  template: PromptTemplate;
  onCancel: () => void;
}

function ExecuteForm({ template, onCancel }: ExecuteFormProps) {
  const navigate = useNavigate();
  const vars = useMemo(() => extractVariables(template.content), [template.content]);
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(vars.map((v) => [v, '']))
  );

  const filledContent = useMemo(() => {
    let result = template.content || '';
    vars.forEach((v) => {
      result = result.replaceAll(`{{${v}}}`, values[v] || `{{${v}}}`);
    });
    return result;
  }, [template.content, vars, values]);

  function handleExecute() {
    navigate('/chat', { state: { initialMessage: filledContent, autoSend: true } });
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Campos de variáveis */}
      {vars.length > 0 ? (
        <div className="flex flex-col gap-3">
          <p className="text-xs font-medium text-[#9898aa] uppercase tracking-wide">
            Preencher variáveis
          </p>
          {vars.map((v) => (
            <div key={v} className="flex flex-col gap-1">
              <label className="text-xs font-medium text-[#7c6aef]">
                <span className="font-mono">{`{{${v}}}`}</span>
              </label>
              <input
                value={values[v]}
                onChange={(e) => setValues((prev) => ({ ...prev, [v]: e.target.value }))}
                placeholder={`Valor para ${v}...`}
                className="px-3 py-2 bg-[#0a0a0f] border border-[rgba(255,255,255,0.08)] rounded-md text-sm text-[#f0f0f5] placeholder-[#6a6a7a] focus:outline-none focus:border-[#7c6aef]/60 transition-colors"
              />
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-[#6a6a7a]">Este prompt não possui variáveis.</p>
      )}

      {/* Preview do prompt preenchido */}
      <div className="flex flex-col gap-2">
        <p className="text-xs font-medium text-[#9898aa] uppercase tracking-wide flex items-center gap-1.5">
          <Eye size={12} />
          Preview
        </p>
        <pre
          className="px-3 py-3 bg-[#0a0a0f] border border-[rgba(255,255,255,0.08)] rounded-md text-xs text-[#c0c0d0] font-mono leading-relaxed whitespace-pre-wrap max-h-52 overflow-y-auto"
        >
          {filledContent || '(sem conteúdo)'}
        </pre>
      </div>

      {/* Ações */}
      <div className="flex justify-end gap-3 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2.5 rounded-md text-sm text-[#9898aa] border border-[rgba(255,255,255,0.08)] hover:border-[#7c6aef]/40 hover:text-[#f0f0f5] transition-colors"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={handleExecute}
          className="flex items-center gap-2 px-5 py-2.5 rounded-md text-sm font-medium text-white transition-colors"
          style={{ background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)' }}
        >
          <Play size={14} />
          Executar no Chat IA
        </button>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function Prompts() {
  const { showToast } = useToast();

  const [searchQuery, setSearchQuery]       = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [modalOpen, setModalOpen]           = useState(false);
  const [modalTab, setModalTab]             = useState<'edit' | 'execute'>('edit');
  const [editingTpl, setEditingTpl]         = useState<PromptTemplate | null>(null);
  const [deleteTarget, setDeleteTarget]     = useState<{ id: string; name: string } | null>(null);

  const { data: templates = [], isLoading, error } = usePromptTemplates();
  const createMutation = useCreatePromptTemplate();
  const updateMutation = useUpdatePromptTemplate();
  const deleteMutation = useDeletePromptTemplate();

  const isSaving = createMutation.isPending || updateMutation.isPending;

  const categories = useMemo(() => extractCategories(templates), [templates]);
  const totalVars   = useMemo(() => countTotalVariables(templates), [templates]);

  const filteredTemplates = useMemo(() => {
    return templates.filter((t) => {
      const matchesCat  = !categoryFilter || t.category === categoryFilter;
      const q           = searchQuery.toLowerCase();
      const matchSearch =
        !q ||
        t.name.toLowerCase().includes(q) ||
        (t.description ?? '').toLowerCase().includes(q) ||
        (t.category ?? '').toLowerCase().includes(q) ||
        (t.tags ?? []).some((tag) => tag.toLowerCase().includes(q));
      return matchesCat && matchSearch;
    });
  }, [templates, categoryFilter, searchQuery]);

  function openCreate() {
    setEditingTpl(null);
    setModalTab('edit');
    setModalOpen(true);
  }

  function openEdit(t: PromptTemplate) {
    setEditingTpl(t);
    setModalTab('edit');
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingTpl(null);
  }

  async function handleSave(data: PromptFormData) {
    const tags      = data.tagsRaw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const variables = extractVariables(data.content);
    const payload: Partial<PromptTemplate> = {
      name:        data.name.trim(),
      content:     data.content.trim(),
      category:    data.category.trim() || undefined,
      description: data.description.trim() || undefined,
      model:       data.model.trim() || undefined,
      tags:        tags.length ? tags : undefined,
      variables,
    };

    try {
      if (editingTpl) {
        await updateMutation.mutateAsync({ id: editingTpl.id, data: payload });
        showToast('Template atualizado!', 'success');
      } else {
        await createMutation.mutateAsync(payload);
        showToast('Template criado!', 'success');
      }
      closeModal();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Erro ao salvar template', 'error');
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync(deleteTarget.id);
      showToast(`"${deleteTarget.name}" removido`, 'success');
      setDeleteTarget(null);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Erro ao excluir', 'error');
    }
  }

  return (
    <div className="flex flex-col" style={{ gap: 'var(--space-xl)' }}>
      {/* Header */}
      <PageHeader
        title="Prompt Templates"
        description="Biblioteca de prompts reutilizáveis do Ecosystem"
        breadcrumb={[{ label: 'Home', to: '/' }, { label: 'Prompt Templates' }]}
        action={
          <ActionButton
            onClick={openCreate}
            icon={<Plus size={16} />}
          >
            Novo Template
          </ActionButton>
        }
      />

      {/* KPI Cards */}
      <section className="flex flex-col">
        <SectionLabel>Métricas</SectionLabel>
        <div className="grid grid-cols-1 sm:grid-cols-3" style={{ gap: 'var(--space-lg)' }}>
          <KpiCard
            title="Total Templates"
            value={templates.length}
            icon={<Zap size={20} />}
            color="#7c6aef"
            loading={isLoading}
          />
          <KpiCard
            title="Categorias"
            value={categories.length}
            icon={<FolderOpen size={20} />}
            color="#9080f5"
            loading={isLoading}
          />
          <KpiCard
            title="Variáveis Únicas"
            value={totalVars}
            icon={<Braces size={20} />}
            color="#a78bfa"
            loading={isLoading}
          />
        </div>
      </section>

      {/* Busca + Filtro */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6a6a7a] pointer-events-none"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por nome, descrição ou tag..."
            className="w-full pl-9 pr-4 py-2.5 bg-[#16161f] border border-[rgba(255,255,255,0.08)] rounded-lg text-sm text-[#f0f0f5] placeholder-[#6a6a7a] focus:outline-none focus:border-[#7c6aef]/60 transition-colors"
          />
        </div>

        {categories.length > 0 && (
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2.5 bg-[#16161f] border border-[rgba(255,255,255,0.08)] rounded-lg text-sm text-[#f0f0f5] focus:outline-none focus:border-[#7c6aef]/60 transition-colors min-w-[200px]"
          >
            <option value="">Todas as categorias</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Lista */}
      {isLoading ? (
        <div className="flex items-center justify-center h-32 gap-3">
          <Loader2 size={22} className="animate-spin text-[#7c6aef]" />
          <span className="text-sm text-[#9898aa]">Carregando templates...</span>
        </div>
      ) : error ? (
        <div className="flex items-center gap-3 p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
          <AlertCircle size={18} />
          Erro ao carregar templates: {error.message}
        </div>
      ) : filteredTemplates.length === 0 ? (
        <div
          className="text-center py-14 rounded-lg border border-[rgba(255,255,255,0.08)]"
          style={{ background: '#16161f' }}
        >
          <FileCode size={38} className="mx-auto mb-3 text-[rgba(255,255,255,0.08)]" />
          <p className="text-[#6a6a7a] text-sm">
            {templates.length === 0
              ? 'Nenhum template cadastrado ainda'
              : 'Nenhum template encontrado para os filtros aplicados'}
          </p>
          {templates.length === 0 ? (
            <button
              onClick={openCreate}
              className="mt-4 text-sm text-[#7c6aef] hover:text-[#9080f5] transition-colors"
            >
              Criar primeiro template
            </button>
          ) : (
            <button
              onClick={() => { setSearchQuery(''); setCategoryFilter(''); }}
              className="mt-3 text-sm text-[#7c6aef] hover:text-[#9080f5] transition-colors"
            >
              Limpar filtros
            </button>
          )}
        </div>
      ) : (
        <>
          <p className="text-xs text-[#6a6a7a] -mt-2">
            {filteredTemplates.length} template{filteredTemplates.length !== 1 ? 's' : ''}
            {(searchQuery || categoryFilter) && ' (filtrado)'}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredTemplates.map((t) => (
              <PromptCard
                key={t.id}
                template={t}
                onEdit={openEdit}
                onDelete={(id, name) => setDeleteTarget({ id, name })}
              />
            ))}
          </div>
        </>
      )}

      {/* Modal Criar/Editar/Executar */}
      <Modal
        isOpen={modalOpen}
        onClose={closeModal}
        title={editingTpl ? editingTpl.name : 'Novo Prompt Template'}
        size="xl"
      >
        {/* Tabs — só mostra quando editando */}
        {editingTpl && (
          <div className="flex gap-1 mb-5 p-1 rounded-lg" style={{ background: '#0a0a0f', border: '1px solid rgba(255,255,255,0.08)' }}>
            <button
              onClick={() => setModalTab('edit')}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium transition-colors ${modalTab === 'edit' ? 'text-[#f0f0f5]' : 'text-[#6a6a7a] hover:text-[#9898aa]'}`}
              style={modalTab === 'edit' ? { background: '#7c6aef22', border: '1px solid #7c6aef40', color: '#a78bfa' } : {}}
            >
              <Pencil size={12} />
              Editar
            </button>
            <button
              onClick={() => setModalTab('execute')}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium transition-colors ${modalTab === 'execute' ? 'text-[#f0f0f5]' : 'text-[#6a6a7a] hover:text-[#9898aa]'}`}
              style={modalTab === 'execute' ? { background: '#05966922', border: '1px solid #10b98140', color: '#34d399' } : {}}
            >
              <Play size={12} />
              Executar
            </button>
          </div>
        )}

        {modalTab === 'edit' || !editingTpl ? (
          <PromptForm
            initial={editingTpl ? templateToForm(editingTpl) : EMPTY_FORM}
            editing={!!editingTpl}
            isSaving={isSaving}
            onSave={handleSave}
            onCancel={closeModal}
          />
        ) : (
          <ExecuteForm
            template={editingTpl}
            onCancel={closeModal}
          />
        )}
      </Modal>

      {/* Modal Exclusão */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Excluir Template"
        size="sm"
      >
        <p className="text-[#9898aa] text-sm mb-1">
          Tem certeza que deseja excluir:
        </p>
        <p className="text-[#f0f0f5] font-semibold text-sm mb-5">
          "{deleteTarget?.name}"
        </p>
        <div className="flex justify-end gap-3">
          <button
            onClick={() => setDeleteTarget(null)}
            className="px-4 py-2.5 rounded-md text-sm text-[#9898aa] border border-[rgba(255,255,255,0.08)] hover:border-[#7c6aef]/40 hover:text-[#f0f0f5] transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
            className="flex items-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium text-white bg-red-500 hover:bg-red-600 transition-colors disabled:opacity-60"
          >
            {deleteMutation.isPending && <Loader2 size={14} className="animate-spin" />}
            Excluir
          </button>
        </div>
      </Modal>
    </div>
  );
}
