// Página Notas Rápidas — Grid estilo Google Keep, CRUD completo, categorias
import { useState, useMemo, useCallback, useEffect } from 'react';
import {
  StickyNote,
  Plus,
  Loader2,
  AlertCircle,
  Pin,
  PinOff,
  Archive,
  ArchiveRestore,
  Pencil,
  Trash2,
  Search,
  Tag,
  X,
  FolderPlus,
} from 'lucide-react';
import {
  useNotes,
  useCreateNote,
  useUpdateNote,
  useDeleteNote,
  useTogglePin,
  useToggleArchive,
  useNoteCategories,
  useCreateNoteCategory,
  type Note,
  type NoteCategory,
} from '../api/new-hooks';
import { Modal } from '../components/Modal';
import { useToast } from '../contexts/ToastContext';
import { PageHeader, ActionButton, SectionLabel } from '../components/PageHeader';

// ─── CONSTANTES ───────────────────────────────────────────────────────────────

const NOTE_COLORS = [
  { name: 'Dark',   value: '#1a1a25' },
  { name: 'Blue',   value: '#1e3a5f' },
  { name: 'Green',  value: '#1a3d2e' },
  { name: 'Purple', value: '#2d1b4e' },
  { name: 'Red',    value: '#4a1a1a' },
  { name: 'Orange', value: '#4a3219' },
  { name: 'Teal',   value: '#1a3d3d' },
  { name: 'Yellow', value: '#3d3a19' },
];

const DEFAULT_COLOR = NOTE_COLORS[0].value;

// ─── TIPOS ────────────────────────────────────────────────────────────────────

interface NoteFormData {
  title:      string;
  content:    string;
  color:      string;
  categoryId: string;
  pinned:     boolean;
}

const EMPTY_NOTE_FORM: NoteFormData = {
  title:      '',
  content:    '',
  color:      DEFAULT_COLOR,
  categoryId: '',
  pinned:     false,
};

interface CategoryFormData {
  name:  string;
  color: string;
}

const EMPTY_CATEGORY_FORM: CategoryFormData = {
  name:  '',
  color: '#7c6aef',
};

// ─── UTILITÁRIOS ──────────────────────────────────────────────────────────────

function formatRelativeDate(iso: string): string {
  const now  = new Date();
  const date = new Date(iso);
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diff < 60)              return 'agora';
  if (diff < 3600)            return `${Math.floor(diff / 60)}min atrás`;
  if (diff < 86400)           return `${Math.floor(diff / 3600)}h atrás`;
  if (diff < 86400 * 7)       return `${Math.floor(diff / 86400)}d atrás`;

  return new Intl.DateTimeFormat('pt-BR', {
    day:   '2-digit',
    month: '2-digit',
    year:  'numeric',
  }).format(date);
}

// ─── MODAL DE NOTA ────────────────────────────────────────────────────────────

interface NoteModalProps {
  isOpen:     boolean;
  onClose:    () => void;
  editNote?:  Note | null;
  categories: NoteCategory[];
}

