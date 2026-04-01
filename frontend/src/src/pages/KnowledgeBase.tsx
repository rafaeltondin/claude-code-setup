// Página Knowledge Base — documentos da KB do Ecosystem
import { useState, useMemo } from 'react';
import {
  BookOpen,
  Search,
  FolderOpen,
  FileText,
  Layers,
  Loader2,
  AlertCircle,
  Trash2,
  Eye,
} from 'lucide-react';
import { Modal } from '../components/Modal';
import { PageHeader, SectionLabel } from '../components/PageHeader';
import {
  useKBDocuments,
  useKBSearch,
  useKBStats,
  useKBDocument,
  useDeleteKBDocument,
} from '../api/ecosystem-hooks';
import { useToast } from '../contexts/ToastContext';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import type { KBDocument, KBSearchResult } from '../types';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function extractUniqueCategories(docs: KBDocument[]): string[] {
  const cats = docs.map((d) => d.category).filter(Boolean) as string[];
  return [...new Set(cats)].sort();
}

function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query || query.length < 2) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-[#7c6aef]/30 text-[#9080f5] rounded px-0.5">
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </>
  );
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

// ─── Document Card ────────────────────────────────────────────────────────────

interface DocCardProps {
  doc: KBDocument;
  query: string;
  onPreview: (filename: string) => void;
  onDelete: (filename: string, name: string) => void;
}

function DocCard({ doc, query, onPreview, onDelete }: DocCardProps) {
  return (
    <div
      className="rounded-lg border border-[rgba(255,255,255,0.08)] p-4 flex flex-col gap-3 hover:border-[#7c6aef]/40 transition-colors group"
      style={{ background: '#16161f' }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 min-w-0">
          <FileText size={16} className="text-[#7c6aef] shrink-0 mt-0.5" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[#f0f0f5] leading-tight truncate">
              {highlightMatch(doc.name, query)}
            </p>
            <p className="text-xs text-[#6a6a7a] font-mono truncate mt-0.5">{doc.filename}</p>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onPreview(doc.filename)}
            className="p-1.5 rounded hover:bg-[rgba(255,255,255,0.06)] text-[#6a6a7a] hover:text-[#9080f5] transition-colors"
            title="Visualizar documento"
            aria-label={`Visualizar ${doc.name}`}
          >
            <Eye size={14} />
          </button>
          <button
            onClick={() => onDelete(doc.filename, doc.name)}
            className="p-1.5 rounded hover:bg-red-500/10 text-[#6a6a7a] hover:text-red-400 transition-colors"
            title="Excluir documento"
            aria-label={`Excluir ${doc.name}`}
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Meta */}
      <div className="flex items-center gap-3 flex-wrap">
        {doc.category && (
          <span
            className="px-2 py-0.5 rounded text-xs font-medium"
            style={{
              background: '#7c6aef18',
              color: '#60a5fa',
              border: '1px solid #7c6aef30',
            }}
          >
            {doc.category}
          </span>
        )}
        {doc.sections !== undefined && (
          <span className="flex items-center gap-1 text-xs text-[#6a6a7a]">
            <Layers size={11} />
            {doc.sections} seções
          </span>
        )}
        {doc.size !== undefined && (
          <span className="text-xs text-[#6a6a7a]">{formatBytes(doc.size)}</span>
        )}
        {doc.lastModified && (
          <span className="text-xs text-[#6a6a7a] ml-auto">{formatDate(doc.lastModified)}</span>
        )}
      </div>
    </div>
  );
}

// ─── Search Result Card ───────────────────────────────────────────────────────

interface SearchCardProps {
  result: KBSearchResult;
  query: string;
  onPreview: (filename: string) => void;
}

