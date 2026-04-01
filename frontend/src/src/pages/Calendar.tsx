// Página Calendário — Integração Google Calendar
import { useState, useMemo, useCallback } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Loader2,
  CalendarDays,
  AlertCircle,
  Trash2,
  X,
  CalendarCheck,
} from 'lucide-react';
import {
  useCalendarEvents,
  useCreateCalendarEvent,
  useDeleteCalendarEvent,
  type CalendarEvent,
} from '../api/new-hooks';
import { Modal } from '../components/Modal';
import { useToast } from '../contexts/ToastContext';
import { PageHeader, ActionButton, SectionLabel } from '../components/PageHeader';

// ─── UTILITÁRIOS ──────────────────────────────────────────────────────────────

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

const WEEK_DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

function isoToDate(iso: string): Date {
  // Preservar data local (evitar UTC shift)
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  return new Date(iso);
}

function formatTime(iso: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return '';
  return new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number): number {
  return new Date(year, month - 1, 1).getDay();
}

function toDateKey(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

// ─── MODAL CRIAR EVENTO ────────────────────────────────────────────────────────

interface CreateEventModalProps {
  isOpen:       boolean;
  onClose:      () => void;
  defaultDate?: string;
}

function CreateEventModal({ isOpen, onClose, defaultDate }: CreateEventModalProps) {
  const { showToast }    = useToast();
  const createEvent      = useCreateCalendarEvent();

  const [title,       setTitle]       = useState('');
  const [description, setDescription] = useState('');
  const [date,        setDate]        = useState(defaultDate ?? new Date().toISOString().split('T')[0]);
  const [startTime,   setStartTime]   = useState('09:00');
  const [endTime,     setEndTime]     = useState('10:00');
  const [isAllDay,    setIsAllDay]    = useState(false);

  const handleClose = useCallback(() => {
    setTitle(''); setDescription(''); setStartTime('09:00'); setEndTime('10:00'); setIsAllDay(false);
    onClose();
  }, [onClose]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) { showToast('Título é obrigatório.', 'error'); return; }

    let start: string;
    let end: string;

    if (isAllDay) {
      start = date;
      end   = date;
    } else {
      start = `${date}T${startTime}:00`;
      end   = `${date}T${endTime}:00`;
      if (end <= start) { showToast('Horário de término deve ser após o início.', 'error'); return; }
    }

    try {
      await createEvent.mutateAsync({ title: title.trim(), start, end, description: description.trim() || undefined, isAllDay });
      showToast('Evento criado no Google Calendar!', 'success');
      handleClose();
    } catch {
      showToast('Erro ao criar evento. Verifique as credenciais do Google Calendar.', 'error');
    }
  }, [title, description, date, startTime, endTime, isAllDay, createEvent, showToast, handleClose]);

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Novo Evento no Google Calendar" size="lg">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">

        {/* Título */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-[#f0f0f5]">
            Título <span className="text-[#ef4444]">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex: Reunião com cliente"
            className="w-full px-3 py-2.5 rounded-md text-sm text-[#f0f0f5] placeholder-[#6a6a7a] outline-none"
            style={{ background: '#0a0a0f', border: '1px solid rgba(255,255,255,0.08)' }}
            onFocus={(e) => (e.currentTarget.style.borderColor = '#7c6aef')}
            onBlur={(e)  => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)')}
            autoFocus
          />
        </div>

        {/* Data + Dia inteiro */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[#f0f0f5]">Data</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2.5 rounded-md text-sm text-[#f0f0f5] outline-none"
              style={{ background: '#0a0a0f', border: '1px solid rgba(255,255,255,0.08)', colorScheme: 'dark' }}
              onFocus={(e) => (e.currentTarget.style.borderColor = '#7c6aef')}
              onBlur={(e)  => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)')}
            />
          </div>
          <div className="flex flex-col gap-1.5 justify-end">
            <label className="flex items-center gap-2 cursor-pointer pb-1">
              <button
                type="button"
                onClick={() => setIsAllDay(!isAllDay)}
                className="w-10 h-5 rounded-full relative transition-colors shrink-0"
                style={{ background: isAllDay ? '#7c6aef' : 'rgba(255,255,255,0.12)' }}
              >
                <div
                  className="w-4 h-4 rounded-full bg-white absolute top-0.5 transition-transform"
                  style={{ transform: isAllDay ? 'translateX(22px)' : 'translateX(2px)' }}
                />
              </button>
              <span className="text-sm text-[#9898aa]">Dia inteiro</span>
            </label>
          </div>
        </div>

        {/* Horário */}
        {!isAllDay && (
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-[#f0f0f5]">Início</label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3 py-2.5 rounded-md text-sm text-[#f0f0f5] outline-none"
                style={{ background: '#0a0a0f', border: '1px solid rgba(255,255,255,0.08)', colorScheme: 'dark' }}
                onFocus={(e) => (e.currentTarget.style.borderColor = '#7c6aef')}
                onBlur={(e)  => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)')}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-[#f0f0f5]">Término</label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-3 py-2.5 rounded-md text-sm text-[#f0f0f5] outline-none"
                style={{ background: '#0a0a0f', border: '1px solid rgba(255,255,255,0.08)', colorScheme: 'dark' }}
                onFocus={(e) => (e.currentTarget.style.borderColor = '#7c6aef')}
                onBlur={(e)  => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)')}
              />
            </div>
          </div>
        )}

        {/* Descrição */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-[#f0f0f5]">Descrição</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Detalhes opcionais..."
            rows={3}
            className="w-full px-3 py-2.5 rounded-md text-sm text-[#f0f0f5] placeholder-[#6a6a7a] outline-none resize-y"
            style={{ background: '#0a0a0f', border: '1px solid rgba(255,255,255,0.08)' }}
            onFocus={(e) => (e.currentTarget.style.borderColor = '#7c6aef')}
            onBlur={(e)  => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)')}
          />
        </div>

        {/* Ações */}
        <div className="flex justify-end gap-3 pt-2 border-t border-[rgba(255,255,255,0.08)]">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 rounded-md text-sm text-[#9898aa] hover:text-[#f0f0f5] hover:bg-[rgba(255,255,255,0.06)] transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={createEvent.isPending}
            className="px-5 py-2 rounded-md text-sm font-medium text-white flex items-center gap-2 transition-opacity disabled:opacity-60"
            style={{ background: '#2563EB' }}
          >
            {createEvent.isPending ? <Loader2 size={14} className="animate-spin" /> : <CalendarCheck size={14} />}
            Criar no Google Calendar
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ─── POPOVER DE EVENTOS DO DIA ─────────────────────────────────────────────────

interface DayEventsPopoverProps {
  events:    CalendarEvent[];
  date:      string;
  onClose:   () => void;
  onDelete:  (id: string) => void;
  onNew:     () => void;
}

function DayEventsPopover({ events, date, onClose, onDelete, onNew }: DayEventsPopoverProps) {
  const [y, m, d] = date.split('-').map(Number);
  const label = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })
    .format(new Date(y, m - 1, d));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="rounded-xl border border-[rgba(255,255,255,0.12)] p-5 flex flex-col gap-4 w-full max-w-sm shadow-2xl"
        style={{ background: '#1a1a2e' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho */}
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-[#f0f0f5] capitalize">{label}</p>
          <div className="flex items-center gap-2">
            <button
              onClick={onNew}
              className="flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium text-white"
              style={{ background: '#2563EB' }}
            >
              <Plus size={12} /> Novo
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-md text-[#6a6a7a] hover:text-[#f0f0f5] hover:bg-[rgba(255,255,255,0.06)] transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Lista de eventos */}
        {events.length === 0 ? (
          <p className="text-sm text-[#6a6a7a] text-center py-4">Nenhum evento neste dia</p>
        ) : (
          <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto">
            {events.map((ev) => (
              <div
                key={ev.id}
                className="flex items-start justify-between gap-3 p-3 rounded-lg border border-[rgba(255,255,255,0.08)]"
                style={{ background: '#16161f' }}
              >
                <div className="flex flex-col gap-1 min-w-0">
                  <p className="text-sm font-medium text-[#f0f0f5] truncate">{ev.title}</p>
                  {!ev.isAllDay && (
                    <p className="text-xs text-[#9898aa]">
                      {formatTime(ev.start)} – {formatTime(ev.end)}
                    </p>
                  )}
                  {ev.isAllDay && (
                    <p className="text-xs text-[#9898aa]">Dia inteiro</p>
                  )}
                  {ev.description && (
                    <p className="text-xs text-[#6a6a7a] truncate">{ev.description}</p>
                  )}
                </div>
                <button
                  onClick={() => onDelete(ev.id)}
                  className="p-1.5 rounded-md text-[#6a6a7a] hover:text-[#ef4444] hover:bg-[#ef444420] transition-colors shrink-0"
                  title="Remover evento"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── GRADE DO CALENDÁRIO ───────────────────────────────────────────────────────

interface CalendarGridProps {
  year:     number;
  month:    number;
  events:   CalendarEvent[];
  onDayClick: (dateKey: string, events: CalendarEvent[]) => void;
}

function CalendarGrid({ year, month, events, onDayClick }: CalendarGridProps) {
  const today    = toDateKey(new Date().getFullYear(), new Date().getMonth() + 1, new Date().getDate());
  const days     = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfWeek(year, month);

  // Mapear eventos por data (usando data local para evitar UTC shift)
  const eventsByDay = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    for (const ev of events) {
      const d = isoToDate(ev.start);
      const dateStr = toDateKey(d.getFullYear(), d.getMonth() + 1, d.getDate());
      if (!map[dateStr]) map[dateStr] = [];
      map[dateStr].push(ev);
    }
    return map;
  }, [events]);

  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: days }, (_, i) => i + 1),
  ];

  // Completar última linha
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div className="rounded-lg border border-[rgba(255,255,255,0.08)] overflow-hidden" style={{ background: '#16161f' }}>
      {/* Cabeçalho dias da semana */}
      <div className="grid grid-cols-7 border-b border-[rgba(255,255,255,0.08)]">
        {WEEK_DAYS.map((d) => (
          <div key={d} className="py-3 text-center text-xs font-semibold uppercase tracking-wide text-[#6a6a7a]">
            {d}
          </div>
        ))}
      </div>

      {/* Células */}
      <div className="grid grid-cols-7">
        {cells.map((day, idx) => {
          if (day === null) {
            return (
              <div
                key={`empty-${idx}`}
                className="h-24 border-b border-r border-[rgba(255,255,255,0.04)]"
                style={{ opacity: 0.3 }}
              />
            );
          }

          const dateKey     = toDateKey(year, month, day);
          const isToday     = dateKey === today;
          const dayEvents   = eventsByDay[dateKey] ?? [];
          const hasEvents   = dayEvents.length > 0;

          return (
            <div
              key={dateKey}
              onClick={() => onDayClick(dateKey, dayEvents)}
              className="h-24 border-b border-r border-[rgba(255,255,255,0.04)] p-2 flex flex-col gap-1 cursor-pointer transition-colors hover:bg-[rgba(255,255,255,0.04)]"
            >
              {/* Número do dia */}
              <span
                className="text-sm font-semibold w-7 h-7 flex items-center justify-center rounded-full shrink-0 transition-colors"
                style={{
                  background:  isToday ? '#2563EB' : 'transparent',
                  color:       isToday ? '#fff' : hasEvents ? '#f0f0f5' : '#6a6a7a',
                }}
              >
                {day}
              </span>

              {/* Eventos do dia (até 2 visíveis) */}
              {dayEvents.slice(0, 2).map((ev) => (
                <div
                  key={ev.id}
                  className="text-[10px] font-medium px-1.5 py-0.5 rounded truncate"
                  style={{ background: '#2563EB30', color: '#00D4FF' }}
                >
                  {!ev.isAllDay && formatTime(ev.start) ? `${formatTime(ev.start)} ` : ''}
                  {ev.title}
                </div>
              ))}
              {dayEvents.length > 2 && (
                <span className="text-[10px] text-[#9898aa] px-1">+{dayEvents.length - 2}</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── COMPONENTE PRINCIPAL ──────────────────────────────────────────────────────

export function CalendarPage() {
  const { showToast } = useToast();
  const now = new Date();

  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year,  setYear]  = useState(now.getFullYear());

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createDefaultDate, setCreateDefaultDate] = useState<string | undefined>();

  const [selectedDay,    setSelectedDay]    = useState<string | null>(null);
  const [selectedEvents, setSelectedEvents] = useState<CalendarEvent[]>([]);

  const { data: events = [], isLoading, isError, refetch } = useCalendarEvents(month, year);
  const deleteEvent = useDeleteCalendarEvent();

  const navigate = useCallback((dir: -1 | 1) => {
    setMonth((m) => {
      const next = m + dir;
      if (next < 1) { setYear((y) => y - 1); return 12; }
      if (next > 12) { setYear((y) => y + 1); return 1; }
      return next;
    });
  }, []);

  const handleDayClick = useCallback((dateKey: string, dayEvents: CalendarEvent[]) => {
    setSelectedDay(dateKey);
    setSelectedEvents(dayEvents);
  }, []);

  const handleDelete = useCallback(async (eventId: string) => {
    if (!window.confirm('Remover este evento do Google Calendar?')) return;
    try {
      await deleteEvent.mutateAsync(eventId);
      showToast('Evento removido.', 'success');
      setSelectedEvents((prev) => prev.filter((e) => e.id !== eventId));
      if (selectedEvents.length <= 1) setSelectedDay(null);
    } catch {
      showToast('Erro ao remover evento.', 'error');
    }
  }, [deleteEvent, showToast, selectedEvents]);

  const handleNewFromDay = useCallback(() => {
    setCreateDefaultDate(selectedDay ?? undefined);
    setSelectedDay(null);
    setShowCreateModal(true);
  }, [selectedDay]);

  return (
    <div className="flex flex-col" style={{ gap: 'var(--space-xl)' }}>

      {/* Header */}
      <PageHeader
        title="Calendário"
        description="Visualize e gerencie seus eventos do Google Calendar."
        action={
          <ActionButton
            onClick={() => { setCreateDefaultDate(undefined); setShowCreateModal(true); }}
            icon={<Plus size={16} />}
          >
            Novo Evento
          </ActionButton>
        }
      />

      {/* Navegação de mês */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-md text-[#9898aa] hover:text-[#f0f0f5] hover:bg-[rgba(255,255,255,0.06)] transition-colors"
          >
            <ChevronLeft size={18} />
          </button>
          <h2 className="text-lg font-semibold text-[#f0f0f5] min-w-[180px] text-center">
            {MONTHS[month - 1]} {year}
          </h2>
          <button
            onClick={() => navigate(1)}
            className="p-2 rounded-md text-[#9898aa] hover:text-[#f0f0f5] hover:bg-[rgba(255,255,255,0.06)] transition-colors"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => { setMonth(now.getMonth() + 1); setYear(now.getFullYear()); }}
            className="px-3 py-1.5 rounded-md text-xs font-medium text-[#9898aa] hover:text-[#f0f0f5] hover:bg-[rgba(255,255,255,0.06)] transition-colors border border-[rgba(255,255,255,0.08)]"
          >
            Hoje
          </button>
          <button
            onClick={() => refetch()}
            className="px-3 py-1.5 rounded-md text-xs font-medium text-[#9898aa] hover:text-[#f0f0f5] hover:bg-[rgba(255,255,255,0.06)] transition-colors border border-[rgba(255,255,255,0.08)]"
          >
            Atualizar
          </button>
        </div>
      </div>

      {/* Estado de carregamento / erro */}
      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <div className="flex flex-col items-center gap-3">
            <Loader2 size={28} className="animate-spin" style={{ color: '#2563EB' }} />
            <p className="text-sm text-[#9898aa]">Carregando eventos do Google Calendar...</p>
          </div>
        </div>
      )}

      {isError && (
        <div
          className="rounded-lg border border-[#ef444440] p-5 flex items-start gap-3"
          style={{ background: '#ef444410' }}
        >
          <AlertCircle size={18} style={{ color: '#ef4444' }} className="shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-[#ef4444]">Erro ao conectar com Google Calendar</p>
            <p className="text-xs text-[#9898aa] mt-1">
              Verifique se as credenciais Google estão configuradas nas variáveis de ambiente do servidor:
              GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN.
            </p>
          </div>
        </div>
      )}

      {/* Grade do calendário */}
      {!isLoading && !isError && (
        <>
          <CalendarGrid
            year={year}
            month={month}
            events={events}
            onDayClick={handleDayClick}
          />

          {/* Resumo do mês */}
          <section className="flex flex-col">
            <SectionLabel>Eventos de {MONTHS[month - 1]}</SectionLabel>
            {events.length === 0 ? (
              <div
                className="rounded-lg border border-dashed border-[rgba(255,255,255,0.08)] p-8 flex flex-col items-center gap-3"
              >
                <CalendarDays size={24} style={{ color: '#6a6a7a' }} />
                <p className="text-sm text-[#6a6a7a]">Nenhum evento este mês</p>
                <button
                  onClick={() => { setCreateDefaultDate(undefined); setShowCreateModal(true); }}
                  className="flex items-center gap-2 px-4 py-2 rounded-md text-sm text-white hover:opacity-90 transition-opacity"
                  style={{ background: '#2563EB' }}
                >
                  <Plus size={14} /> Criar Evento
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
                      {['Evento', 'Data', 'Horário', ''].map((h) => (
                        <th
                          key={h}
                          className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-[#6a6a7a]"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {events.map((ev) => {
                      const startDate = isoToDate(ev.start);
                      const dateLabel = new Intl.DateTimeFormat('pt-BR', {
                        day: '2-digit', month: '2-digit', year: 'numeric',
                      }).format(startDate);

                      return (
                        <tr
                          key={ev.id}
                          className="group hover:bg-[rgba(255,255,255,0.03)] transition-colors"
                          style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                        >
                          <td className="px-4 py-3">
                            <p className="text-[#f0f0f5] font-medium">{ev.title}</p>
                            {ev.description && (
                              <p className="text-xs text-[#6a6a7a] mt-0.5 truncate max-w-[260px]">{ev.description}</p>
                            )}
                          </td>
                          <td className="px-4 py-3 text-[#9898aa] text-xs whitespace-nowrap">
                            {dateLabel}
                          </td>
                          <td className="px-4 py-3 text-[#9898aa] text-xs whitespace-nowrap">
                            {ev.isAllDay ? (
                              <span className="px-2 py-0.5 rounded text-xs" style={{ background: '#2563EB20', color: '#2563EB' }}>
                                Dia inteiro
                              </span>
                            ) : (
                              `${formatTime(ev.start)} – ${formatTime(ev.end)}`
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => handleDelete(ev.id)}
                              className="p-1.5 rounded-md text-[#6a6a7a] hover:text-[#ef4444] hover:bg-[#ef444420] transition-colors opacity-0 group-hover:opacity-100"
                              title="Remover evento"
                            >
                              <Trash2 size={13} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}

      {/* Modal criar evento */}
      <CreateEventModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        defaultDate={createDefaultDate}
      />

      {/* Popover de eventos do dia */}
      {selectedDay && (
        <DayEventsPopover
          events={selectedEvents}
          date={selectedDay}
          onClose={() => setSelectedDay(null)}
          onDelete={handleDelete}
          onNew={handleNewFromDay}
        />
      )}
    </div>
  );
}
