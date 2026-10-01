import React, { useState } from 'react';
import { CalendarEvent, CalendarEventType } from '../types';
import { X, Trash2, Check, Clock, Calendar } from 'lucide-react';
import { CATEGORIES, getCategoryInfo, CategoryInfo } from '../utils/categories';

interface EventModalProps {
  initialDate?: string;
  initialTime?: string;
  initialEvent?: CalendarEvent | null;
  onSave: (event: CalendarEvent) => void;
  onDelete?: (id: string) => void;
  onClose: () => void;
}

export const EventModal: React.FC<EventModalProps> = ({
  initialDate,
  initialTime,
  initialEvent,
  onSave,
  onDelete,
  onClose,
}) => {
  const defaultCategory = CATEGORIES[0];
  const [title, setTitle] = useState(initialEvent ? initialEvent.title : '');
  const [category, setCategory] = useState<CalendarEventType>(
    initialEvent ? initialEvent.category : defaultCategory.type
  );

  const selectedCatInfo = getCategoryInfo(category);
  const IconComponent = selectedCatInfo.icon;

  const todayStr = new Date().toISOString().split('T')[0];
  const [startDate, setStartDate] = useState(
    initialEvent ? initialEvent.startDate : (initialDate || todayStr)
  );

  const [isRange, setIsRange] = useState(Boolean(initialEvent?.endDate && initialEvent.endDate !== initialEvent.startDate));
  const [endDate, setEndDate] = useState(initialEvent?.endDate || initialDate || todayStr);

  const [hasTime, setHasTime] = useState(Boolean(initialEvent?.time || initialTime));
  const [time, setTime] = useState(initialEvent?.time || initialTime || '09:00');
  const [endTime, setEndTime] = useState(initialEvent?.endTime || '');

  const [notes, setNotes] = useState(initialEvent?.notes || '');
  const [error, setError] = useState('');

  const handleCategorySelect = (cat: CategoryInfo) => {
    setCategory(cat.type);
  };

  const handleSave = () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError('Zadejte prosím název události / plánu.');
      return;
    }
    if (!startDate) {
      setError('Vyberte prosím datum.');
      return;
    }
    if (isRange && endDate && endDate < startDate) {
      setError('Konec musí být stejný nebo pozdější než začátek.');
      return;
    }
    if (hasTime && endTime && endTime <= time) {
      setError('Čas konce musí být pozdější než čas začátku.');
      return;
    }

    const eventToSave: CalendarEvent = {
      id: initialEvent ? initialEvent.id : `evt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      title: trimmedTitle,
      category,
      startDate,
      endDate: isRange ? endDate : undefined,
      time: hasTime ? time : undefined,
      endTime: hasTime && endTime ? endTime : undefined,
      color: selectedCatInfo.color,
      notes: notes.trim() || undefined,
      completed: initialEvent?.completed || false,
      createdAt: initialEvent?.createdAt || new Date().toISOString(),
    };

    onSave(eventToSave);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-t-3xl sm:rounded-3xl theme-panel p-5 sm:p-6 shadow-2xl max-h-[92vh] overflow-y-auto animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-xs"
              style={{ backgroundColor: selectedCatInfo.color }}
            >
              <IconComponent className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-serif font-bold theme-ink">
                {initialEvent ? 'Upravit záznam' : 'Nový záznam v kalendáři'}
              </h2>
              <p className="text-[11px] theme-muted">
                {selectedCatInfo.label}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full theme-muted hover:opacity-80 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mb-3 px-3.5 py-2 rounded-xl bg-red-500/10 border border-red-500/30 text-red-500 text-xs font-medium">
            {error}
          </div>
        )}

        {/* Title Input */}
        <div className="mb-4">
          <label className="block text-xs font-semibold theme-muted mb-1.5 uppercase tracking-wider">
            Název
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              setError('');
            }}
            placeholder="např. Matematika test, Porada s týmem, Zubní lékař..."
            className="w-full px-3.5 py-2.5 rounded-xl theme-panel2 text-sm theme-ink focus:outline-none border theme-line font-medium"
            autoFocus
          />
        </div>

        {/* Category Chips with Distinct Colors and Modern Icons */}
        <div className="mb-4">
          <label className="block text-xs font-semibold theme-muted mb-1.5 uppercase tracking-wider">
            Kategorie
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
            {CATEGORIES.map((cat) => {
              const isSelected = category === cat.type;
              const CatIcon = cat.icon;
              return (
                <button
                  key={cat.type}
                  type="button"
                  onClick={() => handleCategorySelect(cat)}
                  className={`p-2.5 rounded-xl border text-xs font-medium transition active:scale-95 flex items-center gap-2 cursor-pointer text-left ${
                    isSelected
                      ? 'border-transparent text-white shadow-xs font-bold'
                      : 'theme-panel2 theme-ink opacity-80 hover:opacity-100 border theme-line'
                  }`}
                  style={{
                    backgroundColor: isSelected ? cat.color : undefined,
                  }}
                >
                  <div
                    className={`w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 ${
                      isSelected ? 'text-white' : ''
                    }`}
                    style={{
                      color: isSelected ? '#ffffff' : cat.color,
                    }}
                  >
                    <CatIcon className="w-4 h-4" />
                  </div>
                  <span className="truncate">{cat.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Date Selection */}
        <div className="mb-4 p-3.5 rounded-2xl theme-panel2 border theme-line space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold theme-ink flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 theme-accent" />
              <span>Datum &amp; Čas</span>
            </span>

            {/* Multi-day toggle */}
            <label className="flex items-center gap-2 text-xs theme-muted cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isRange}
                onChange={(e) => {
                  setIsRange(e.target.checked);
                  if (e.target.checked && !endDate) {
                    setEndDate(startDate);
                  }
                }}
                className="rounded accent-[#2F6F5E] cursor-pointer"
              />
              <span className="text-[11px] font-medium">Vícedenní</span>
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[11px] theme-muted mb-1 font-medium">
                {isRange ? 'Od data' : 'Datum'}
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  if (isRange && endDate && endDate < e.target.value) {
                    setEndDate(e.target.value);
                  }
                }}
                className="w-full px-3 py-2 rounded-xl theme-panel text-xs theme-ink border theme-line focus:outline-none"
              />
            </div>

            {isRange && (
              <div className="animate-fadeSlide">
                <label className="block text-[11px] theme-muted mb-1 font-medium">
                  Do data
                </label>
                <input
                  type="date"
                  value={endDate}
                  min={startDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl theme-panel text-xs theme-ink border theme-line focus:outline-none"
                />
              </div>
            )}
          </div>

          {/* Specific Time & Duration */}
          <div className="pt-2 border-t theme-line space-y-2">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-xs theme-muted cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={hasTime}
                  onChange={(e) => setHasTime(e.target.checked)}
                  className="rounded accent-[#2F6F5E] cursor-pointer"
                />
                <span className="text-[11px] font-medium flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>Přesný čas</span>
                </span>
              </label>
            </div>

            {hasTime && (
              <div className="grid grid-cols-2 gap-2 pt-1 animate-fadeSlide">
                <div>
                  <label className="block text-[10px] theme-muted mb-1 font-medium">Začátek</label>
                  <input
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl theme-panel text-xs theme-ink border theme-line focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] theme-muted mb-1 font-medium">Konec (volitelné)</label>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl theme-panel text-xs theme-ink border theme-line focus:outline-none"
                    placeholder="--:--"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Notes & Description */}
        <div className="mb-5">
          <label className="block text-xs font-semibold theme-muted mb-1.5 uppercase tracking-wider">
            Poznámky (volitelné)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Místnost, úkoly, příprava, kontakt..."
            rows={2}
            className="w-full px-3.5 py-2.5 rounded-xl theme-panel2 text-xs theme-ink focus:outline-none resize-none border theme-line"
          />
        </div>

        {/* Footer Actions */}
        <div className="flex items-center gap-2 pt-2 border-t theme-line">
          {initialEvent && onDelete && (
            <button
              type="button"
              onClick={() => onDelete(initialEvent.id)}
              className="p-3 rounded-xl border border-red-500/30 text-red-500 hover:bg-red-500/10 transition cursor-pointer"
              title="Smazat událost"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 px-4 rounded-xl theme-panel2 text-xs font-semibold theme-ink hover:opacity-80 transition cursor-pointer"
          >
            Zrušit
          </button>

          <button
            type="button"
            onClick={handleSave}
            className="flex-1 py-3 px-4 rounded-xl theme-accent-bg text-white text-xs font-bold shadow-md active:scale-98 transition cursor-pointer flex items-center justify-center gap-1.5"
          >
            <Check className="w-4 h-4" />
            <span>Uložit</span>
          </button>
        </div>
      </div>
    </div>
  );
};