function SearchCard({ result, query, onPreview }: SearchCardProps) {
  return (
    <div
      className="rounded-lg border border-[#7c6aef]/30 p-4 flex flex-col gap-3"
      style={{ background: '#16161f' }}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <FileText size={15} className="text-[#7c6aef] shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[#f0f0f5] truncate">{result.name}</p>
            {result.category && (
              <span
                className="px-1.5 py-0.5 rounded text-xs"
                style={{ background: '#7c6aef18', color: '#60a5fa' }}
              >
                {result.category}
              </span>
            )}
          </div>
        </div>
        <button
          onClick={() => onPreview(result.filename)}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs text-[#9898aa] border border-[rgba(255,255,255,0.08)] hover:border-[#7c6aef]/50 hover:text-[#9080f5] transition-colors shrink-0"
        >
          <Eye size={12} />
          Ver
        </button>
      </div>

      {result.matches.slice(0, 3).map((match, i) => (
        <div
          key={i}
          className="rounded-md px-3 py-2.5"
          style={{ background: '#0a0a0f', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <p className="text-xs font-medium text-[#9080f5] mb-1 truncate">{match.section}</p>
          <p className="text-xs text-[#9898aa] leading-relaxed line-clamp-2">
            {highlightMatch(match.content, query)}
          </p>
          <p
            className="text-xs mt-1 font-mono"
            style={{ color: match.score >= 0.7 ? '#22c55e' : '#eab308' }}
          >
            score {(match.score * 100).toFixed(0)}%
          </p>
        </div>
      ))}
    </div>
  );
}

// ─── Preview Modal Content ────────────────────────────────────────────────────

function PreviewContent({ filename }: { filename: string }) {
  const { data, isLoading, error } = useKBDocument(filename);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-40 gap-3">
        <Loader2 size={20} className="animate-spin text-[#7c6aef]" />
        <span className="text-sm text-[#9898aa]">Carregando documento...</span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center gap-2 p-3 rounded-md bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
        <AlertCircle size={16} />
        Erro ao carregar documento.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Metadata */}
      {data.metadata && Object.keys(data.metadata).length > 0 && (
        <div
          className="rounded-md px-3 py-2 flex flex-wrap gap-x-4 gap-y-1"
          style={{ background: '#0a0a0f', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          {Object.entries(data.metadata).map(([k, v]) => (
            <span key={k} className="text-xs text-[#6a6a7a]">
              <span className="text-[#9898aa] font-medium">{k}:</span>{' '}
              {String(v)}
            </span>
          ))}
        </div>
      )}

      {/* Content */}
      <div
        className="rounded-md p-4 overflow-y-auto max-h-[60vh]"
        style={{ background: '#0a0a0f', border: '1px solid rgba(255,255,255,0.08)' }}
      >
        <pre className="text-xs text-[#9898aa] leading-relaxed whitespace-pre-wrap font-mono">
          {data.content}
        </pre>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function KnowledgeBase() {
  const { showToast } = useToast();

  const [searchQuery, setSearchQuery]         = useState('');
  const [categoryFilter, setCategoryFilter]   = useState('');
  const [previewFile, setPreviewFile]         = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget]       = useState<{ filename: string; name: string } | null>(null);

  // Debounce de 400ms para evitar requisicoes a cada tecla digitada
  const debouncedSearch = useDebouncedValue(searchQuery, 400);

  const { data: documents = [], isLoading: docsLoading, error: docsError, refetch: refetchDocs } = useKBDocuments();
  const { data: stats, isLoading: statsLoading }                            = useKBStats();
  const { data: searchResults, isFetching: searching }                      = useKBSearch(debouncedSearch);
  const deleteMutation                                                       = useDeleteKBDocument();

  // Considera "buscando" tanto quando o input tem texto quanto enquanto o debounce nao disparou
  const isSearching = debouncedSearch.length >= 2;
  const isTyping    = searchQuery.length >= 2 && searchQuery !== debouncedSearch;

  const categories = useMemo(() => extractUniqueCategories(documents), [documents]);

  const totalSections = useMemo(
    () => documents.reduce((acc, doc) => acc + (doc.sections ?? 0), 0),
    [documents]
  );

  const filteredDocs = useMemo(() => {
    if (isSearching) return [];
    return documents.filter((doc) => {
      const matchesCat = !categoryFilter || doc.category === categoryFilter;
      return matchesCat;
    });
  }, [documents, categoryFilter, isSearching]);

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync(deleteTarget.filename);
      showToast(`"${deleteTarget.name}" removido`, 'success');
      setDeleteTarget(null);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Erro ao remover documento', 'error');
    }
  }

  return (
    <div className="flex flex-col" style={{ gap: 'var(--space-xl)' }}>
      {/* Header */}
      <PageHeader
        title="Knowledge Base"
        description="Documentos da base de conhecimento do Ecosystem"
        breadcrumb={[{ label: 'Home', to: '/' }, { label: 'Knowledge Base' }]}
      />

      {/* KPI Cards */}
      <section className="flex flex-col">
        <SectionLabel>Métricas</SectionLabel>
        <div className="grid grid-cols-1 sm:grid-cols-3" style={{ gap: 'var(--space-lg)' }}>
          <KpiCard
            title="Total Documentos"
            value={stats?.totalDocuments ?? documents.length}
            icon={<BookOpen size={20} />}
            color="#7c6aef"
            loading={statsLoading && docsLoading}
          />
          <KpiCard
            title="Categorias"
            value={stats?.categories ?? categories.length}
            icon={<FolderOpen size={20} />}
            color="#9080f5"
            loading={statsLoading}
          />
          <KpiCard
            title="Seções"
            value={stats?.totalSections ?? totalSections}
            icon={<Layers size={20} />}
            color="#a78bfa"
            loading={statsLoading}
          />
        </div>
      </section>

      {/* Barra de busca + filtro */}
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
            placeholder="Buscar documentos e conteúdo..."
            className="w-full pl-9 pr-4 py-2.5 bg-[#16161f] border border-[rgba(255,255,255,0.08)] rounded-lg text-sm text-[#f0f0f5] placeholder-[#6a6a7a] focus:outline-none focus:border-[#7c6aef]/60 transition-colors"
          />
          {(searching || isTyping) && (
            <Loader2
              size={13}
              className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-[#7c6aef]"
            />
          )}
        </div>

        {!isSearching && categories.length > 0 && (
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

      {/* Resultados de busca */}
      {isSearching && (
        <section>
          <h2 className="text-[13px] font-semibold text-[#9898aa] uppercase tracking-wide mb-3">
            {isTyping || searching
              ? 'Buscando...'
              : `${searchResults?.length ?? 0} resultado${(searchResults?.length ?? 0) !== 1 ? 's' : ''} para "${debouncedSearch}"`}
          </h2>

          {!searching && searchResults && searchResults.length === 0 && (
            <div
              className="text-center py-10 rounded-lg border border-[rgba(255,255,255,0.08)]"
              style={{ background: '#16161f' }}
            >
              <Search size={32} className="mx-auto mb-2 text-[rgba(255,255,255,0.08)]" />
              <p className="text-[#6a6a7a] text-sm">Nenhum resultado encontrado</p>
            </div>
          )}

          {searchResults && searchResults.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {searchResults.map((result) => (
                <SearchCard
                  key={result.filename}
                  result={result}
                  query={searchQuery}
                  onPreview={setPreviewFile}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {/* Lista de documentos */}
      {!isSearching && (
        <section>
          {docsLoading ? (
            <div className="flex items-center justify-center h-32 gap-3">
              <Loader2 size={22} className="animate-spin text-[#7c6aef]" />
              <span className="text-sm text-[#9898aa]">Carregando documentos...</span>
            </div>
          ) : docsError ? (
            <div className="flex flex-col gap-3 p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-sm">
              <div className="flex items-center gap-3 text-red-400">
                <AlertCircle size={18} />
                Erro ao carregar documentos: {docsError.message}
              </div>
              <button
                onClick={() => refetchDocs()}
                className="self-start text-xs text-[#7c6aef] hover:text-[#9080f5] transition-colors"
              >
                Tentar novamente
              </button>
            </div>
          ) : filteredDocs.length === 0 ? (
            <div
              className="text-center py-14 rounded-lg border border-[rgba(255,255,255,0.08)]"
              style={{ background: '#16161f' }}
            >
              <FileText size={38} className="mx-auto mb-3 text-[rgba(255,255,255,0.08)]" />
              <p className="text-[#6a6a7a] text-sm">
                {categoryFilter ? 'Nenhum documento nesta categoria' : 'Nenhum documento encontrado'}
              </p>
              {categoryFilter && (
                <button
                  onClick={() => setCategoryFilter('')}
                  className="mt-3 text-sm text-[#7c6aef] hover:text-[#9080f5] transition-colors"
                >
                  Limpar filtro
                </button>
              )}
            </div>
          ) : (
            <>
              <p className="text-xs text-[#6a6a7a] mb-3">
                {filteredDocs.length} documento{filteredDocs.length !== 1 ? 's' : ''}
                {categoryFilter && ` em "${categoryFilter}"`}
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredDocs.map((doc) => (
                  <DocCard
                    key={doc.filename}
                    doc={doc}
                    query=""
                    onPreview={setPreviewFile}
                    onDelete={(filename, name) => setDeleteTarget({ filename, name })}
                  />
                ))}
              </div>
            </>
          )}
        </section>
      )}

      {/* Modal Preview */}
      <Modal
        isOpen={!!previewFile}
        onClose={() => setPreviewFile(null)}
        title={
          previewFile
            ? documents.find((d) => d.filename === previewFile)?.name ?? previewFile
            : ''
        }
        size="xl"
      >
        {previewFile && <PreviewContent filename={previewFile} />}
      </Modal>

      {/* Modal Exclusão */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Remover Documento"
        size="sm"
      >
        <p className="text-[#9898aa] text-sm mb-1">
          Tem certeza que deseja remover:
        </p>
        <p className="text-[#f0f0f5] font-semibold text-sm mb-5">
          "{deleteTarget?.name}"
        </p>
        <p className="text-xs text-[#6a6a7a] mb-5">
          Esta ação removerá o documento da Knowledge Base permanentemente.
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
            Remover
          </button>
        </div>
      </Modal>
    </div>
  );
}