function NoteModal({ isOpen, onClose, editNote, categories }: NoteModalProps) {
  const { showToast } = useToast();
  const createNote    = useCreateNote();
  const updateNote    = useUpdateNote();
  const isEditing     = !!editNote;

  const [form, setForm] = useState<NoteFormData>(() =>
    editNote
      ? {
          title:      editNote.title,
          content:    editNote.content ?? '',
          color:      editNote.color   ?? DEFAULT_COLOR,
          categoryId: editNote.categoryId ?? '',
          pinned:     editNote.pinned,
        }
      : EMPTY_NOTE_FORM
  );

  const syncForm = useCallback(() => {
    if (editNote) {
      setForm({
        title:      editNote.title,
        content:    editNote.content ?? '',
        color:      editNote.color   ?? DEFAULT_COLOR,
        categoryId: editNote.categoryId ?? '',
        pinned:     editNote.pinned,
      });
    } else {
      setForm(EMPTY_NOTE_FORM);
    }
  }, [editNote]);

  // Sincroniza ao abrir o modal
  useEffect(() => { if (isOpen) syncForm(); }, [isOpen, syncForm]);

  const set = useCallback(<K extends keyof NoteFormData>(field: K, value: NoteFormData[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      showToast('Título é obrigatório.', 'error');
      return;
    }

    const payload: Partial<Note> = {
      title:      form.title.trim(),
      content:    form.content.trim() || undefined,
      color:      form.color,
      pinned:     form.pinned,
      categoryId: form.categoryId || undefined,
    };

    try {
      if (isEditing && editNote) {
        await updateNote.mutateAsync({ id: editNote.id, data: payload });
        showToast('Nota atualizada!', 'success');
      } else {
        await createNote.mutateAsync({ ...payload, archived: false });
        showToast('Nota criada!', 'success');
      }
      setForm(EMPTY_NOTE_FORM);
      onClose();
    } catch {
      showToast('Erro ao salvar nota.', 'error');
    }
  }, [form, isEditing, editNote, createNote, updateNote, showToast, onClose]);

  const isPending = createNote.isPending || updateNote.isPending;

  const inputStyle = {
    background: '#0a0a0f',
    border:     '1px solid rgba(255,255,255,0.08)',
  };

  const handleFocus  = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    e.currentTarget.style.borderColor = '#7c6aef';
  };
  const handleBlur   = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => { setForm(EMPTY_NOTE_FORM); onClose(); }}
      title={isEditing ? 'Editar Nota' : 'Nova Nota'}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">

        {/* Titulo */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-[#f0f0f5]">
            Título <span style={{ color: '#ef4444' }}>*</span>
          </label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => set('title', e.target.value)}
            placeholder="Ex: Ideia de projeto"
            className="w-full px-3 py-2.5 rounded-md text-sm text-[#f0f0f5] placeholder-[#6a6a7a] outline-none transition-colors"
            style={inputStyle}
            onFocus={handleFocus}
            onBlur={handleBlur}
            autoFocus
          />
        </div>

        {/* Conteudo */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-[#f0f0f5]">Conteúdo</label>
          <textarea
            value={form.content}
            onChange={(e) => set('content', e.target.value)}
            placeholder="Escreva aqui..."
            rows={5}
            className="w-full px-3 py-2.5 rounded-md text-sm text-[#f0f0f5] placeholder-[#6a6a7a] outline-none transition-colors resize-y"
            style={inputStyle}
            onFocus={handleFocus}
            onBlur={handleBlur}
          />
        </div>

        {/* Categoria + Pin */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '16px', alignItems: 'end' }}>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[#f0f0f5]">Categoria</label>
            <select
              value={form.categoryId}
              onChange={(e) => set('categoryId', e.target.value)}
              className="w-full px-3 py-2.5 rounded-md text-sm text-[#f0f0f5] outline-none transition-colors"
              style={inputStyle}
              onFocus={handleFocus}
              onBlur={handleBlur}
            >
              <option value="">Sem categoria</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>

          {/* Toggle pin */}
          <button
            type="button"
            onClick={() => set('pinned', !form.pinned)}
            className="flex items-center gap-2 px-3 py-2.5 rounded-md text-sm transition-colors"
            style={{
              background: form.pinned ? '#f59e0b20' : 'rgba(255,255,255,0.04)',
              border:     `1px solid ${form.pinned ? '#f59e0b40' : 'rgba(255,255,255,0.08)'}`,
              color:      form.pinned ? '#f59e0b'   : '#9898aa',
            }}
          >
            <Pin size={14} />
            {form.pinned ? 'Fixada' : 'Fixar'}
          </button>
        </div>

        {/* Seletor de cores */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-[#f0f0f5]">Cor da nota</label>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {NOTE_COLORS.map((c) => (
              <button
                key={c.value}
                type="button"
                title={c.name}
                onClick={() => set('color', c.value)}
                style={{
                  width:        '32px',
                  height:       '32px',
                  borderRadius: '8px',
                  background:   c.value,
                  border:       form.color === c.value
                    ? '2px solid #7c6aef'
                    : '2px solid rgba(255,255,255,0.12)',
                  cursor:       'pointer',
                  transition:   'transform 0.1s, border-color 0.15s',
                  transform:    form.color === c.value ? 'scale(1.15)' : 'scale(1)',
                }}
              />
            ))}
          </div>
        </div>

        {/* Preview cor */}
        <div
          style={{
            background:   form.color,
            borderRadius: '8px',
            padding:      '12px 14px',
            border:       '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <p className="text-sm font-medium text-[#f0f0f5] leading-snug">
            {form.title || 'Título da nota'}
          </p>
          {form.content && (
            <p className="text-xs text-[#9898aa] mt-1 line-clamp-2">{form.content}</p>
          )}
        </div>

        {/* Botoes */}
        <div
          className="flex justify-end gap-3 pt-2"
          style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}
        >
          <button
            type="button"
            onClick={() => { setForm(EMPTY_NOTE_FORM); onClose(); }}
            className="px-4 py-2 rounded-md text-sm text-[#9898aa] hover:text-[#f0f0f5] transition-colors"
            style={{ background: 'transparent' }}
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
            {isEditing ? 'Salvar' : 'Criar Nota'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ─── MODAL DE CATEGORIA ────────────────────────────────────────────────────────

interface CategoryModalProps {
  isOpen:  boolean;
  onClose: () => void;
}

function CategoryModal({ isOpen, onClose }: CategoryModalProps) {
  const { showToast }    = useToast();
  const createCategory   = useCreateNoteCategory();

  const [form, setForm] = useState<CategoryFormData>(EMPTY_CATEGORY_FORM);

  const set = useCallback(<K extends keyof CategoryFormData>(field: K, value: CategoryFormData[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      showToast('Nome é obrigatório.', 'error');
      return;
    }
    try {
      await createCategory.mutateAsync({ name: form.name.trim(), color: form.color });
      showToast('Categoria criada!', 'success');
      setForm(EMPTY_CATEGORY_FORM);
      onClose();
    } catch {
      showToast('Erro ao criar categoria.', 'error');
    }
  }, [form, createCategory, showToast, onClose]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => { setForm(EMPTY_CATEGORY_FORM); onClose(); }}
      title="Nova Categoria"
      size="sm"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-[#f0f0f5]">
            Nome <span style={{ color: '#ef4444' }}>*</span>
          </label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            placeholder="Ex: Trabalho"
            className="w-full px-3 py-2.5 rounded-md text-sm text-[#f0f0f5] placeholder-[#6a6a7a] outline-none transition-colors"
            style={{ background: '#0a0a0f', border: '1px solid rgba(255,255,255,0.08)' }}
            onFocus={(e) => (e.currentTarget.style.borderColor = '#7c6aef')}
            onBlur={(e)  => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)')}
            autoFocus
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-[#f0f0f5]">Cor</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <input
              type="color"
              value={form.color}
              onChange={(e) => set('color', e.target.value)}
              style={{
                width:        '44px',
                height:       '36px',
                borderRadius: '8px',
                border:       '1px solid rgba(255,255,255,0.12)',
                background:   'transparent',
                cursor:       'pointer',
                padding:      '2px',
              }}
            />
            <span className="text-sm text-[#9898aa]">{form.color}</span>
            {/* Preview badge */}
            <span
              className="px-2.5 py-1 rounded-full text-xs font-medium"
              style={{
                background: `${form.color}25`,
                color:       form.color,
                border:      `1px solid ${form.color}50`,
              }}
            >
              {form.name || 'Preview'}
            </span>
          </div>
        </div>

        <div
          className="flex justify-end gap-3 pt-2"
          style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}
        >
          <button
            type="button"
            onClick={() => { setForm(EMPTY_CATEGORY_FORM); onClose(); }}
            className="px-4 py-2 rounded-md text-sm text-[#9898aa] hover:text-[#f0f0f5] transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={createCategory.isPending}
            className="px-5 py-2 rounded-md text-sm font-medium text-white flex items-center gap-2 disabled:opacity-60"
            style={{ background: '#7c6aef' }}
          >
            {createCategory.isPending
              ? <Loader2 size={14} className="animate-spin" />
              : <FolderPlus size={14} />
            }
            Criar
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ─── CARD DE NOTA ─────────────────────────────────────────────────────────────

interface NoteCardProps {
  note:          Note;
  onEdit:        (n: Note) => void;
  onDelete:      (id: string) => void;
  onTogglePin:   (id: string) => void;
  onToggleArchive: (id: string) => void;
}

function NoteCard({ note, onEdit, onDelete, onTogglePin, onToggleArchive }: NoteCardProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleDeleteClick = useCallback(() => {
    if (confirmDelete) {
      onDelete(note.id);
    } else {
      setConfirmDelete(true);
      // Auto-cancelar confirmacao apos 3s
      setTimeout(() => setConfirmDelete(false), 3000);
    }
  }, [confirmDelete, onDelete, note.id]);

  return (
    <div
      className="group flex flex-col rounded-xl"
      style={{
        background:   note.color ?? DEFAULT_COLOR,
        border:       '1px solid rgba(255,255,255,0.10)',
        transition:   'transform 0.15s, box-shadow 0.15s, border-color 0.15s',
        position:     'relative',
        overflow:     'hidden',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.transform     = 'translateY(-2px)';
        (e.currentTarget as HTMLDivElement).style.boxShadow     = '0 8px 24px rgba(0,0,0,0.4)';
        (e.currentTarget as HTMLDivElement).style.borderColor   = 'rgba(255,255,255,0.20)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.transform     = 'translateY(0)';
        (e.currentTarget as HTMLDivElement).style.boxShadow     = 'none';
        (e.currentTarget as HTMLDivElement).style.borderColor   = 'rgba(255,255,255,0.10)';
      }}
    >
      {/* Tarja superior se pinada */}
      {note.pinned && (
        <div
          style={{
            position:   'absolute',
            top:        0,
            left:       0,
            right:      0,
            height:     '3px',
            background: 'linear-gradient(90deg, #f59e0b, #f97316)',
          }}
        />
      )}

      {/* Corpo */}
      <div style={{ padding: '14px 14px 10px', flex: 1 }}>
        {/* Header: titulo + pin icon */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px', marginBottom: '6px' }}>
          <p
            className="text-sm font-semibold text-[#f0f0f5] leading-snug"
            style={{
              wordBreak: 'break-word',
              flex:      1,
            }}
          >
            {note.title}
          </p>
          {note.pinned && (
            <Pin size={12} style={{ color: '#f59e0b', flexShrink: 0, marginTop: '2px' }} />
          )}
        </div>

        {/* Conteudo */}
        {note.content && (
          <p
            className="text-xs text-[#b0b0c0] leading-relaxed"
            style={{
              display:           '-webkit-box',
              WebkitLineClamp:   6,
              WebkitBoxOrient:   'vertical',
              overflow:          'hidden',
              wordBreak:         'break-word',
            }}
          >
            {note.content}
          </p>
        )}
      </div>

      {/* Footer: categoria + data + acoes */}
      <div
        style={{
          padding:    '8px 14px 10px',
          borderTop:  '1px solid rgba(255,255,255,0.06)',
          display:    'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap:        '6px',
        }}
      >
        {/* Esquerda: categoria + data */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', flex: 1, minWidth: 0 }}>
          {note.category && (
            <span
              className="inline-flex items-center gap-1 text-[10px] font-semibold"
              style={{
                color:      note.category.color,
                background: `${note.category.color}20`,
                border:     `1px solid ${note.category.color}40`,
                borderRadius: '4px',
                padding:    '1px 6px',
                maxWidth:   'fit-content',
              }}
            >
              <Tag size={9} />
              {note.category.name}
            </span>
          )}
          <span className="text-[10px] text-[#6a6a7a]">
            {formatRelativeDate(note.updatedAt)}
          </span>
        </div>

        {/* Direita: acoes (visiveis no hover) */}
        <div
          className="flex items-center gap-0.5"
          style={{
            opacity:    0,
            transition: 'opacity 0.15s',
          }}
          ref={(el) => {
            if (!el) return;
            const card = el.closest('.group') as HTMLDivElement | null;
            if (!card) return;
            const show = () => { el.style.opacity = '1'; };
            const hide = () => { el.style.opacity = '0'; };
            card.addEventListener('mouseenter', show);
            card.addEventListener('mouseleave', hide);
          }}
        >
          {/* Pin / Unpin */}
          <button
            onClick={() => onTogglePin(note.id)}
            className="p-1.5 rounded-md transition-colors"
            style={{ color: note.pinned ? '#f59e0b' : '#6a6a7a' }}
            title={note.pinned ? 'Desafixar' : 'Fixar'}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            {note.pinned ? <PinOff size={13} /> : <Pin size={13} />}
          </button>

          {/* Archive / Unarchive */}
          <button
            onClick={() => onToggleArchive(note.id)}
            className="p-1.5 rounded-md transition-colors"
            style={{ color: note.archived ? '#22c55e' : '#6a6a7a' }}
            title={note.archived ? 'Desarquivar' : 'Arquivar'}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            {note.archived ? <ArchiveRestore size={13} /> : <Archive size={13} />}
          </button>

          {/* Editar */}
          <button
            onClick={() => onEdit(note)}
            className="p-1.5 rounded-md transition-colors"
            style={{ color: '#6a6a7a' }}
            title="Editar"
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#7c6aef20';
              e.currentTarget.style.color      = '#7c6aef';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color      = '#6a6a7a';
            }}
          >
            <Pencil size={13} />
          </button>

          {/* Deletar com confirmacao */}
          <button
            onClick={handleDeleteClick}
            className="p-1.5 rounded-md transition-colors flex items-center gap-1"
            style={{
              color:      confirmDelete ? '#ef4444' : '#6a6a7a',
              background: confirmDelete ? '#ef444420' : 'transparent',
              border:     confirmDelete ? '1px solid #ef444440' : '1px solid transparent',
              borderRadius: '6px',
              fontSize:   '11px',
            }}
            title={confirmDelete ? 'Clique para confirmar' : 'Deletar'}
            onMouseEnter={(e) => {
              if (!confirmDelete) {
                e.currentTarget.style.background = '#ef444420';
                e.currentTarget.style.color      = '#ef4444';
              }
            }}
            onMouseLeave={(e) => {
              if (!confirmDelete) {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color      = '#6a6a7a';
              }
            }}
          >
            <Trash2 size={13} />
            {confirmDelete && <span style={{ fontSize: '10px', fontWeight: 600 }}>Confirmar?</span>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── COMPONENTE PRINCIPAL ─────────────────────────────────────────────────────

export function Notes() {
  const { showToast } = useToast();

  // ── Estado de filtros ──────────────────────────────────────────────────────
  const [search,       setSearch]       = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [showArchived, setShowArchived] = useState(false);

  // ── Estado de modais ───────────────────────────────────────────────────────
  const [showNoteModal,     setShowNoteModal]     = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editNote,          setEditNote]          = useState<Note | null>(null);

  // ── Queries ────────────────────────────────────────────────────────────────
  const { data: allNotes = [], isLoading, isError } = useNotes();
  const { data: categories = [] }                   = useNoteCategories();

  const deleteNote     = useDeleteNote();
  const togglePin      = useTogglePin();
  const toggleArchive  = useToggleArchive();

  // ── Dados filtrados e ordenados ────────────────────────────────────────────
  const filteredNotes = useMemo(() => {
    let notes = allNotes;

    // Filtro: arquivadas vs ativas
    notes = notes.filter((n) => n.archived === showArchived);

    // Filtro: categoria
    if (categoryFilter) {
      notes = notes.filter((n) => n.categoryId === categoryFilter);
    }

    // Filtro: busca de texto
    if (search.trim()) {
      const q = search.toLowerCase();
      notes = notes.filter(
        (n) =>
          n.title.toLowerCase().includes(q) ||
          (n.content ?? '').toLowerCase().includes(q)
      );
    }

    // Ordenar: pinadas primeiro, depois por data de atualizacao
    return [...notes].sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  }, [allNotes, showArchived, categoryFilter, search]);

  // ── KPIs ───────────────────────────────────────────────────────────────────
  const kpis = useMemo(() => ({
    total:    allNotes.filter((n) => !n.archived).length,
    pinned:   allNotes.filter((n) => n.pinned && !n.archived).length,
    archived: allNotes.filter((n) => n.archived).length,
    cats:     categories.length,
  }), [allNotes, categories]);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleDelete = useCallback(async (id: string) => {
    try {
      await deleteNote.mutateAsync(id);
      showToast('Nota deletada.', 'success');
    } catch {
      showToast('Erro ao deletar nota.', 'error');
    }
  }, [deleteNote, showToast]);

  const handleTogglePin = useCallback(async (id: string) => {
    try {
      await togglePin.mutateAsync(id);
    } catch {
      showToast('Erro ao fixar/desafixar nota.', 'error');
    }
  }, [togglePin, showToast]);

  const handleToggleArchive = useCallback(async (id: string) => {
    try {
      await toggleArchive.mutateAsync(id);
      showToast(
        showArchived ? 'Nota desarquivada.' : 'Nota arquivada.',
        'success'
      );
    } catch {
      showToast('Erro ao arquivar/desarquivar nota.', 'error');
    }
  }, [toggleArchive, showToast, showArchived]);

  const handleEdit = useCallback((note: Note) => {
    setEditNote(note);
    setShowNoteModal(true);
  }, []);

  const handleCloseNoteModal = useCallback(() => {
    setShowNoteModal(false);
    setEditNote(null);
  }, []);

  const handleClearFilters = useCallback(() => {
    setSearch('');
    setCategoryFilter('');
  }, []);

  const hasActiveFilters = search.trim() !== '' || categoryFilter !== '';

  // ── Loading / Error ────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '128px 0' }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
          <Loader2 size={32} className="animate-spin" style={{ color: '#7c6aef' }} />
          <p style={{ fontSize: '14px', color: '#9898aa' }}>Carregando notas...</p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '128px 0' }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', textAlign: 'center' }}>
          <AlertCircle size={32} style={{ color: '#ef4444' }} />
          <p style={{ color: '#f0f0f5', fontWeight: 600 }}>Erro ao carregar notas</p>
          <p style={{ fontSize: '14px', color: '#6a6a7a' }}>Verifique a conexão com o servidor.</p>
        </div>
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col" style={{ gap: 'var(--space-xl)' }}>

      {/* Header */}
      <PageHeader
        title="Notas Rápidas"
        description="Capture ideias, lembretes e rascunhos."
        action={
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setShowCategoryModal(true)}
              className="inline-flex items-center gap-2 px-3 h-10 rounded-md text-sm font-medium transition-colors"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border:     '1px solid rgba(255,255,255,0.10)',
                color:      '#9898aa',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color       = '#f0f0f5';
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.18)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color       = '#9898aa';
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.10)';
              }}
            >
              <FolderPlus size={15} />
              Nova Categoria
            </button>
            <ActionButton
              onClick={() => { setEditNote(null); setShowNoteModal(true); }}
              icon={<Plus size={16} />}
            >
              Nova Nota
            </ActionButton>
          </div>
        }
      />

      {/* KPIs */}
      <section>
        <SectionLabel>Resumo</SectionLabel>
        <div
          style={{
            display:             'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap:                 '12px',
          }}
        >
          {[
            { label: 'Ativas',      value: kpis.total,    color: '#7c6aef', icon: <StickyNote size={18} /> },
            { label: 'Fixadas',     value: kpis.pinned,   color: '#f59e0b', icon: <Pin size={18} /> },
            { label: 'Arquivadas',  value: kpis.archived, color: '#6a6a7a', icon: <Archive size={18} /> },
            { label: 'Categorias',  value: kpis.cats,     color: '#22c55e', icon: <Tag size={18} /> },
          ].map(({ label, value, color, icon }) => (
            <div
              key={label}
              className="rounded-lg border p-4"
              style={{
                background:   '#16161f',
                borderColor:  'rgba(255,255,255,0.08)',
                display:      'flex',
                alignItems:   'flex-start',
                gap:          '14px',
              }}
            >
              <div
                style={{
                  width:        '38px',
                  height:       '38px',
                  borderRadius: '8px',
                  background:   `${color}20`,
                  border:       `1px solid ${color}40`,
                  display:      'flex',
                  alignItems:   'center',
                  justifyContent: 'center',
                  flexShrink:   0,
                  color,
                }}
              >
                {icon}
              </div>
              <div>
                <p
                  style={{
                    fontSize:      '11px',
                    fontWeight:    600,
                    color:         '#9898aa',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    marginBottom:  '2px',
                  }}
                >
                  {label}
                </p>
                <p
                  style={{
                    fontSize:   '28px',
                    fontWeight: 700,
                    color:      '#f0f0f5',
                    fontFamily: 'JetBrains Mono, monospace',
                    lineHeight: 1,
                  }}
                >
                  {value}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Barra de filtros */}
      <div
        style={{
          display:     'flex',
          alignItems:  'center',
          gap:         '10px',
          flexWrap:    'wrap',
        }}
      >
        {/* Campo de busca */}
        <div style={{ position: 'relative', flex: '1', minWidth: '200px', maxWidth: '340px' }}>
          <Search
            size={15}
            style={{
              position:  'absolute',
              left:      '10px',
              top:       '50%',
              transform: 'translateY(-50%)',
              color:     '#6a6a7a',
              pointerEvents: 'none',
            }}
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar notas..."
            className="w-full text-sm text-[#f0f0f5] placeholder-[#6a6a7a] outline-none transition-colors"
            style={{
              paddingLeft:  '34px',
              paddingRight: search ? '32px' : '12px',
              paddingTop:   '8px',
              paddingBottom: '8px',
              background:   '#16161f',
              border:       '1px solid rgba(255,255,255,0.08)',
              borderRadius: '8px',
            }}
            onFocus={(e)  => (e.currentTarget.style.borderColor = '#7c6aef')}
            onBlur={(e)   => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)')}
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              style={{
                position:  'absolute',
                right:     '8px',
                top:       '50%',
                transform: 'translateY(-50%)',
                color:     '#6a6a7a',
                background: 'transparent',
                border:     'none',
                cursor:     'pointer',
                padding:    '2px',
                display:    'flex',
              }}
            >
              <X size={13} />
            </button>
          )}
        </div>

        {/* Filtro de categoria */}
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="text-sm text-[#f0f0f5] outline-none"
          style={{
            padding:      '8px 12px',
            background:   '#16161f',
            border:       '1px solid rgba(255,255,255,0.08)',
            borderRadius: '8px',
          }}
        >
          <option value="">Todas categorias</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>{cat.name}</option>
          ))}
        </select>

        {/* Toggle arquivadas */}
        <button
          onClick={() => setShowArchived((v) => !v)}
          className="flex items-center gap-2 text-sm px-3 py-2 rounded-lg transition-colors"
          style={{
            background:   showArchived ? '#6a6a7a20' : 'transparent',
            border:       `1px solid ${showArchived ? '#6a6a7a50' : 'rgba(255,255,255,0.08)'}`,
            color:        showArchived ? '#9898aa' : '#6a6a7a',
          }}
        >
          {showArchived ? <ArchiveRestore size={15} /> : <Archive size={15} />}
          {showArchived ? 'Ver ativas' : 'Ver arquivadas'}
        </button>

        {/* Limpar filtros */}
        {hasActiveFilters && (
          <button
            onClick={handleClearFilters}
            className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg transition-colors"
            style={{
              color:        '#ef4444',
              background:   '#ef444415',
              border:       '1px solid #ef444430',
            }}
          >
            <X size={12} />
            Limpar filtros
          </button>
        )}

        {/* Contador */}
        <span
          className="text-sm ml-auto"
          style={{ color: '#6a6a7a', whiteSpace: 'nowrap' }}
        >
          {filteredNotes.length}{' '}
          {filteredNotes.length === 1 ? 'nota' : 'notas'}
          {showArchived && ' arquivadas'}
        </span>
      </div>

      {/* Grid de notas */}
      {filteredNotes.length === 0 ? (
        <div
          style={{
            display:        'flex',
            flexDirection:  'column',
            alignItems:     'center',
            justifyContent: 'center',
            padding:        '80px 0',
            gap:            '16px',
          }}
        >
          <div
            style={{
              width:        '56px',
              height:       '56px',
              borderRadius: '14px',
              background:   '#7c6aef20',
              border:       '1px solid #7c6aef40',
              display:      'flex',
              alignItems:   'center',
              justifyContent: 'center',
            }}
          >
            <StickyNote size={24} style={{ color: '#7c6aef' }} />
          </div>
          <div style={{ textAlign: 'center' }}>
            <p style={{ color: '#f0f0f5', fontWeight: 600, marginBottom: '4px' }}>
              {hasActiveFilters
                ? 'Nenhuma nota encontrada para esse filtro'
                : showArchived
                  ? 'Nenhuma nota arquivada'
                  : 'Nenhuma nota criada ainda'
              }
            </p>
            <p style={{ fontSize: '13px', color: '#6a6a7a' }}>
              {hasActiveFilters
                ? 'Tente ajustar os filtros de busca.'
                : 'Crie sua primeira nota rápida.'}
            </p>
          </div>
          {!hasActiveFilters && !showArchived && (
            <button
              onClick={() => { setEditNote(null); setShowNoteModal(true); }}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium text-white hover:opacity-90 transition-opacity"
              style={{ background: '#7c6aef' }}
            >
              <Plus size={16} />
              Nova Nota
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Separador de notas fixadas */}
          {filteredNotes.some((n) => n.pinned) && !showArchived && (
            <div>
              <SectionLabel>Fixadas</SectionLabel>
              <div
                style={{
                  display:             'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                  gap:                 '14px',
                }}
              >
                {filteredNotes
                  .filter((n) => n.pinned)
                  .map((note) => (
                    <NoteCard
                      key={note.id}
                      note={note}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                      onTogglePin={handleTogglePin}
                      onToggleArchive={handleToggleArchive}
                    />
                  ))}
              </div>
            </div>
          )}

          {/* Notas nao fixadas */}
          {filteredNotes.some((n) => !n.pinned) && (
            <div>
              {filteredNotes.some((n) => n.pinned) && !showArchived && (
                <SectionLabel>Outras</SectionLabel>
              )}
              <div
                style={{
                  display:             'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                  gap:                 '14px',
                }}
              >
                {filteredNotes
                  .filter((n) => !n.pinned)
                  .map((note) => (
                    <NoteCard
                      key={note.id}
                      note={note}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                      onTogglePin={handleTogglePin}
                      onToggleArchive={handleToggleArchive}
                    />
                  ))}
              </div>
            </div>
          )}

          {/* Caso filtros ativos sem separacao (ex: arquivadas) */}
          {(showArchived || !filteredNotes.some((n) => n.pinned)) && showArchived && (
            <div
              style={{
                display:             'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                gap:                 '14px',
                marginTop:           '-8px',
              }}
            >
              {/* Ja renderizado acima pelo bloco "Outras", mas evitamos duplos */}
            </div>
          )}
        </>
      )}

      {/* Categorias — painel colapsavel ao final */}
      {categories.length > 0 && (
        <section>
          <SectionLabel>Categorias</SectionLabel>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {categories.map((cat) => {
              const count = allNotes.filter((n) => n.categoryId === cat.id && !n.archived).length;
              return (
                <button
                  key={cat.id}
                  onClick={() => setCategoryFilter(categoryFilter === cat.id ? '' : cat.id)}
                  style={{
                    display:      'inline-flex',
                    alignItems:   'center',
                    gap:          '6px',
                    padding:      '5px 12px',
                    borderRadius: '20px',
                    fontSize:     '12px',
                    fontWeight:   600,
                    cursor:       'pointer',
                    transition:   'opacity 0.15s, transform 0.1s',
                    background:   categoryFilter === cat.id ? `${cat.color}30` : `${cat.color}15`,
                    border:       `1px solid ${categoryFilter === cat.id ? cat.color : `${cat.color}50`}`,
                    color:        cat.color,
                    transform:    categoryFilter === cat.id ? 'scale(1.03)' : 'scale(1)',
                  }}
                >
                  <span
                    style={{
                      width:        '6px',
                      height:       '6px',
                      borderRadius: '50%',
                      background:   cat.color,
                      flexShrink:   0,
                    }}
                  />
                  {cat.name}
                  <span
                    style={{
                      background:   `${cat.color}30`,
                      borderRadius: '10px',
                      padding:      '1px 6px',
                      fontSize:     '10px',
                    }}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* Modais */}
      <NoteModal
        key={editNote?.id ?? 'new'}
        isOpen={showNoteModal}
        onClose={handleCloseNoteModal}
        editNote={editNote}
        categories={categories}
      />
      <CategoryModal
        isOpen={showCategoryModal}
        onClose={() => setShowCategoryModal(false)}
      />
    </div>
  );
}
