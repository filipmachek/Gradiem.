import React, { useState } from 'react';
import { Habit } from '../types';
import { X, Trash2, Check, Clock } from 'lucide-react';
import { AppleEmoji } from './AppleEmoji';

interface TaskModalProps {
  initialHabit?: Habit | null;
  onSave: (habit: Habit) => void;
  onDelete?: (id: string) => void;
  onClose: () => void;
}

const ICONS = ["🌿", "📖", "🧘", "💧", "🏃", "✍️", "🎯", "🎨", "🎸", "🧠", "🥗", "💼", "🧹", "☀️", "🦷", "🚴", "⚡", "🍵"];
const COLORS = ["#4FA98A", "#D9A05B", "#D97C6C", "#5A6FB0", "#8B5FAE", "#3E8E8E", "#6A7A3E"];
const CATEGORIES = ["Health", "Study", "Mind", "Personal", "Chores", "Custom"];
const WEEKDAYS = [
  { label: "Mo", day: 1 },
  { label: "Tu", day: 2 },
  { label: "We", day: 3 },
  { label: "Th", day: 4 },
  { label: "Fr", day: 5 },
  { label: "Sa", day: 6 },
  { label: "Su", day: 0 },
];

export const TaskModal: React.FC<TaskModalProps> = ({
  initialHabit,
  onSave,
  onDelete,
  onClose,
}) => {
  const [name, setName] = useState(initialHabit ? initialHabit.name : '');
  const [category, setCategory] = useState(initialHabit ? initialHabit.category : CATEGORIES[0]);
  const [icon, setIcon] = useState(initialHabit ? initialHabit.icon : ICONS[0]);
  const [color, setColor] = useState(initialHabit ? initialHabit.color : COLORS[0]);
  const [type, setType] = useState<'check' | 'timer'>(initialHabit ? initialHabit.type : 'check');
  const [minutes, setMinutes] = useState(initialHabit?.minutes || 15);
  const [timesPerDay, setTimesPerDay] = useState(initialHabit ? initialHabit.timesPerDay : 1);
  const [days, setDays] = useState<number[]>(
    initialHabit ? initialHabit.days : [0, 1, 2, 3, 4, 5, 6]
  );
  const [error, setError] = useState('');

  const toggleDay = (day: number) => {
    if (days.includes(day)) {
      if (days.length === 1) {
        setError('Pick at least one day.');
        return;
      }
      setDays(days.filter(d => d !== day));
    } else {
      setDays([...days, day]);
      setError('');
    }
  };

  const selectAllDays = () => {
    setDays([0, 1, 2, 3, 4, 5, 6]);
    setError('');
  };

  const handleSave = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Please enter a task name.');
      return;
    }
    if (days.length === 0) {
      setError('Pick at least one day.');
      return;
    }

    const habitToSave: Habit = {
      id: initialHabit ? initialHabit.id : 'habit_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      name: trimmed,
      category,
      icon,
      color,
      type,
      minutes: type === 'timer' ? Math.max(1, Number(minutes) || 15) : undefined,
      timesPerDay: Math.max(1, Number(timesPerDay) || 1),
      days,
    };

    onSave(habitToSave);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-t-3xl sm:rounded-3xl theme-panel p-5 sm:p-6 shadow-2xl max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-serif font-semibold theme-ink">
            {initialHabit ? 'Edit task' : 'New task'}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full theme-muted hover:opacity-80 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mb-3 px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
            {error}
          </div>
        )}

        {/* Task Name */}
        <div className="mb-4">
          <label className="block text-xs font-semibold theme-muted mb-1.5 uppercase tracking-wider">
            Task
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setError('');
            }}
            placeholder="e.g. Read 10 pages, Morning stretch..."
            className="w-full px-3.5 py-2.5 rounded-xl theme-panel2 text-sm theme-ink focus:outline-none"
            autoFocus
          />
        </div>

        {/* Category */}
        <div className="mb-4">
          <label className="block text-xs font-semibold theme-muted mb-1.5 uppercase tracking-wider">
            Area
          </label>
          <div className="flex flex-wrap gap-1.5">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${
                  category === cat
                    ? 'theme-accent-bg border-transparent shadow-xs'
                    : 'theme-panel2 theme-ink hover:opacity-90'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Icon & Color */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-xs font-semibold theme-muted mb-1.5 uppercase tracking-wider">
              Icon
            </label>
            <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-1.5 rounded-xl theme-panel2">
              {ICONS.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => setIcon(e)}
                  className={`w-9 h-9 rounded-xl flex items-center justify-center transition-transform active:scale-90 ${
                    icon === e
                      ? 'bg-[#4FA98A]/30 border border-[#4FA98A]'
                      : 'hover:opacity-80'
                  }`}
                >
                  <AppleEmoji emoji={e} size={20} />
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold theme-muted mb-1.5 uppercase tracking-wider">
              Color
            </label>
            <div className="flex flex-wrap items-center gap-2 p-2 rounded-xl theme-panel2 min-h-[46px]">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-7 h-7 rounded-full transition flex items-center justify-center ${
                    color === c ? 'ring-2 ring-offset-2 ring-current scale-110' : ''
                  }`}
                  style={{ backgroundColor: c }}
                >
                  {color === c && <Check className="w-3.5 h-3.5 text-white" />}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Tracking Type */}
        <div className="mb-4">
          <label className="block text-xs font-semibold theme-muted mb-1.5 uppercase tracking-wider">
            How it's tracked
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setType('check')}
              className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-medium transition ${
                type === 'check'
                  ? 'border-[#4FA98A] bg-[#4FA98A]/15 theme-accent'
                  : 'theme-panel2 theme-muted'
              }`}
            >
              <Check className="w-4 h-4" />
              <span>✓ Check off</span>
            </button>
            <button
              type="button"
              onClick={() => setType('timer')}
              className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-medium transition ${
                type === 'timer'
                  ? 'border-[#4FA98A] bg-[#4FA98A]/15 theme-accent'
                  : 'theme-panel2 theme-muted'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>⏱ Timer</span>
            </button>
          </div>
        </div>

        {type === 'timer' && (
          <div className="mb-4">
            <label className="block text-xs font-semibold theme-muted mb-1.5 uppercase tracking-wider">
              Minutes
            </label>
            <input
              type="number"
              min="1"
              max="180"
              value={minutes}
              onChange={(e) => setMinutes(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-full px-3.5 py-2.5 rounded-xl theme-panel2 text-sm theme-ink focus:outline-none"
            />
          </div>
        )}

        {/* Times per day */}
        <div className="mb-4">
          <label className="block text-xs font-semibold theme-muted mb-1.5 uppercase tracking-wider">
            Times per day
          </label>
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4, 5].map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTimesPerDay(t)}
                className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition ${
                  timesPerDay === t
                    ? 'theme-accent-bg border-transparent'
                    : 'theme-panel2 theme-ink'
                }`}
              >
                {t}x
              </button>
            ))}
          </div>
        </div>

        {/* Days of week */}
        <div className="mb-5">
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-semibold theme-muted uppercase tracking-wider">
              Days
            </label>
            <button
              type="button"
              onClick={selectAllDays}
              className="text-[11px] font-semibold theme-accent hover:underline cursor-pointer"
            >
              All days
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1.5">
            {WEEKDAYS.map(({ label, day }) => {
              const active = days.includes(day);
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => toggleDay(day)}
                  className={`py-2 rounded-xl text-xs font-semibold border transition ${
                    active
                      ? 'theme-accent-bg border-transparent'
                      : 'theme-panel2 theme-muted'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 pt-2 border-t theme-line">
          {initialHabit && onDelete && (
            <button
              type="button"
              onClick={() => onDelete(initialHabit.id)}
              className="p-3 rounded-xl border border-red-500/30 text-red-400 hover:bg-red-500/10 transition cursor-pointer"
              title="Delete task"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 px-4 rounded-xl theme-panel2 text-xs font-semibold theme-ink hover:opacity-80 transition cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSave}
            className="flex-1 py-3 px-4 rounded-xl theme-accent-bg text-xs font-semibold shadow-md active:scale-98 transition cursor-pointer"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};
