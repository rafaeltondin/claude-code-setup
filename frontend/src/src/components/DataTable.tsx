// Tabela reutilizável com sorting, paginação e busca — Premium Design System
import { useState, useMemo, useEffect } from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown, Search, ChevronLeft, ChevronRight, Inbox } from 'lucide-react';
import { useDebouncedValue } from '../hooks/useDebouncedValue';


export interface Column<T> {
  key: string;
  header: string;
  accessor: (row: T) => React.ReactNode;
  sortable?: boolean;
  width?: string;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  keyExtractor: (row: T) => string;
  searchPlaceholder?: string;
  searchFilter?: (row: T, query: string) => boolean;
  pageSize?: number;
  pageSizeOptions?: number[];
  isLoading?: boolean;
  emptyMessage?: string;
  actions?: (row: T) => React.ReactNode;
}

type SortDir = 'asc' | 'desc' | null;

const SKELETON_WIDTHS = ['w-3/4', 'w-1/2', 'w-2/3', 'w-4/5', 'w-3/5'];

export function DataTable<T>({
  data,
  columns,
  keyExtractor,
  searchPlaceholder = 'Buscar...',
  searchFilter,
  pageSize: initialPageSize = 15,
  pageSizeOptions = [10, 25, 50, 100],
  isLoading = false,
  emptyMessage = 'Nenhum registro encontrado',
  actions,
}: DataTableProps<T>) {
  const [query, setQuery] = useState('');
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);

  const debouncedQuery = useDebouncedValue(query, 300);

  useEffect(() => {
    setPage(1);
  }, [debouncedQuery]);

  const filtered = useMemo(() => {
    if (!debouncedQuery || !searchFilter) return data;
    return data.filter((row) => searchFilter(row, debouncedQuery.toLowerCase()));
  }, [data, debouncedQuery, searchFilter]);

  const sorted = useMemo(() => {
    if (!sortKey || !sortDir) return filtered;
    const col = columns.find((c) => c.key === sortKey);
    if (!col) return filtered;

    return [...filtered].sort((a, b) => {
      const av = col.accessor(a);
      const bv = col.accessor(b);
      const as = String(av ?? '').toLowerCase();
      const bs = String(bv ?? '').toLowerCase();
      return sortDir === 'asc' ? as.localeCompare(bs) : bs.localeCompare(as);
    });
  }, [filtered, sortKey, sortDir, columns]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const paginated = sorted.slice((page - 1) * pageSize, page * pageSize);

  function handleSort(key: string) {
    if (sortKey !== key) {
      setSortKey(key);
      setSortDir('asc');
      console.log('[DataTable] Ordenando por', { key, dir: 'asc' });
    } else if (sortDir === 'asc') {
      setSortDir('desc');
    } else {
      setSortKey(null);
      setSortDir(null);
    }
    setPage(1);
  }

  function SortIcon({ colKey }: { colKey: string }) {
    if (sortKey !== colKey) return <ChevronsUpDown size={13} className="text-[#6a6a7a]" />;
    if (sortDir === 'asc') return <ChevronUp size={13} className="text-[#7c6aef]" />;
    return <ChevronDown size={13} className="text-[#7c6aef]" />;
  }

  const colCount = columns.length + (actions ? 1 : 0);

  return (
    <div className="flex flex-col gap-4">
      {/* Barra de busca */}
      {searchFilter && (
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6a6a7a]" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full max-w-sm pl-9 pr-4 text-sm text-[#f0f0f5] placeholder-[#6a6a7a] focus:outline-none transition-all duration-200"
            style={{
              height: '40px',
              background: '#16161f',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '6px',
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = 'rgba(124,106,239,0.4)';
              e.currentTarget.style.boxShadow = '0 0 0 3px rgba(124,106,239,0.08)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          />
        </div>
      )}

      {/* Tabela */}
      <div
        className="overflow-x-auto rounded-lg"
        style={{
          border: '1px solid rgba(255,255,255,0.08)',
          background: '#16161f',
        }}
      >
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-4 py-3 text-left text-xs font-medium text-[#6a6a7a] ${col.width ?? ''} ${col.sortable ? 'cursor-pointer select-none hover:text-[#9898aa] transition-colors' : ''}`}
                  onClick={col.sortable ? () => handleSort(col.key) : undefined}
                >
                  <span className="inline-flex items-center gap-1.5">
                    {col.header}
                    {col.sortable && <SortIcon colKey={col.key} />}
                  </span>
                </th>
              ))}
              {actions && (
                <th className="px-4 py-3 text-right text-xs font-medium text-[#6a6a7a]">
                  Ações
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr
                  key={i}
                  style={{ borderBottom: i < 4 ? '1px solid rgba(255,255,255,0.04)' : undefined }}
                >
                  {columns.map((col, ci) => (
                    <td key={col.key} className="px-4 py-3.5">
                      <div
                        className={`h-3 rounded-md animate-pulse ${SKELETON_WIDTHS[(i + ci) % SKELETON_WIDTHS.length]}`}
                        style={{
                          background: 'rgba(255,255,255,0.04)',
                          animationDelay: `${(i * 100) + (ci * 50)}ms`,
                        }}
                      />
                    </td>
                  ))}
                  {actions && (
                    <td className="px-4 py-3.5">
                      <div
                        className="h-3 rounded-md animate-pulse w-12 ml-auto"
                        style={{
                          background: 'rgba(255,255,255,0.04)',
                          animationDelay: `${i * 100 + 200}ms`,
                        }}
                      />
                    </td>
                  )}
                </tr>
              ))
            ) : paginated.length === 0 ? (
              <tr>
                <td colSpan={colCount} className="px-4 py-16 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <Inbox size={36} className="text-[rgba(255,255,255,0.08)]" />
                    <p className="text-sm text-[#6a6a7a]">{emptyMessage}</p>
                  </div>
                </td>
              </tr>
            ) : (
              paginated.map((row, idx) => (
                <tr
                  key={keyExtractor(row)}
                  className="transition-colors hover:bg-[rgba(255,255,255,0.02)]"
                  style={{
                    borderBottom: idx < paginated.length - 1 ? '1px solid rgba(255,255,255,0.04)' : undefined,
                  }}
                >
                  {columns.map((col) => (
                    <td key={col.key} className="px-4 py-3 text-[#f0f0f5]">
                      {col.accessor(row)}
                    </td>
                  ))}
                  {actions && (
                    <td className="px-4 py-3 text-right">
                      {actions(row)}
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Paginação */}
      {(totalPages > 1 || sorted.length > pageSizeOptions[0]) && (
        <div className="flex items-center justify-between text-xs text-[#6a6a7a] pt-1 flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <span>
              {sorted.length} resultado{sorted.length !== 1 ? 's' : ''}
              <span className="mx-1.5 text-[rgba(255,255,255,0.1)]">|</span>
              Página {page} de {totalPages}
            </span>
            <div className="flex items-center gap-1.5">
              <span className="text-[#6a6a7a]">Exibir</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                className="px-2 py-1 bg-[#16161f] border border-[rgba(255,255,255,0.08)] rounded text-xs text-[#f0f0f5] focus:outline-none focus:border-[#7c6aef]/60 cursor-pointer"
              >
                {pageSizeOptions.map((size) => (
                  <option key={size} value={size}>{size}</option>
                ))}
              </select>
              <span className="text-[#6a6a7a]">por página</span>
            </div>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center gap-0.5">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-lg hover:bg-[rgba(255,255,255,0.04)] disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                aria-label="Página anterior"
              >
                <ChevronLeft size={15} />
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const num = Math.max(1, Math.min(page - 2, totalPages - 4)) + i;
                return (
                  <button
                    key={num}
                    onClick={() => setPage(num)}
                    className={`w-7 h-7 rounded-lg text-xs font-medium transition-all duration-200 ${
                      num === page
                        ? 'bg-[#7c6aef] text-white shadow-[0_0_8px_rgba(124,106,239,0.3)]'
                        : 'text-[#9898aa] hover:bg-[rgba(255,255,255,0.04)] hover:text-[#f0f0f5]'
                    }`}
                  >
                    {num}
                  </button>
                );
              })}
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1.5 rounded-lg hover:bg-[rgba(255,255,255,0.04)] disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                aria-label="Próxima página"
              >
                <ChevronRight size={15} />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
