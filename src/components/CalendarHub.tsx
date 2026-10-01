import React, { useState, useMemo } from 'react';
import { CalendarEvent, Habit, CompletionsMap } from '../types';
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  CheckCircle2, 
  Circle, 
  Clock, 
  Check, 
  CalendarCheck,
  LayoutList,
  Clock3
} from 'lucide-react';
import { CATEGORIES, getCategoryInfo } from '../utils/categories';

interface CalendarHubProps {
  events: CalendarEvent[];
  onAddEvent: (date?: string, time?: string) => void;
  onEditEvent: (event: CalendarEvent) => void;
  onToggleComplete: (id: string) => void;
  habits: Habit[];
  completions: CompletionsMap;
  selectedDate: string;
  onSelectDate: (date: string) => void;
}

const WEEKDAYS = ['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne'];
const MONTH_NAMES = [
  'Leden', 'Únor', 'Březen', 'Duben', 'Květen', 'Červen',
  'Červenec', 'Srpen', 'Září', 'Říjen', 'Listopad', 'Prosinec'
];

// Hours to display in daily timeline (06:00 to 23:00)
const TIMELINE_HOURS = Array.from({ length: 18 }, (_, i) => {
  const h = i + 6;
  return `${h.toString().padStart(2, '0')}:00`;
});

export const CalendarHub: React.FC<CalendarHubProps> = ({
  events,
  onAddEvent,
  onEditEvent,
  onToggleComplete,
  habits,
  completions,
  selectedDate,
  onSelectDate,
}) => {
  const selectedDateObj = useMemo(() => {
    const parts = selectedDate.split('-');
    if (parts.length === 3) {
      return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    }
    return new Date();
  }, [selectedDate]);

  const [viewYear, setViewYear] = useState(() => selectedDateObj.getFullYear());
  const [viewMonth, setViewMonth] = useState(() => selectedDateObj.getMonth()); // 0-indexed
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'timeline' | 'list'>('timeline');

  const todayStr = useMemo(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }, []);

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const handleJumpToToday = () => {
    const now = new Date();
    setViewYear(now.getFullYear());
    setViewMonth(now.getMonth());
    onSelectDate(todayStr);
  };

  // Build real-world month grid (Monday-Sunday layout)
  const monthGrid = useMemo(() => {
    const firstDayOfMonth = new Date(viewYear, viewMonth, 1);
    const lastDayOfMonth = new Date(viewYear, viewMonth + 1, 0);

    let startDayIndex = firstDayOfMonth.getDay() - 1;
    if (startDayIndex < 0) startDayIndex = 6;

    const totalDaysInMonth = lastDayOfMonth.getDate();
    const prevMonthLastDay = new Date(viewYear, viewMonth, 0).getDate();

    const days = [];

    // 1. Previous month padding days
    for (let i = startDayIndex - 1; i >= 0; i--) {
      const pDay = prevMonthLastDay - i;
      const pMonth = viewMonth === 0 ? 11 : viewMonth - 1;
      const pYear = viewMonth === 0 ? viewYear - 1 : viewYear;
      const dateStr = `${pYear}-${String(pMonth + 1).padStart(2, '0')}-${String(pDay).padStart(2, '0')}`;
      days.push({
        dateStr,
        dayNum: pDay,
        isCurrentMonth: false,
      });
    }

    // 2. Current month days
    for (let d = 1; d <= totalDaysInMonth; d++) {
      const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({
        dateStr,
        dayNum: d,
        isCurrentMonth: true,
      });
    }

    // 3. Next month padding days to fill grid
    const remainingDays = 7 - (days.length % 7);
    if (remainingDays < 7) {
      for (let n = 1; n <= remainingDays; n++) {
        const nMonth = viewMonth === 11 ? 0 : viewMonth + 1;
        const nYear = viewMonth === 11 ? viewYear + 1 : viewYear;
        const dateStr = `${nYear}-${String(nMonth + 1).padStart(2, '0')}-${String(n).padStart(2, '0')}`;
        days.push({
          dateStr,
          dayNum: n,
          isCurrentMonth: false,
        });
      }
    }

    return days;
  }, [viewYear, viewMonth]);

  // Index events by dates (supports multi-day range)
  const eventsByDate = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    events.forEach((evt) => {
      const start = evt.startDate;
      const end = evt.endDate || evt.startDate;

      const cur = new Date(start + 'T00:00:00');
      const stop = new Date(end + 'T00:00:00');

      while (cur <= stop) {
        const y = cur.getFullYear();
        const m = String(cur.getMonth() + 1).padStart(2, '0');
        const d = String(cur.getDate()).padStart(2, '0');
        const ds = `${y}-${m}-${d}`;
        if (!map[ds]) map[ds] = [];
        map[ds].push(evt);
        cur.setDate(cur.getDate() + 1);
      }
    });
    return map;
  }, [events]);

  // Events for selected date
  const selectedDayEvents = useMemo(() => {
    const list = eventsByDate[selectedDate] || [];
    if (filterCategory === 'all') return list;
    return list.filter((e) => {
      const cat = e.category === 'health' ? 'doctor' : e.category;
      return cat === filterCategory;
    });
  }, [eventsByDate, selectedDate, filterCategory]);

  // Separate all-day vs timed events for selected date
  const allDayEvents = useMemo(() => {
    return selectedDayEvents.filter((e) => !e.time);
  }, [selectedDayEvents]);

  const timedEvents = useMemo(() => {
    return selectedDayEvents.filter((e) => Boolean(e.time));
  }, [selectedDayEvents]);

  // Map timed events to hourly timeline slots
  const eventsByHour = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    TIMELINE_HOURS.forEach((h) => {
      map[h] = [];
    });

    timedEvents.forEach((evt) => {
      if (evt.time) {
        const hourPart = evt.time.split(':')[0];
        const slotKey = `${hourPart.padStart(2, '0')}:00`;
        if (map[slotKey]) {
          map[slotKey].push(evt);
        } else {
          // If outside 06:00-23:00, map to nearest or create
          map[slotKey] = [evt];
        }
      }
    });
    return map;
  }, [timedEvents]);

  // Habits scheduled for this day of week
  const scheduledHabitsForDay = useMemo(() => {
    const dow = selectedDateObj.getDay();
    return habits.filter((h) => h.days.includes(dow));
  }, [habits, selectedDateObj]);

  const formattedSelectedDate = useMemo(() => {
    return selectedDateObj.toLocaleDateString('cs-CZ', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
  }, [selectedDateObj]);

  const relativeDateLabel = useMemo(() => {
    if (selectedDate === todayStr) return 'Dnes';
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tmStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;
    if (selectedDate === tmStr) return 'Zítra';
    return selectedDateObj.toLocaleDateString('cs-CZ', { weekday: 'short' });
  }, [selectedDate, todayStr, selectedDateObj]);

  return (
    <div className="space-y-4 animate-fadeSlide">
      {/* Main Month Calendar Container */}
      <div className="p-4 sm:p-5 rounded-3xl theme-panel border theme-line shadow-xs">
        
        {/* Month & Year Navigation Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h2 className="text-base sm:text-lg font-serif font-bold theme-ink">
              {MONTH_NAMES[viewMonth]} {viewYear}
            </h2>

            {todayStr !== `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}` && (
              <button
                onClick={handleJumpToToday}
                className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#2F6F5E]/15 text-[#2F6F5E] dark:text-[#4FA98A] hover:bg-[#2F6F5E]/25 transition cursor-pointer"
              >
                Dnes
              </button>
            )}
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={handlePrevMonth}
              className="p-1.5 rounded-xl theme-panel2 hover:bg-black/5 dark:hover:bg-white/5 transition cursor-pointer theme-ink"
              aria-label="Předchozí měsíc"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleNextMonth}
              className="p-1.5 rounded-xl theme-panel2 hover:bg-black/5 dark:hover:bg-white/5 transition cursor-pointer theme-ink"
              aria-label="Další měsíc"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Weekday Labels (Po, Út, St, Čt, Pá, So, Ne) */}
        <div className="grid grid-cols-7 gap-1 text-center mb-2">
          {WEEKDAYS.map((wd, i) => (
            <div
              key={wd}
              className={`text-[10px] uppercase font-bold tracking-wider py-1 ${
                i >= 5 ? 'text-amber-600/80 dark:text-amber-400/80' : 'theme-muted'
              }`}
            >
              {wd}
            </div>
          ))}
        </div>

        {/* 7-column Monthly Grid with Real Dates & Modern Event Indicators */}
        <div className="grid grid-cols-7 gap-1">
          {monthGrid.map(({ dateStr, dayNum, isCurrentMonth }) => {
            const isSelected = dateStr === selectedDate;
            const isToday = dateStr === todayStr;
            const dayEvents = eventsByDate[dateStr] || [];

            // Daily habit completion check
            const dayHabitsDone = completions[dateStr] && Object.keys(completions[dateStr]).length > 0;

            return (
              <div
                key={dateStr}
                onClick={() => {
                  onSelectDate(dateStr);
                  if (!isCurrentMonth) {
                    const parts = dateStr.split('-');
                    setViewYear(parseInt(parts[0], 10));
                    setViewMonth(parseInt(parts[1], 10) - 1);
                  }
                }}
                className={`relative min-h-[46px] sm:min-h-[50px] p-1 rounded-2xl flex flex-col items-center justify-between cursor-pointer transition-all duration-150 active:scale-95 select-none ${
                  isSelected
                    ? 'theme-accent-bg text-white font-bold shadow-md'
                    : isToday
                    ? 'border-2 border-[#2F6F5E] dark:border-[#4FA98A] theme-panel2'
                    : isCurrentMonth
                    ? 'theme-panel2 hover:bg-black/5 dark:hover:bg-white/5 theme-ink'
                    : 'opacity-30 theme-muted'
                }`}
              >
                {/* Day Number */}
                <div
                  className={`text-xs font-semibold mt-0.5 ${
                    isSelected ? 'text-white' : isToday ? 'theme-accent font-bold' : ''
                  }`}
                >
                  {dayNum}
                </div>

                {/* Event Category Dots */}
                <div className="flex items-center justify-center gap-1 mb-1 h-2.5 flex-wrap max-w-full">
                  {dayEvents.slice(0, 3).map((evt) => {
                    const catInfo = getCategoryInfo(evt.category);
                    return (
                      <span
                        key={evt.id}
                        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                        style={{
                          backgroundColor: isSelected ? '#ffffff' : catInfo.color,
                        }}
                      />
                    );
                  })}
                  {dayEvents.length > 3 && (
                    <span className={`text-[8px] font-bold ${isSelected ? 'text-white' : 'theme-muted'}`}>
                      +{dayEvents.length - 3}
                    </span>
                  )}
                  {dayEvents.length === 0 && dayHabitsDone && !isSelected && (
                    <span
                      className="w-1 h-1 rounded-full bg-[#2F6F5E] dark:bg-[#4FA98A] opacity-50"
                      title="Návyky splněny"
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Day Agenda Header with View Switcher */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-serif font-bold text-base theme-ink capitalize">
              {relativeDateLabel}
            </h3>
            <span className="text-xs theme-muted">· {formattedSelectedDate}</span>
          </div>
          <p className="text-[11px] theme-muted">
            {selectedDayEvents.length} záznamů v kalendáři · {scheduledHabitsForDay.length} denních návyků
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* View toggle (Timeline vs List) */}
          <div className="flex items-center p-0.5 rounded-xl theme-panel2 border theme-line">
            <button
              onClick={() => setViewMode('timeline')}
              className={`p-1.5 rounded-lg transition cursor-pointer ${
                viewMode === 'timeline'
                  ? 'theme-accent-bg text-white shadow-xs'
                  : 'theme-muted hover:theme-ink'
              }`}
              title="Hodinový rozvrh"
            >
              <Clock3 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg transition cursor-pointer ${
                viewMode === 'list'
                  ? 'theme-accent-bg text-white shadow-xs'
                  : 'theme-muted hover:theme-ink'
              }`}
              title="Seznam událostí"
            >
              <LayoutList className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Add Plan Button */}
          <button
            onClick={() => onAddEvent(selectedDate)}
            className="px-3.5 py-1.5 rounded-xl theme-accent-bg text-white text-xs font-bold active:scale-95 transition shadow-sm flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Přidat</span>
          </button>
        </div>
      </div>

      {/* Category Filter Pills with Czech Labels and Modern Colors */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        <button
          onClick={() => setFilterCategory('all')}
          className={`px-3 py-1.5 rounded-full text-xs font-medium border flex-shrink-0 transition active:scale-95 cursor-pointer ${
            filterCategory === 'all'
              ? 'theme-accent-bg border-transparent text-white font-semibold shadow-xs'
              : 'theme-panel2 theme-muted hover:theme-ink border theme-line'
          }`}
        >
          Vše
        </button>
        {CATEGORIES.map((cat) => {
          const isSelected = filterCategory === cat.type;
          return (
            <button
              key={cat.type}
              onClick={() => setFilterCategory(cat.type)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border flex-shrink-0 transition active:scale-95 cursor-pointer flex items-center gap-1.5 ${
                isSelected
                  ? 'border-transparent text-white font-semibold shadow-xs'
                  : 'theme-panel2 theme-muted hover:theme-ink border theme-line'
              }`}
              style={{
                backgroundColor: isSelected ? cat.color : undefined,
              }}
            >
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{
                  backgroundColor: isSelected ? '#ffffff' : cat.color,
                }}
              />
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* All-Day Events Strip (Multi-day or untimed) */}
      {allDayEvents.length > 0 && (
        <div className="space-y-1.5">
          <div className="text-[11px] uppercase font-bold tracking-wider theme-muted">
            Celodenní
          </div>
          <div className="space-y-2">
            {allDayEvents.map((evt) => {
              const catInfo = getCategoryInfo(evt.category);
              const CatIcon = catInfo.icon;
              const isCompleted = evt.completed;

              return (
                <div
                  key={evt.id}
                  onClick={() => onEditEvent(evt)}
                  className={`p-3 rounded-2xl border flex items-center justify-between gap-3 transition cursor-pointer hover:border-[#2F6F5E]/50 active:scale-[0.99] shadow-xs ${
                    isCompleted
                      ? 'theme-panel opacity-60 border theme-line'
                      : 'theme-panel'
                  }`}
                  style={{
                    borderLeftWidth: '4px',
                    borderLeftColor: catInfo.color,
                  }}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleComplete(evt.id);
                      }}
                      className="flex-shrink-0 cursor-pointer p-0.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition"
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="w-4.5 h-4.5 text-emerald-500" />
                      ) : (
                        <Circle className="w-4.5 h-4.5 theme-muted" />
                      )}
                    </button>

                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: catInfo.bgLight, color: catInfo.color }}
                    >
                      <CatIcon className="w-3.5 h-3.5" />
                    </div>

                    <div className="min-w-0">
                      <div className={`text-xs font-bold truncate ${isCompleted ? 'line-through theme-muted' : 'theme-ink'}`}>
                        {evt.title}
                      </div>
                      {evt.endDate && evt.endDate !== evt.startDate && (
                        <div className="text-[10px] theme-muted">
                          {evt.startDate} → {evt.endDate}
                        </div>
                      )}
                    </div>
                  </div>

                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 text-white"
                    style={{ backgroundColor: catInfo.color }}
                  >
                    {catInfo.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW 1: HOURLY TIMELINE (24H / Whole Day Breakdown with Gaps / "Mezírky") */}
      {viewMode === 'timeline' && (
        <div className="p-3 sm:p-4 rounded-3xl theme-panel border theme-line shadow-xs space-y-1">
          <div className="flex items-center justify-between pb-2 mb-2 border-b theme-line text-xs">
            <span className="font-semibold theme-ink flex items-center gap-1.5">
              <Clock3 className="w-3.5 h-3.5 theme-accent" />
              <span>Hodinový rozvrh dne</span>
            </span>
            <span className="text-[11px] theme-muted">
              Kliknutím na volné místo naplánujete čas
            </span>
          </div>

          <div className="space-y-1">
            {TIMELINE_HOURS.map((hourStr) => {
              const hourEvents = eventsByHour[hourStr] || [];
              const hasEvents = hourEvents.length > 0;

              return (
                <div
                  key={hourStr}
                  className="flex items-start gap-2.5 py-1.5 group transition rounded-xl px-1 hover:bg-black/[0.02] dark:hover:bg-white/[0.02]"
                >
                  {/* Hour timestamp indicator */}
                  <div className="w-12 text-right text-[11px] font-mono font-semibold theme-muted flex-shrink-0 pt-1">
                    {hourStr}
                  </div>

                  {/* Hourly content / Event card or free slot */}
                  <div className="flex-1 min-w-0">
                    {hasEvents ? (
                      <div className="space-y-1.5">
                        {hourEvents.map((evt) => {
                          const catInfo = getCategoryInfo(evt.category);
                          const CatIcon = catInfo.icon;
                          const isCompleted = evt.completed;

                          return (
                            <div
                              key={evt.id}
                              onClick={() => onEditEvent(evt)}
                              className={`p-2.5 rounded-xl border flex items-center justify-between gap-2.5 cursor-pointer transition active:scale-[0.99] shadow-xs ${
                                isCompleted
                                  ? 'theme-panel2 opacity-60 border theme-line'
                                  : 'theme-panel2'
                              }`}
                              style={{
                                borderLeftWidth: '3.5px',
                                borderLeftColor: catInfo.color,
                              }}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onToggleComplete(evt.id);
                                  }}
                                  className="flex-shrink-0 cursor-pointer p-0.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition"
                                >
                                  {isCompleted ? (
                                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                  ) : (
                                    <Circle className="w-4 h-4 theme-muted" />
                                  )}
                                </button>

                                <div
                                  className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0"
                                  style={{ backgroundColor: catInfo.bgLight, color: catInfo.color }}
                                >
                                  <CatIcon className="w-3.5 h-3.5" />
                                </div>

                                <div className="min-w-0">
                                  <div className={`text-xs font-bold truncate ${isCompleted ? 'line-through theme-muted' : 'theme-ink'}`}>
                                    {evt.title}
                                  </div>
                                  <div className="text-[10px] theme-muted flex items-center gap-1.5">
                                    <span className="font-mono font-semibold">
                                      {evt.time}{evt.endTime ? ` - ${evt.endTime}` : ''}
                                    </span>
                                    {evt.notes && (
                                      <span className="truncate max-w-[140px] opacity-75">
                                        · {evt.notes}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <span
                                className="text-[9.5px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 text-white"
                                style={{ backgroundColor: catInfo.color }}
                              >
                                {catInfo.label}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      /* Free slot / Empty gap ("Mezírka") */
                      <div
                        onClick={() => onAddEvent(selectedDate, hourStr)}
                        className="h-8 border border-dashed border-black/10 dark:border-white/10 rounded-xl px-2.5 flex items-center justify-between text-[11px] theme-muted opacity-40 hover:opacity-100 hover:border-[#2F6F5E]/40 hover:bg-[#2F6F5E]/5 transition cursor-pointer group"
                      >
                        <span className="text-[10.5px]">Volno</span>
                        <span className="text-[10px] font-semibold flex items-center gap-1 opacity-0 group-hover:opacity-100 text-[#2F6F5E] dark:text-[#4FA98A] transition">
                          <Plus className="w-3 h-3" />
                          <span>Naplánovat</span>
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW 2: COMPACT LIST VIEW */}
      {viewMode === 'list' && (
        <div className="space-y-2">
          {selectedDayEvents.length === 0 ? (
            <div className="text-center py-8 px-4 rounded-2xl theme-panel border theme-line space-y-2">
              <div className="flex justify-center opacity-60">
                <CalendarCheck className="w-8 h-8 theme-accent" />
              </div>
              <p className="text-xs font-medium theme-ink">
                Žádné plány pro toto datum.
              </p>
              <button
                onClick={() => onAddEvent(selectedDate)}
                className="text-xs font-semibold theme-accent hover:underline cursor-pointer"
              >
                + Naplánovat aktivitu
              </button>
            </div>
          ) : (
            selectedDayEvents.map((evt) => {
              const catInfo = getCategoryInfo(evt.category);
              const CatIcon = catInfo.icon;
              const isCompleted = evt.completed;

              return (
                <div
                  key={evt.id}
                  onClick={() => onEditEvent(evt)}
                  className={`p-3.5 rounded-2xl border theme-line theme-panel flex items-start gap-3 transition-all cursor-pointer hover:border-[#2F6F5E]/50 active:scale-[0.99] shadow-xs ${
                    isCompleted ? 'opacity-65' : ''
                  }`}
                  style={{
                    borderLeftWidth: '4px',
                    borderLeftColor: catInfo.color,
                  }}
                >
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleComplete(evt.id);
                    }}
                    className="mt-0.5 flex-shrink-0 cursor-pointer p-0.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition"
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    ) : (
                      <Circle className="w-5 h-5 theme-muted" />
                    )}
                  </button>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: catInfo.bgLight, color: catInfo.color }}
                      >
                        <CatIcon className="w-3.5 h-3.5" />
                      </div>
                      <span
                        className={`text-sm font-bold truncate ${
                          isCompleted ? 'line-through theme-muted' : 'theme-ink'
                        }`}
                      >
                        {evt.title}
                      </span>
                      <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white flex-shrink-0 ml-auto"
                        style={{ backgroundColor: catInfo.color }}
                      >
                        {catInfo.label}
                      </span>
                    </div>

                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs theme-muted">
                      {evt.time && (
                        <span className="flex items-center gap-1 font-medium font-mono">
                          <Clock className="w-3 h-3" />
                          {evt.time}{evt.endTime ? ` - ${evt.endTime}` : ''}
                        </span>
                      )}

                      {evt.notes && (
                        <span className="truncate max-w-[260px] text-[11px] opacity-80">
                          {evt.notes}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Daily Habits for this Day of Week */}
      {scheduledHabitsForDay.length > 0 && (
        <div className="pt-2">
          <div className="text-xs theme-muted mb-2 flex items-center gap-2 font-semibold">
            <span>Denní návyky na tento den</span>
            <div className="flex-1 h-px theme-line-bg" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {scheduledHabitsForDay.map((h) => {
              const count = completions[selectedDate]?.[h.id] || 0;
              const isDone = count >= h.timesPerDay;

              return (
                <div
                  key={h.id}
                  className={`p-2.5 rounded-xl border theme-line flex items-center justify-between gap-2 text-xs ${
                    isDone
                      ? 'theme-panel border-[#4FA98A]/40 bg-[#4FA98A]/5'
                      : 'theme-panel2'
                  }`}
                >
                  <span className={`truncate font-medium ${isDone ? 'theme-ink font-semibold' : 'theme-muted'}`}>
                    {h.name}
                  </span>
                  {isDone && <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
