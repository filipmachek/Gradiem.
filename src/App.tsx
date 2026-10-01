/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Habit, CompletionsMap, EarnedFact, UserProfile, CustomTopic, CalendarEvent } from './types';
import { TOPICS } from './data/topicsAndFacts';
import { fetchNewFact } from './services/factsService';
import { RewardModal } from './components/RewardModal';
import { TaskModal } from './components/TaskModal';
import { ConfirmModal } from './components/ConfirmModal';
import { AddCustomTopicModal } from './components/AddCustomTopicModal';
import { FocusHub } from './components/FocusHub';
import { CalendarHub } from './components/CalendarHub';
import { EventModal } from './components/EventModal';
import { PWAInstallBanner } from './components/PWAInstallBanner';
import { AppleEmoji } from './components/AppleEmoji';
import { SkyAtmosphere } from './components/SkyAtmosphere';
import { SplashScreen } from './components/SplashScreen';
import { forceAppRefresh } from './services/pwaUpdater';
import { getCategoryInfo } from './utils/categories';
import {
  Volume2,
  Share2,
  Check,
  Star,
  Search,
  RotateCcw,
  RefreshCw,
  Sparkles,
  Trash2,
  Tag,
  Moon,
  Sun,
  Flame,
  CheckCircle2,
  Circle,
  Clock,
  UserCheck,
  Plus,
  Target,
  Calendar
} from 'lucide-react';

const LS = {
  get<T>(key: string, defaultValue: T): T {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch {
      return defaultValue;
    }
  },
  set<T>(key: string, value: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error('LocalStorage error:', e);
    }
  },
};

function formatDate(d: Date): string {
  const year = d.getFullYear();
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseDateStr(ds: string): Date {
  const [y, m, d] = ds.split('-').map(Number);
  return new Date(y, m - 1, d, 12, 0, 0);
}

function addDays(d: Date, n: number): Date {
  const next = new Date(d);
  next.setDate(next.getDate() + n);
  return next;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'tasks' | 'calendar' | 'focus' | 'facts' | 'profile'>('tasks');
  const [selectedDate, setSelectedDate] = useState<string>(() => formatDate(new Date()));
  const [showSplash, setShowSplash] = useState<boolean>(true);

  // Scroll feed state & allowance
  const [cardsViewed, setCardsViewed] = useState<number>(() => LS.get<number>('gradiem_cards_viewed', 0));
  const [unlockedCardsCount, setUnlockedCardsCount] = useState<number>(() => LS.get<number>('gradiem_unlocked_cards', 10));

  // Habits and completion state (starts clean without pre-populated sample data)
  const [habits, setHabits] = useState<Habit[]>(() => {
    const existing = LS.get<Habit[]>('dbd_habits', []);
    const cleaned = (existing || []).filter(
      (h) => h.id !== 'h_water' && h.id !== 'h_read' && h.id !== 'h_stretch'
    );
    return cleaned;
  });

  const [completions, setCompletions] = useState<CompletionsMap>(() =>
    LS.get<CompletionsMap>('dbd_completions', {})
  );

  const [earnedFacts, setEarnedFacts] = useState<EarnedFact[]>(() => {
    const raw = LS.get<EarnedFact[]>('dbd_facts', []);
    if (!raw || raw.length === 0) return [];
    
    // Daily cleanup rule: Facts without favorite / star that are from previous days expire
    const todayStr = formatDate(new Date());
    const valid = raw.filter((fact) => {
      if (fact.favorite) return true; // starred facts are kept permanently
      if (!fact.earnedAt) return true;
      const factDate = fact.earnedAt.split('T')[0];
      return factDate === todayStr; // keep today's fresh facts
    });
    return valid;
  });

  const [profile, setProfile] = useState<UserProfile>(() => {
    const raw = LS.get<any>('dbd_profile', {
      name: '',
      notes: '',
      selectedTopics: ['nature', 'space', 'history', 'biology', 'mind', 'tech'],
      customTopics: [],
    });
    const customTopics: CustomTopic[] = Array.isArray(raw?.customTopics)
      ? raw.customTopics.map((item: any, idx: number) => {
          if (typeof item === 'string') {
            return {
              id: `custom_${idx}_${item.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
              name: item,
              emoji: '💡',
            };
          }
          return {
            id: item.id || `custom_${idx}`,
            name: item.name || 'Vlastní',
            emoji: item.emoji || '💡',
          };
        })
      : [];
    return {
      name: raw?.name || '',
      notes: raw?.notes || '',
      selectedTopics: Array.isArray(raw?.selectedTopics)
        ? raw.selectedTopics
        : ['nature', 'space', 'history', 'biology', 'mind', 'tech'],
      customTopics,
    };
  });

  // Theme: Night mode by default as requested, with easy toggle
  const [theme, setTheme] = useState<'day' | 'night'>(() => {
    return LS.get<'day' | 'night'>('dbd_theme', 'night');
  });
  const [currentTime, setCurrentTime] = useState<string>('');

  // Modals
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [rewardFact, setRewardFact] = useState<EarnedFact | null>(null);
  const [rewardTaskName, setRewardTaskName] = useState<string>('');
  const [isAddCustomTopicModalOpen, setIsAddCustomTopicModalOpen] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    danger?: boolean;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  // Top dynamic toast
  const [toast, setToast] = useState<{ emoji: string; text: string; id: number } | null>(null);

  // Timers running for habits with wall-clock timekeeping
  const [activeTimers, setActiveTimers] = useState<Record<string, { remaining: number; running: boolean; lastTimestamp?: number }>>({});

  // Facts screen: search, filters & revealed translations
  const [factSearch, setFactSearch] = useState('');
  const [factFilterTopic, setFactFilterTopic] = useState<string | null>(null);
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [revealedTranslations, setRevealedTranslations] = useState<Set<string>>(new Set());
  const [copiedFactId, setCopiedFactId] = useState<string | null>(null);
  const [speakingFactId, setSpeakingFactId] = useState<string | null>(null);
  const [isRefreshingApp, setIsRefreshingApp] = useState(false);

  // Calendar Events state (starts clean without pre-populated sample data)
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>(() => {
    const existing = LS.get<CalendarEvent[]>('dbd_calendar_events', []);
    const cleaned = (existing || []).filter(
      (e) => e.id !== 'evt_sample_test' && e.id !== 'evt_sample_trip'
    );
    return cleaned;
  });

  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [eventModalInitialDate, setEventModalInitialDate] = useState<string | undefined>(undefined);
  const [eventModalInitialTime, setEventModalInitialTime] = useState<string | undefined>(undefined);

  useEffect(() => {
    LS.set('dbd_calendar_events', calendarEvents);
  }, [calendarEvents]);

  const handleSaveEvent = (savedEvent: CalendarEvent) => {
    setCalendarEvents((prev) => {
      const idx = prev.findIndex((e) => e.id === savedEvent.id);
      if (idx !== -1) {
        const next = [...prev];
        next[idx] = savedEvent;
        return next;
      }
      return [savedEvent, ...prev];
    });
    setIsEventModalOpen(false);
    setEditingEvent(null);
    setEventModalInitialTime(undefined);
  };

  const handleDeleteEvent = (id: string) => {
    setCalendarEvents((prev) => prev.filter((e) => e.id !== id));
    setIsEventModalOpen(false);
    setEditingEvent(null);
    setEventModalInitialTime(undefined);
  };

  const handleToggleEventComplete = (id: string) => {
    setCalendarEvents((prev) =>
      prev.map((e) => (e.id === id ? { ...e, completed: !e.completed } : e))
    );
  };

  // Sync to localStorage
  useEffect(() => {
    LS.set('dbd_habits', habits);
  }, [habits]);

  useEffect(() => {
    LS.set('dbd_completions', completions);
  }, [completions]);

  useEffect(() => {
    LS.set('dbd_facts', earnedFacts);
  }, [earnedFacts]);

  useEffect(() => {
    LS.set('dbd_profile', profile);
  }, [profile]);

  useEffect(() => {
    LS.set('dbd_theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
    document.body.setAttribute('data-theme', theme);
    if (theme === 'night') {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark');
    }
  }, [theme]);

  // Clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  // Timer tick interval with wall-clock delta calculation (runs seamlessly when phone screen is locked)
  useEffect(() => {
    const syncHabitTimers = () => {
      setActiveTimers((prev) => {
        let changed = false;
        const now = Date.now();
        const next = { ...prev };

        Object.entries(next).forEach(([habitId, timerState]) => {
          if (timerState.running) {
            changed = true;
            const lastTime = timerState.lastTimestamp || now;
            const deltaSeconds = Math.max(1, Math.floor((now - lastTime) / 1000));

            if (timerState.remaining <= deltaSeconds) {
              delete next[habitId];
              const habit = habits.find((h) => h.id === habitId);
              if (habit) {
                completeHabit(habit);
              }
            } else {
              next[habitId] = {
                ...timerState,
                remaining: timerState.remaining - deltaSeconds,
                lastTimestamp: now,
              };
            }
          }
        });

        return changed ? next : prev;
      });
    };

    const interval = setInterval(syncHabitTimers, 1000);
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        syncHabitTimers();
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', handleVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', handleVisibility);
    };
  }, [habits, completions, selectedDate]);

  // Scheduled habits for selected date
  const scheduledHabits = useMemo(() => {
    const dayOfWeek = parseDateStr(selectedDate).getDay();
    return habits.filter((h) => h.days.includes(dayOfWeek));
  }, [habits, selectedDate]);

  // Today stats
  const todayStr = useMemo(() => formatDate(new Date()), []);
  const todayScheduled = useMemo(() => {
    const dayOfWeek = new Date().getDay();
    return habits.filter((h) => h.days.includes(dayOfWeek));
  }, [habits]);

  const todayCompletedCount = useMemo(() => {
    const dayC = completions[todayStr] || {};
    return todayScheduled.filter((h) => (dayC[h.id] || 0) >= h.timesPerDay).length;
  }, [todayScheduled, completions, todayStr]);

  // Streak Calculation
  const streakCount = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const isDayFullyComplete = (ds: string) => {
      const dow = parseDateStr(ds).getDay();
      const sched = habits.filter((h) => h.days.includes(dow));
      if (sched.length === 0) return null;
      const dayC = completions[ds] || {};
      return sched.every((h) => (dayC[h.id] || 0) >= h.timesPerDay);
    };

    let streak = 0;
    let cursor = new Date(today);
    const todayStatus = isDayFullyComplete(formatDate(cursor));

    if (todayStatus === false) {
      cursor = addDays(cursor, -1);
    }

    for (let i = 0; i < 365; i++) {
      const ds = formatDate(cursor);
      const status = isDayFullyComplete(ds);
      if (status === null) {
        cursor = addDays(cursor, -1);
        continue;
      }
      if (status) {
        streak++;
        cursor = addDays(cursor, -1);
      } else {
        break;
      }
    }

    return streak;
  }, [habits, completions]);

  // Show top banner toast
  const showTopToast = (emoji: string, text: string) => {
    const id = Date.now();
    setToast({ emoji, text, id });
    setTimeout(() => {
      setToast((cur) => (cur?.id === id ? null : cur));
    }, 6500);
  };

  // Complete a habit & grant a fresh Gemini fact
  const completeHabit = async (habit: Habit) => {
    const currentCount = completions[selectedDate]?.[habit.id] || 0;
    const newCount = currentCount + 1;

    setCompletions((prev) => ({
      ...prev,
      [selectedDate]: {
        ...(prev[selectedDate] || {}),
        [habit.id]: newCount,
      },
    }));

    // Choose topic for fact from user's selected topics
    const activeTopicIds = profile.selectedTopics.length > 0 ? profile.selectedTopics : TOPICS.map((t) => t.id);
    const pickedId = activeTopicIds[Math.floor(Math.random() * activeTopicIds.length)] || 'nature';

    let topicName = 'General Knowledge';
    let emoji = '💡';
    let isCustom = false;

    const matchedDef = TOPICS.find((t) => t.id === pickedId);
    if (matchedDef) {
      topicName = matchedDef.name;
      emoji = matchedDef.emoji;
    } else {
      const customDef = profile.customTopics.find((ct) => ct.id === pickedId);
      if (customDef) {
        topicName = customDef.name;
        emoji = customDef.emoji || '💡';
        isCustom = true;
      }
    }

    // Fetch fresh non-repeating fact from Gemini API
    const newFact = await fetchNewFact(
      topicName,
      emoji,
      earnedFacts,
      isCustom ? topicName : undefined
    );

    // Save to earned facts
    setEarnedFacts((prev) => [newFact, ...prev]);

    // Reward +10 cards to scroll feed for completing task!
    setUnlockedCardsCount((prev) => {
      const next = prev + 10;
      LS.set('gradiem_unlocked_cards', next);
      return next;
    });

    // Show celebration reward modal & toast
    setRewardTaskName(habit.name);
    setRewardFact(newFact);
    showTopToast(newFact.emoji, newFact.en);
  };

  // Toggle habit check
  const handleCheck = (habit: Habit) => {
    const currentCount = completions[selectedDate]?.[habit.id] || 0;
    if (currentCount >= habit.timesPerDay) {
      setCompletions((prev) => {
        const copy = { ...prev };
        if (copy[selectedDate]) {
          const dayCopy = { ...copy[selectedDate] };
          delete dayCopy[habit.id];
          copy[selectedDate] = dayCopy;
        }
        return copy;
      });
      return;
    }

    if (habit.type === 'timer') {
      const existingTimer = activeTimers[habit.id];
      if (existingTimer) {
        const willRun = !existingTimer.running;
        setActiveTimers((prev) => ({
          ...prev,
          [habit.id]: {
            ...existingTimer,
            running: willRun,
            lastTimestamp: willRun ? Date.now() : undefined,
          },
        }));
      } else {
        setActiveTimers((prev) => ({
          ...prev,
          [habit.id]: {
            remaining: (habit.minutes || 15) * 60,
            running: true,
            lastTimestamp: Date.now(),
          },
        }));
      }
      return;
    }

    completeHabit(habit);
  };

  const stopTimer = (habitId: string) => {
    setActiveTimers((prev) => {
      const next = { ...prev };
      delete next[habitId];
      return next;
    });
  };

  const toggleFavorite = (factId: string) => {
    setEarnedFacts((prev) =>
      prev.map((f) => (f.id === factId ? { ...f, favorite: !f.favorite } : f))
    );
  };

  const toggleFactTranslation = (factId: string) => {
    setRevealedTranslations((prev) => {
      const next = new Set(prev);
      if (next.has(factId)) {
        next.delete(factId);
      } else {
        next.add(factId);
      }
      return next;
    });
  };

  const copyFact = (f: EarnedFact) => {
    const text = `${f.emoji} ${f.en}\n\n(🇨🇿 ${f.cs})\n— DayByDay`;
    navigator.clipboard.writeText(text);
    setCopiedFactId(f.id);
    setTimeout(() => setCopiedFactId(null), 2000);
  };

  const speakFact = (f: EarnedFact) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      if (speakingFactId === f.id) {
        setSpeakingFactId(null);
        return;
      }
      const isRevealed = revealedTranslations.has(f.id);
      const text = isRevealed ? f.cs : f.en;
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = isRevealed ? 'cs-CZ' : 'en-US';
      utterance.rate = 0.95;
      utterance.onend = () => setSpeakingFactId(null);
      utterance.onerror = () => setSpeakingFactId(null);
      setSpeakingFactId(f.id);
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleAddCustomTopic = ({ name, emoji }: { name: string; emoji: string }) => {
    const trimmed = name.trim();
    if (!trimmed) return;

    const existing = profile.customTopics.find(
      (ct) => ct.name.toLowerCase() === trimmed.toLowerCase()
    );
    if (existing) {
      if (!profile.selectedTopics.includes(existing.id)) {
        setProfile((prev) => ({
          ...prev,
          selectedTopics: [...prev.selectedTopics, existing.id],
        }));
      }
      setToast({
        emoji: existing.emoji,
        text: `Topic "${existing.name}" is already in your list!`,
        id: Date.now(),
      });
      return;
    }

    const newTopicId = `custom_${Date.now()}`;
    const newTopic: CustomTopic = {
      id: newTopicId,
      name: trimmed,
      emoji: emoji.trim() || '💡',
    };

    setProfile((prev) => ({
      ...prev,
      customTopics: [...prev.customTopics, newTopic],
      selectedTopics: prev.selectedTopics.includes(newTopicId)
        ? prev.selectedTopics
        : [...prev.selectedTopics, newTopicId],
    }));

    setToast({
      emoji: newTopic.emoji,
      text: `Topic "${newTopic.name}" added and selected!`,
      id: Date.now(),
    });
  };

  const removeCustomTopic = (topicId: string) => {
    setProfile((prev) => ({
      ...prev,
      customTopics: prev.customTopics.filter((t) => t.id !== topicId),
      selectedTopics: prev.selectedTopics.filter((id) => id !== topicId),
    }));
  };

  const toggleTopicSelection = (topicId: string) => {
    setProfile((prev) => {
      const exists = prev.selectedTopics.includes(topicId);
      const updated = exists
        ? prev.selectedTopics.filter((t) => t !== topicId)
        : [...prev.selectedTopics, topicId];
      return { ...prev, selectedTopics: updated };
    });
  };

  // Focus session complete handler: logs focus stats & grants a reward fact
  const handleFocusSessionComplete = async (durationMinutes: number, focusIntention: string) => {
    // Update profile stats
    setProfile((prev) => ({
      ...prev,
      focusStats: {
        totalMinutes: (prev.focusStats?.totalMinutes || 0) + durationMinutes,
        sessionsCompleted: (prev.focusStats?.sessionsCompleted || 0) + 1,
      },
    }));

    // Choose topic for reward fact
    const activeTopicIds = profile.selectedTopics.length > 0 ? profile.selectedTopics : TOPICS.map((t) => t.id);
    const pickedId = activeTopicIds[Math.floor(Math.random() * activeTopicIds.length)] || 'nature';

    let topicName = 'General Knowledge';
    let emoji = '💡';
    let isCustom = false;

    const matchedDef = TOPICS.find((t) => t.id === pickedId);
    if (matchedDef) {
      topicName = matchedDef.name;
      emoji = matchedDef.emoji;
    } else {
      const customDef = profile.customTopics.find((ct) => ct.id === pickedId);
      if (customDef) {
        topicName = customDef.name;
        emoji = customDef.emoji || '💡';
        isCustom = true;
      }
    }

    const newFact = await fetchNewFact(
      topicName,
      emoji,
      earnedFacts,
      isCustom ? topicName : undefined
    );

    setEarnedFacts((prev) => [newFact, ...prev]);
    setRewardFact(newFact);
    setRewardTaskName(`Focused ${durationMinutes}m on "${focusIntention}"`);
    setToast({
      emoji: '🎯',
      text: `Completed ${durationMinutes}m focus session! Fact unlocked.`,
      id: Date.now(),
    });
  };

  // Filtered facts
  const filteredFacts = useMemo(() => {
    return earnedFacts.filter((f) => {
      if (onlyFavorites && !f.favorite) return false;
      if (factFilterTopic && f.topic !== factFilterTopic) return false;
      if (factSearch.trim()) {
        const query = factSearch.toLowerCase();
        return (
          f.en.toLowerCase().includes(query) ||
          f.cs.toLowerCase().includes(query) ||
          f.topic.toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [earnedFacts, factSearch, factFilterTopic, onlyFavorites]);

  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Calculate sliding pill position for 7-day strip
  const stripDates = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return [-3, -2, -1, 0, 1, 2, 3].map((offset) => {
      const d = addDays(today, offset);
      return {
        offset,
        dateObj: d,
        ds: formatDate(d),
      };
    });
  }, []);

  const selectedDayIndex = useMemo(() => {
    const idx = stripDates.findIndex((item) => item.ds === selectedDate);
    return idx !== -1 ? idx : 3;
  }, [stripDates, selectedDate]);

  // Calendar events occurring on the selected date
  const selectedDateCalendarEvents = useMemo(() => {
    return calendarEvents.filter((evt) => {
      const start = evt.startDate;
      const end = evt.endDate || evt.startDate;
      return selectedDate >= start && selectedDate <= end;
    });
  }, [calendarEvents, selectedDate]);

  // Indicator map for calendar items present across the 7-day strip
  const calendarEventsByDayInStrip = useMemo(() => {
    const map: Record<string, boolean> = {};
    calendarEvents.forEach((evt) => {
      const start = evt.startDate;
      const end = evt.endDate || evt.startDate;
      stripDates.forEach(({ ds }) => {
        if (ds >= start && ds <= end) {
          map[ds] = true;
        }
      });
    });
    return map;
  }, [calendarEvents, stripDates]);

  // Tab index for bottom sliding pill (5 tabs: Days, Calendar, Focus, Facts, Profile)
  const tabIndex =
    activeTab === 'tasks'
      ? 0
      : activeTab === 'calendar'
      ? 1
      : activeTab === 'focus'
      ? 2
      : activeTab === 'facts'
      ? 3
      : 4;

  // Is today 100% complete?
  const isAllCompletedToday = todayScheduled.length > 0 && todayCompletedCount >= todayScheduled.length;

  // Latest fact for "Fact on the go" card
  const latestFact = earnedFacts.length > 0 ? earnedFacts[0] : null;

  return (
    <div className="min-h-screen w-full bg-[var(--bg)] text-[var(--ink)] transition-colors duration-300">
      {/* Gradiem Splash Screen intro animation */}
      {showSplash && <SplashScreen onFinish={() => setShowSplash(false)} />}

      <div className="max-w-[620px] mx-auto min-h-screen px-4 sm:px-6 pt-[calc(env(safe-area-inset-top,0px)+1rem)] pb-28 relative">
      {/* Top Banner Toast (Dynamic Island style notification) */}
      {toast && (
        <div
          onClick={() => {
            setActiveTab('facts');
            setToast(null);
          }}
          className="fixed top-4 left-1/2 z-50 w-[calc(100%-32px)] max-w-[480px] p-3.5 rounded-2xl theme-panel shadow-2xl flex items-start gap-3 cursor-pointer animate-toast-in select-none"
        >
          <AppleEmoji emoji={toast.emoji} size={24} />
          <div className="flex-1 min-w-0">
            <div className="text-[11px] font-bold uppercase tracking-wider theme-accent flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" />
              <span>New Fact Unlocked!</span>
            </div>
            <p className="text-xs theme-ink line-clamp-2 mt-0.5 leading-snug">
              {toast.text}
            </p>
          </div>
        </div>
      )}

      {/* Top Hero Header with Brand & Theme Switcher */}
      <header className="relative z-30 mb-3 pt-1">
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-2">
            <h1 className="text-2xl sm:text-[1.85rem] font-serif font-bold theme-ink tracking-tight select-none drop-shadow-xs">
              Gradiem<span className="text-[#2F6F5E] dark:text-[#4FA98A]">.</span>
            </h1>
          </div>

          <div className="flex items-center gap-2">
            {/* Smooth Day / Night Mode Switcher (Green tones) */}
            <button
              onClick={() => setTheme(theme === 'night' ? 'day' : 'night')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full theme-panel2 text-xs font-semibold theme-ink active:scale-95 transition-transform shadow-xs cursor-pointer select-none border theme-line"
              title="Toggle Day / Night mode"
            >
              {theme === 'night' ? (
                <>
                  <Moon className="w-3.5 h-3.5 text-[#E5A95A]" />
                  <span>Night</span>
                </>
              ) : (
                <>
                  <Sun className="w-3.5 h-3.5 text-[#C98A3B]" />
                  <span>Day</span>
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Dynamic Immersive Sky Background & Clean Realtime Clock */}
      <SkyAtmosphere theme={theme} />

      {/* Top Stats Strip: Pure White in Day Mode, Pure Dark in Night Mode, Spacious & Ultra-Bold */}
      <div className="grid grid-cols-2 gap-3 sm:gap-3.5 mb-6">
        {/* Flame Streak Hero */}
        <div
          className={`flex items-center gap-3 p-3.5 sm:p-4 rounded-2xl border-2 select-none transition-transform active:scale-[0.98] shadow-sm ${
            theme === 'day'
              ? 'bg-white border-orange-400 shadow-[0_2px_12px_rgba(249,115,22,0.14)]'
              : 'bg-[#18181B] border-amber-500/60 shadow-[0_0_15px_rgba(245,158,11,0.15)] text-amber-400'
          }`}
        >
          <div className="relative w-9 h-9 flex-shrink-0 flex items-center justify-center">
            {streakCount > 0 ? (
              <div className="relative flex items-center justify-center">
                <div className="absolute inset-0 rounded-full bg-gradient-to-t from-red-600 via-orange-500 to-yellow-300 blur-sm opacity-95 animate-pulse" />
                <svg
                  viewBox="0 0 24 24"
                  className="w-8 h-8 relative z-10 drop-shadow-[0_0_12px_rgba(255,100,0,1)] animate-flame-outer"
                  fill="none"
                >
                  <defs>
                    <linearGradient id="flameOuterGradVivid" x1="0%" y1="100%" x2="0%" y2="0%">
                      <stop offset="0%" stopColor="#DC2626" />
                      <stop offset="35%" stopColor="#EA580C" />
                      <stop offset="70%" stopColor="#F59E0B" />
                      <stop offset="100%" stopColor="#FEF08A" />
                    </linearGradient>
                    <linearGradient id="flameInnerGradVivid" x1="0%" y1="100%" x2="0%" y2="0%">
                      <stop offset="0%" stopColor="#EA580C" />
                      <stop offset="45%" stopColor="#FDE047" />
                      <stop offset="100%" stopColor="#FFFFFF" />
                    </linearGradient>
                  </defs>
                  {/* Outer campfire flame with multiple lively tongues */}
                  <path
                    d="M12 2C11.5 5 9 7 9 10C9 11.2 9.5 12.2 10.2 13C8.5 12.5 7.5 11 7.5 9C5 12 4.5 16 7 19.2C8.5 21 10.5 22 12.5 22C17 22 20 18.5 20 14C20 9.5 16.5 6 15 3.5C14.5 5.5 13.5 6.5 12.5 7C12.8 5 12.5 3.5 12 2Z"
                    fill="url(#flameOuterGradVivid)"
                  />
                  {/* Inner dancing hot core */}
                  <path
                    d="M12 11C11 12.5 10 14 10 16C10 18 11.5 19.5 13 19.5C14.5 19.5 15.5 18 15.5 16C15.5 13.5 13.5 12.5 13 11C12.7 11.8 12.2 11.5 12 11Z"
                    fill="url(#flameInnerGradVivid)"
                  />
                </svg>
              </div>
            ) : (
              <div
                className={`w-8 h-8 rounded-xl border-2 flex items-center justify-center ${
                  theme === 'day'
                    ? 'bg-orange-50 border-orange-300 text-orange-500'
                    : 'bg-amber-500/20 border-amber-500/40 text-amber-400'
                }`}
              >
                <svg
                  viewBox="0 0 24 24"
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
                </svg>
              </div>
            )}
          </div>
          <div className="min-w-0">
            <div
              className={`font-sans font-black text-3xl sm:text-[2rem] leading-none tracking-tight ${
                theme === 'day'
                  ? 'text-[#FF5500] drop-shadow-[0_1.5px_2px_rgba(234,88,12,0.32)]'
                  : 'text-amber-400 drop-shadow-[0_0_10px_rgba(251,191,36,0.85)]'
              }`}
            >
              {streakCount}
            </div>
            <div
              className={`font-sans font-black text-[11px] sm:text-xs uppercase tracking-wider mt-1 truncate ${
                theme === 'day'
                  ? 'text-[#E04F00] drop-shadow-[0_1px_1px_rgba(224,79,0,0.22)]'
                  : 'text-amber-300 drop-shadow-[0_0_8px_rgba(251,191,36,0.65)]'
              }`}
            >
              {streakCount > 0 ? 'on fire 🔥' : '0 on fire'}
            </div>
          </div>
        </div>

        {/* Done Today Card */}
        <div
          className={`flex flex-col justify-between p-3.5 sm:p-4 rounded-2xl border-2 select-none transition-transform active:scale-[0.98] shadow-sm ${
            theme === 'day'
              ? 'bg-white border-emerald-400 shadow-[0_2px_12px_rgba(16,185,129,0.12)]'
              : 'bg-[#18181B] border-emerald-500/60 shadow-[0_0_15px_rgba(16,185,129,0.15)] text-emerald-400'
          }`}
        >
          <div className="flex items-baseline justify-between gap-1">
            <div className="flex items-baseline gap-1">
              <span
                className={`font-sans font-black text-3xl sm:text-[2rem] leading-none tracking-tight ${
                  theme === 'day'
                    ? 'text-emerald-700 drop-shadow-[0_1.5px_2px_rgba(4,120,87,0.28)]'
                    : 'text-emerald-400 drop-shadow-[0_0_10px_rgba(52,211,153,0.85)]'
                }`}
              >
                {todayCompletedCount}
              </span>
              <span
                className={`font-sans font-extrabold text-base leading-none ${
                  theme === 'day'
                    ? 'text-emerald-800 drop-shadow-[0_1px_1px_rgba(4,120,87,0.15)]'
                    : 'text-emerald-200/90 drop-shadow-[0_0_6px_rgba(52,211,153,0.5)]'
                }`}
              >
                / {todayScheduled.length}
              </span>
            </div>
            <span
              className={`font-sans font-black text-[11px] sm:text-xs uppercase tracking-wider ${
                theme === 'day'
                  ? 'text-emerald-800 drop-shadow-[0_1px_1px_rgba(4,120,87,0.15)]'
                  : 'text-emerald-300 drop-shadow-[0_0_6px_rgba(52,211,153,0.5)]'
              }`}
            >
              Tasks
            </span>
          </div>

          {/* Thick High-Contrast Progress Bar */}
          <div
            className={`w-full h-2.5 rounded-full border-2 mt-2 overflow-hidden p-[1px] ${
              theme === 'day'
                ? 'bg-emerald-100 border-emerald-300'
                : 'bg-emerald-950/90 border-emerald-500/40'
            }`}
          >
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                theme === 'day'
                  ? 'bg-emerald-600 shadow-sm'
                  : 'bg-gradient-to-r from-emerald-400 to-teal-300 shadow-[0_0_8px_rgba(52,211,153,0.9)]'
              }`}
              style={{
                width: `${
                  todayScheduled.length > 0
                    ? Math.min(100, Math.round((todayCompletedCount / todayScheduled.length) * 100))
                    : 0
                }%`,
              }}
            />
          </div>
        </div>
      </div>

      {/* Main Screen: DAYS */}
      {activeTab === 'tasks' && (
        <section className="space-y-4 animate-fadeSlide">
          {/* PWA Install Banner */}
          <PWAInstallBanner />

          {/* 7-Day Strip with Floating Sliding Pill Bubble */}
          <div className="relative grid grid-cols-7 py-0.5 px-0 rounded-2xl theme-panel shadow-xs overflow-hidden border theme-line">
            {/* Sliding Pill Bubble */}
            <div
              className="absolute top-1 bottom-1 rounded-xl theme-accent-bg pointer-events-none transition-bubble opacity-15"
              style={{
                left: `${(selectedDayIndex * 100) / 7}%`,
                width: `${100 / 7}%`,
              }}
            />

            {stripDates.map(({ dateObj, ds, offset }) => {
              const isToday = offset === 0;
              const isSelected = ds === selectedDate;
              const dow = dateObj.getDay();
              const daySched = habits.filter((h) => h.days.includes(dow));
              const dayC = completions[ds] || {};
              const doneCount = daySched.filter((h) => (dayC[h.id] || 0) >= h.timesPerDay).length;
              const isAllDone = daySched.length > 0 && doneCount === daySched.length;
              const isPartDone = daySched.length > 0 && doneCount > 0 && !isAllDone;

              return (
                <div
                  key={ds}
                  onClick={() => setSelectedDate(ds)}
                  className="relative z-10 text-center py-2.5 px-0.5 cursor-pointer rounded-xl select-none transition-transform active:scale-95"
                >
                  <div
                    className={`text-[9.5px] uppercase tracking-wider font-semibold ${
                      isSelected
                        ? 'theme-accent font-bold'
                        : 'theme-muted'
                    }`}
                  >
                    {dateObj.toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 3)}
                  </div>
                  <div
                    className={`text-base font-bold mt-0.5 ${
                      isSelected
                        ? 'theme-accent font-extrabold'
                        : isToday
                        ? 'theme-accent'
                        : 'theme-ink'
                    }`}
                  >
                    {dateObj.getDate()}
                  </div>
                  <div className="h-2 flex items-center justify-center mt-0.5 text-[9px] font-bold gap-0.5">
                    {isAllDone && <span className="theme-accent">●</span>}
                    {isPartDone && <span className="text-[#C98A3B]">◐</span>}
                    {calendarEventsByDayInStrip[ds] && (
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" title="Scheduled calendar events" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* SECTION 1: Calendar */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider theme-ink flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 theme-accent" />
                  <span>Calendar</span>
                </span>
                {selectedDateCalendarEvents.length > 0 && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#2F6F5E]/15 text-[#2F6F5E] dark:text-[#4FA98A]">
                    {selectedDateCalendarEvents.length}
                  </span>
                )}
              </div>

              <button
                onClick={() => {
                  setEditingEvent(null);
                  setEventModalInitialDate(selectedDate);
                  setEventModalInitialTime(undefined);
                  setIsEventModalOpen(true);
                }}
                className="text-xs font-semibold theme-accent hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>+ Add Calendar</span>
              </button>
            </div>

            {selectedDateCalendarEvents.length > 0 ? (
              <div className="space-y-2">
                {selectedDateCalendarEvents.map((evt) => {
                  const isCompleted = evt.completed;
                  const isMultiDay = Boolean(evt.endDate && evt.endDate !== evt.startDate);
                  const catInfo = getCategoryInfo(evt.category);
                  const CatIcon = catInfo.icon;

                  return (
                    <div
                      key={evt.id}
                      onClick={() => {
                        setEditingEvent(evt);
                        setEventModalInitialDate(evt.startDate);
                        setEventModalInitialTime(evt.time);
                        setIsEventModalOpen(true);
                      }}
                      className={`p-3 rounded-2xl border transition-all cursor-pointer hover:border-[#2F6F5E]/50 active:scale-[0.99] shadow-xs flex items-center gap-3 ${
                        isCompleted
                          ? 'theme-panel opacity-60 border theme-line'
                          : 'theme-panel'
                      }`}
                      style={{
                        borderLeftWidth: '3.5px',
                        borderLeftColor: catInfo.color,
                      }}
                    >
                      {/* Completion Checkbox */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleEventComplete(evt.id);
                        }}
                        className="flex-shrink-0 p-0.5 cursor-pointer rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition"
                        title={isCompleted ? 'Mark incomplete' : 'Mark completed'}
                      >
                        {isCompleted ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                        ) : (
                          <Circle className="w-5 h-5 theme-muted" />
                        )}
                      </button>

                      {/* Modern Category Icon with Tinted Background */}
                      <div
                        className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: catInfo.bgLight, color: catInfo.color }}
                      >
                        <CatIcon className="w-4 h-4" />
                      </div>

                      {/* Event Title & Metadata */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-xs sm:text-sm font-bold truncate ${
                              isCompleted ? 'line-through theme-muted' : 'theme-ink'
                            }`}
                          >
                            {evt.title}
                          </span>
                          <span
                            className="text-[9.5px] font-bold px-2 py-0.5 rounded-full text-white flex-shrink-0"
                            style={{ backgroundColor: catInfo.color }}
                          >
                            {catInfo.label}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 mt-0.5 text-[11px] theme-muted flex-wrap font-mono">
                          {evt.time && (
                            <span className="flex items-center gap-1 font-medium">
                              <Clock className="w-3 h-3" />
                              {evt.time}{evt.endTime ? ` - ${evt.endTime}` : ''}
                            </span>
                          )}
                          {isMultiDay && (
                            <span className="font-medium font-sans">
                              {evt.startDate} → {evt.endDate}
                            </span>
                          )}
                          {evt.notes && (
                            <span className="truncate max-w-[220px] opacity-85 font-sans">
                              {evt.notes}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-3 rounded-2xl theme-panel2 border border-dashed theme-line flex items-center justify-between text-xs">
                <span className="theme-muted text-[11.5px]">
                  No calendar events for this date
                </span>
                <button
                  onClick={() => {
                    setEditingEvent(null);
                    setEventModalInitialDate(selectedDate);
                    setEventModalInitialTime(undefined);
                    setIsEventModalOpen(true);
                  }}
                  className="text-xs font-semibold theme-accent hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>+ Add Calendar</span>
                </button>
              </div>
            )}
          </div>

          {/* SECTION 2: Daily Habits (Distinct section header) */}
          <div className="text-xs theme-muted pt-2 flex items-center gap-2 font-semibold">
            <span className="flex items-center gap-1.5 uppercase tracking-wider font-bold">
              <span>Daily Habits</span>
              <span className="text-[10px] font-semibold opacity-70">
                ({selectedDate === todayStr ? `${todayCompletedCount}/${todayScheduled.length} done` : `${scheduledHabits.length} habits`})
              </span>
            </span>
            <div className="flex-1 h-px theme-line-bg" />
          </div>

          {/* Habits List */}
          <div className="space-y-2.5">
            {scheduledHabits.length === 0 ? (
              <div className="text-center py-10 px-4 rounded-2xl theme-panel shadow-xs border theme-line">
                <div className="mb-2 flex justify-center">
                  <AppleEmoji emoji="🌱" size={36} />
                </div>
                <p className="text-sm font-medium theme-ink">
                  Nothing scheduled for this day — tap + to add a task.
                </p>
              </div>
            ) : (
              scheduledHabits.map((habit) => {
                const dayCount = completions[selectedDate]?.[habit.id] || 0;
                const isDone = dayCount >= habit.timesPerDay;
                const timer = activeTimers[habit.id];

                return (
                  <div
                    key={habit.id}
                    className={`p-3.5 rounded-2xl border transition-all duration-200 shadow-xs animate-rise ${
                      isDone
                        ? 'theme-panel border-[#4FA98A]/40 bg-linear-to-r from-[#4FA98A]/10 to-transparent'
                        : 'theme-panel border theme-line'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {/* Icon dot */}
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform active:scale-95"
                        style={{
                          backgroundColor: `${habit.color}1c`,
                        }}
                      >
                        <AppleEmoji emoji={habit.icon} size={22} />
                      </div>

                      {/* Main text */}
                      <div
                        onClick={() => {
                          setEditingHabit(habit);
                          setIsTaskModalOpen(true);
                        }}
                        className="flex-1 min-w-0 cursor-pointer"
                      >
                        <div
                          className={`text-[0.95rem] font-semibold truncate ${
                            isDone
                              ? 'line-through theme-muted'
                              : 'theme-ink'
                          }`}
                        >
                          {habit.name}
                        </div>
                        <div className="text-[11.5px] theme-muted mt-0.5 truncate flex items-center gap-1.5">
                          <span>{habit.category}</span>
                          {habit.type === 'timer' && <span>• ⏱ {habit.minutes} min</span>}
                          {habit.timesPerDay > 1 && <span>• {dayCount}/{habit.timesPerDay}x</span>}
                        </div>
                      </div>

                      {/* Check Button with spring pop animation */}
                      <button
                        onClick={() => handleCheck(habit)}
                        className={`w-9 h-9 rounded-full border-2 flex items-center justify-center font-bold text-xs flex-shrink-0 transition-transform active:scale-80 ${
                          isDone
                            ? 'theme-accent-bg border-transparent animate-pop shadow-xs'
                            : habit.type === 'timer'
                            ? 'border-[#2F6F5E] dark:border-[#4FA98A] theme-accent bg-[#4FA98A]/10'
                            : habit.timesPerDay > 1
                            ? 'theme-line theme-muted'
                            : 'theme-line text-transparent hover:border-[#4FA98A]'
                        }`}
                      >
                        {isDone ? (
                          '✓'
                        ) : habit.type === 'timer' ? (
                          timer && timer.running ? (
                            '⏸'
                          ) : (
                            '⏱'
                          )
                        ) : habit.timesPerDay > 1 ? (
                          `${dayCount}/${habit.timesPerDay}`
                        ) : (
                          ''
                        )}
                      </button>
                    </div>

                    {/* Timer row */}
                    {timer && (
                      <div className="mt-3 pt-3 border-t theme-line flex items-center justify-between animate-rise">
                        <div className="flex items-center gap-2">
                          <span className="font-serif text-lg font-bold theme-accent tracking-wider">
                            {formatTimer(timer.remaining)}
                          </span>
                          <span className="text-[11px] theme-muted">
                            {timer.running ? 'running...' : 'paused'}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleCheck(habit)}
                            className="px-3.5 py-1 rounded-full theme-accent-bg text-xs font-semibold active:scale-95 transition"
                          >
                            {timer.running ? 'Pause' : 'Start'}
                          </button>
                          <button
                            onClick={() => stopTimer(habit.id)}
                            className="p-1 rounded-full theme-muted hover:opacity-80 active:scale-90 transition"
                            title="Reset timer"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </section>
      )}

      {/* Main Screen: CALENDAR */}
      {activeTab === 'calendar' && (
        <CalendarHub
          events={calendarEvents}
          onAddEvent={(date, time) => {
            setEditingEvent(null);
            setEventModalInitialDate(date || selectedDate);
            setEventModalInitialTime(time);
            setIsEventModalOpen(true);
          }}
          onEditEvent={(event) => {
            setEditingEvent(event);
            setEventModalInitialDate(event.startDate);
            setEventModalInitialTime(event.time);
            setIsEventModalOpen(true);
          }}
          onToggleComplete={handleToggleEventComplete}
          habits={habits}
          completions={completions}
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
        />
      )}

      {/* Main Screen: FOCUS */}
      {activeTab === 'focus' && (
        <FocusHub
          onSessionComplete={handleFocusSessionComplete}
          stats={profile.focusStats}
          theme={theme}
        />
      )}

      {/* Main Screen: FACTS VAULT */}
      {activeTab === 'facts' && (
        <section className="space-y-3.5 animate-fadeSlide">
          {/* Search bar & Favorites filter button */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 theme-muted" />
              <input
                type="text"
                value={factSearch}
                onChange={(e) => setFactSearch(e.target.value)}
                placeholder="Search in earned facts..."
                className="w-full pl-9 pr-8 py-2.5 rounded-xl theme-panel text-xs theme-ink focus:outline-none border theme-line"
              />
              {factSearch && (
                <button
                  onClick={() => setFactSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs theme-muted hover:text-ink cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>

            <button
              onClick={() => setOnlyFavorites(!onlyFavorites)}
              className={`px-3 py-2.5 rounded-xl border flex items-center gap-1.5 text-xs font-semibold transition active:scale-95 cursor-pointer flex-shrink-0 ${
                onlyFavorites
                  ? 'bg-amber-500/15 border-amber-500/30 text-amber-600 dark:text-amber-400'
                  : 'theme-panel theme-muted hover:text-ink'
              }`}
              title="Show only favorites"
            >
              <Star className={`w-3.5 h-3.5 ${onlyFavorites ? 'fill-amber-500 text-amber-500' : ''}`} />
              <span className="hidden sm:inline">Favorites</span>
            </button>
          </div>

          {/* Topic chips filter (built-in + user custom topics) */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            <button
              onClick={() => setFactFilterTopic(null)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border flex-shrink-0 transition active:scale-95 cursor-pointer ${
                factFilterTopic === null
                  ? 'theme-accent-bg border-transparent font-semibold shadow-xs'
                  : 'theme-panel theme-muted'
              }`}
            >
              All topics
            </button>
            {TOPICS.map((topic) => (
              <button
                key={topic.id}
                onClick={() => setFactFilterTopic(factFilterTopic === topic.name ? null : topic.name)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border flex items-center gap-1.5 flex-shrink-0 transition active:scale-95 cursor-pointer ${
                  factFilterTopic === topic.name
                    ? 'theme-accent-bg font-semibold border-transparent'
                    : 'theme-panel theme-muted'
                }`}
              >
                <AppleEmoji emoji={topic.emoji} size={15} />
                <span>{topic.name}</span>
              </button>
            ))}
            {profile.customTopics?.map((ct) => (
              <button
                key={ct.id}
                onClick={() => setFactFilterTopic(factFilterTopic === ct.name ? null : ct.name)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border flex items-center gap-1.5 flex-shrink-0 transition active:scale-95 cursor-pointer ${
                  factFilterTopic === ct.name
                    ? 'theme-accent-bg font-semibold border-transparent'
                    : 'theme-panel theme-muted'
                }`}
              >
                <AppleEmoji emoji={ct.emoji} size={15} />
                <span>{ct.name}</span>
              </button>
            ))}
          </div>

          {/* Facts list */}
          <div className="space-y-2.5">
            {filteredFacts.length === 0 ? (
              <div className="text-center py-12 px-4 rounded-2xl theme-panel border theme-line">
                <div className="mb-2 flex justify-center">
                  <AppleEmoji emoji="💡" size={36} />
                </div>
                <p className="text-sm font-medium theme-ink">
                  Complete a task in Days to earn your first fact.
                </p>
              </div>
            ) : (
              filteredFacts.map((fact) => {
                const isRevealed = revealedTranslations.has(fact.id);
                return (
                  <div
                    key={fact.id}
                    onClick={() => toggleFactTranslation(fact.id)}
                    className="flex gap-3 items-start p-3.5 rounded-2xl theme-panel cursor-pointer animate-rise transition-all active:scale-[0.985] hover:opacity-95 border theme-line"
                  >
                    <div className="mt-0.5 flex-shrink-0">
                      <AppleEmoji emoji={fact.emoji} size={24} />
                    </div>

                    <div className="flex-1 min-w-0">
                      {/* English Fact */}
                      <p className="text-[0.92rem] leading-relaxed theme-ink">
                        {fact.en}
                      </p>

                      {/* Czech Translation (smooth expandable) */}
                      {isRevealed ? (
                        <div className="text-xs text-[#C98A3B] dark:text-[#E5A95A] mt-2 pt-2 border-t border-dashed theme-line leading-relaxed animate-fadeSlide">
                          🇨🇿 {fact.cs}
                          {fact.details && (
                            <div className="mt-1 text-[11px] theme-muted">
                              💡 {fact.details}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-[11px] theme-muted mt-1.5 select-none">
                          Tap to reveal details
                        </div>
                      )}
                    </div>

                    {/* Quick action buttons */}
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center gap-1 flex-shrink-0"
                    >
                      <button
                        onClick={() => speakFact(fact)}
                        className={`p-1 theme-muted hover:theme-ink transition active:scale-90 ${
                          speakingFactId === fact.id ? 'theme-accent animate-pulse' : ''
                        }`}
                        title="Read aloud"
                      >
                        <Volume2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => copyFact(fact)}
                        className="p-1 theme-muted hover:theme-ink transition active:scale-90"
                        title="Copy"
                      >
                        {copiedFactId === fact.id ? (
                          <Check className="w-4 h-4 text-emerald-500" />
                        ) : (
                          <Share2 className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        onClick={() => toggleFavorite(fact.id)}
                        className={`p-1 theme-muted hover:text-amber-500 transition active:scale-90 ${
                          fact.favorite ? 'text-amber-500 fill-amber-500' : ''
                        }`}
                        title="Favorite"
                      >
                        <Star className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>
      )}

      {/* Main Screen: PROFILE */}
      {activeTab === 'profile' && (
        <section className="space-y-4 animate-fadeSlide">
          <div className="text-xs theme-muted my-2 flex items-center gap-2 font-semibold">
            <span>About you</span>
            <div className="flex-1 h-px theme-line-bg" />
          </div>

          <div>
            <label className="block text-xs font-semibold theme-muted mb-1.5">
              Name
            </label>
            <input
              type="text"
              value={profile.name}
              onChange={(e) => setProfile({ ...profile, name: e.target.value })}
              placeholder="Your name"
              className="w-full p-3 rounded-xl theme-panel2 text-sm theme-ink focus:outline-none border theme-line"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold theme-muted mb-1.5">
              Notes &amp; wishes
            </label>
            <textarea
              value={profile.notes}
              onChange={(e) => setProfile({ ...profile, notes: e.target.value })}
              placeholder="Write anything you want to remember or work toward..."
              rows={3}
              className="w-full p-3 rounded-xl theme-panel2 text-sm theme-ink focus:outline-none resize-none border theme-line"
            />
          </div>

          <div className="text-xs theme-muted pt-2 flex items-center gap-2 font-semibold">
            <span>Fact topics</span>
            <div className="flex-1 h-px theme-line-bg" />
          </div>

          {/* Topics selection chips (Built-in + Custom Topics + Add Button) */}
          <div className="flex flex-wrap gap-2">
            {/* Built-in topics */}
            {TOPICS.map((topic) => {
              const isSelected = profile.selectedTopics.includes(topic.id);
              return (
                <button
                  key={topic.id}
                  onClick={() => toggleTopicSelection(topic.id)}
                  className={`px-3 py-2 rounded-full border text-xs font-medium transition active:scale-95 flex items-center gap-1.5 cursor-pointer ${
                    isSelected
                      ? 'theme-accent-bg font-semibold shadow-xs border-transparent'
                      : 'theme-panel2 theme-ink opacity-70 hover:opacity-100'
                  }`}
                >
                  <AppleEmoji emoji={topic.emoji} size={18} />
                  <span>{topic.name}</span>
                </button>
              );
            })}

            {/* User Custom Topics */}
            {profile.customTopics?.map((ct) => {
              const isSelected = profile.selectedTopics.includes(ct.id);
              return (
                <div
                  key={ct.id}
                  className={`inline-flex items-center rounded-full border text-xs font-medium transition shadow-xs ${
                    isSelected
                      ? 'theme-accent-bg border-transparent'
                      : 'theme-panel2 theme-ink opacity-70 hover:opacity-100'
                  }`}
                >
                  <button
                    onClick={() => toggleTopicSelection(ct.id)}
                    className="pl-3 pr-1.5 py-2 flex items-center gap-1.5 cursor-pointer active:scale-95 transition"
                  >
                    <AppleEmoji emoji={ct.emoji} size={18} />
                    <span className="font-semibold">{ct.name}</span>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeCustomTopic(ct.id);
                    }}
                    className="pr-2.5 pl-1 py-2 text-[11px] opacity-60 hover:opacity-100 hover:text-red-400 transition cursor-pointer"
                    title={`Remove topic ${ct.name}`}
                  >
                    ✕
                  </button>
                </div>
              );
            })}

            {/* Add Custom Topic Button */}
            <button
              onClick={() => setIsAddCustomTopicModalOpen(true)}
              className="px-3.5 py-2 rounded-full border border-dashed border-[#2F6F5E]/60 text-[#2F6F5E] dark:text-[#4FA98A] bg-[#2F6F5E]/10 hover:bg-[#2F6F5E]/20 text-xs font-semibold transition active:scale-95 flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add custom topic</span>
            </button>
          </div>

          <div className="text-xs theme-muted pt-2 flex items-center gap-2 font-semibold">
            <span>Mobile App & Updates</span>
            <div className="flex-1 h-px theme-line-bg" />
          </div>

          <PWAInstallBanner />

          {/* Quick Manual Update Button for PWA */}
          <div className="p-3.5 rounded-2xl theme-panel2 border theme-line flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <RefreshCw className="w-4 h-4 text-[#2F6F5E] dark:text-[#4FA98A] flex-shrink-0" />
              <div>
                <div className="text-xs font-bold theme-ink">App Updates</div>
                <div className="text-[11px] theme-muted">The app updates automatically. Tap here to check immediately without losing any data.</div>
              </div>
            </div>
            <button
              disabled={isRefreshingApp}
              onClick={async () => {
                setIsRefreshingApp(true);
                await forceAppRefresh();
              }}
              className="px-3.5 py-1.5 rounded-xl theme-accent-bg text-white text-xs font-bold active:scale-95 transition cursor-pointer flex-shrink-0 flex items-center gap-1.5 disabled:opacity-75"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingApp ? 'animate-spin' : ''}`} />
              <span>{isRefreshingApp ? 'Updating...' : 'Update App'}</span>
            </button>
          </div>

          <div className="text-xs theme-muted pt-2 flex items-center gap-2 font-semibold">
            <span>Data Management</span>
            <div className="flex-1 h-px theme-line-bg" />
          </div>

          <div className="flex flex-col gap-1.5">
            <button
              onClick={() => {
                setConfirmDialog({
                  isOpen: true,
                  title: 'Erase all data?',
                  message:
                    'This will permanently erase all completed tasks, streaks, and unlocked facts on this device. Continue?',
                  danger: true,
                  onConfirm: () => {
                    localStorage.clear();
                    window.location.reload();
                  },
                });
              }}
              className="py-2.5 px-4 rounded-full border border-red-500/80 text-red-500 text-xs font-semibold hover:bg-red-500/10 active:scale-95 transition cursor-pointer text-left sm:text-center"
            >
              Erase all data on this device
            </button>
            <p className="text-[11px] theme-muted px-1">
              Note: To update the app to the latest version, you do not need to erase data — simply tap 'Update App' above.
            </p>
          </div>
        </section>
      )}

      {/* Floating Action Button with spring rotation */}
      {(activeTab === 'tasks' || activeTab === 'calendar') && (
        <button
          onClick={() => {
            if (activeTab === 'tasks') {
              setEditingHabit(null);
              setIsTaskModalOpen(true);
            } else {
              setEditingEvent(null);
              setEventModalInitialDate(selectedDate);
              setIsEventModalOpen(true);
            }
          }}
          className="fixed right-6 bottom-20 z-40 w-14 h-14 rounded-full theme-accent-bg shadow-2xl flex items-center justify-center font-light text-3xl transition-transform active:scale-90 active:rotate-90 select-none cursor-pointer"
          aria-label={activeTab === 'tasks' ? 'New task' : 'New calendar plan'}
        >
          +
        </button>
      )}

      {/* Bottom Navigation Dock with Sliding Bubble Pill & Frosted Glass (5 Tabs: Days, Calendar, Focus, Facts, Profile) */}
      <nav className="fixed left-0 right-0 bottom-0 glass-dock border-t z-30 flex pb-[env(safe-area-inset-bottom,0px)] shadow-2xl select-none">
        <div className="max-w-[540px] mx-auto w-full relative flex">
          {/* Sliding Pill Bubble */}
          <div
            className="absolute top-1.5 bottom-1.5 rounded-xl theme-panel2 transition-bubble z-0 border theme-line"
            style={{
              left: `${(tabIndex * 100) / 5}%`,
              width: `${100 / 5}%`,
            }}
          />

          {/* Tab 1: Days */}
          <div
            onClick={() => setActiveTab('tasks')}
            className={`flex-1 text-center py-2 px-0 cursor-pointer relative z-10 transition-colors duration-200 active:scale-95 ${
              activeTab === 'tasks' ? 'theme-accent font-bold' : 'theme-muted'
            }`}
          >
            <div className="flex justify-center">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-5 h-5"
              >
                <rect x="3.5" y="5" width="17" height="15" rx="3" />
                <path d="M3.5 9.5h17M8 3v3M16 3v3M8.5 14l2 2 4-4" />
              </svg>
            </div>
            <div className="text-[10px] font-semibold mt-0.5">Days</div>
          </div>

          {/* Tab 2: Calendar */}
          <div
            onClick={() => setActiveTab('calendar')}
            className={`flex-1 text-center py-2 px-0 cursor-pointer relative z-10 transition-colors duration-200 active:scale-95 ${
              activeTab === 'calendar' ? 'theme-accent font-bold' : 'theme-muted'
            }`}
          >
            <div className="flex justify-center relative">
              <Calendar className="w-5 h-5" />
              {calendarEvents.length > 0 && (
                <span className="absolute -top-0.5 right-4 w-1.5 h-1.5 rounded-full bg-amber-500" />
              )}
            </div>
            <div className="text-[10px] font-semibold mt-0.5">Calendar</div>
          </div>

          {/* Tab 3: Focus */}
          <div
            onClick={() => setActiveTab('focus')}
            className={`flex-1 text-center py-2 px-0 cursor-pointer relative z-10 transition-colors duration-200 active:scale-95 ${
              activeTab === 'focus' ? 'theme-accent font-bold' : 'theme-muted'
            }`}
          >
            <div className="flex justify-center relative">
              <Target className="w-5 h-5" />
            </div>
            <div className="text-[10px] font-semibold mt-0.5">Focus</div>
          </div>

          {/* Tab 4: Facts */}
          <div
            onClick={() => setActiveTab('facts')}
            className={`flex-1 text-center py-2 px-0 cursor-pointer relative z-10 transition-colors duration-200 active:scale-95 ${
              activeTab === 'facts' ? 'theme-accent font-bold' : 'theme-muted'
            }`}
          >
            <div className="flex justify-center relative">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-5 h-5"
              >
                <path d="M9 18h6M10 21h4M8.5 14.5C6.9 13.3 6 11.7 6 10a6 6 0 0112 0c0 1.7-.9 3.3-2.5 4.5-.7.5-1 1.2-1 2v.5h-5v-.5c0-.8-.3-1.5-1-2z" />
                <path d="M12 4V2.6M18.4 6.4l1-1M5.6 6.4l-1-1" />
              </svg>
              {earnedFacts.length > 0 && (
                <span className="absolute -top-0.5 right-6 w-1.5 h-1.5 rounded-full theme-accent-bg" />
              )}
            </div>
            <div className="text-[10px] font-semibold mt-0.5">Facts</div>
          </div>

          {/* Tab 5: Profile */}
          <div
            onClick={() => setActiveTab('profile')}
            className={`flex-1 text-center py-2 px-0 cursor-pointer relative z-10 transition-colors duration-200 active:scale-95 ${
              activeTab === 'profile' ? 'theme-accent font-bold' : 'theme-muted'
            }`}
          >
            <div className="flex justify-center">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-5 h-5"
              >
                <circle cx="12" cy="8.2" r="3.4" />
                <path d="M4.8 20c1.4-3.8 4.4-5.8 7.2-5.8s5.8 2 7.2 5.8" />
              </svg>
            </div>
            <div className="text-[10px] font-semibold mt-0.5">Profile</div>
          </div>
        </div>
      </nav>

      {/* Reward Fact Celebration Modal */}
      {rewardFact && (
        <RewardModal
          fact={rewardFact}
          taskName={rewardTaskName}
          onClose={() => setRewardFact(null)}
          onToggleFavorite={toggleFavorite}
        />
      )}

      {/* Task Creation & Editing Modal */}
      {isTaskModalOpen && (
        <TaskModal
          initialHabit={editingHabit}
          onSave={(savedHabit) => {
            if (editingHabit) {
              setHabits((prev) => prev.map((h) => (h.id === savedHabit.id ? savedHabit : h)));
            } else {
              setHabits((prev) => [...prev, savedHabit]);
            }
            setIsTaskModalOpen(false);
            setEditingHabit(null);
          }}
          onDelete={(id) => {
            setHabits((prev) => prev.filter((h) => h.id !== id));
            setIsTaskModalOpen(false);
            setEditingHabit(null);
          }}
          onClose={() => {
            setIsTaskModalOpen(false);
            setEditingHabit(null);
          }}
        />
      )}

      {/* Calendar Event Planning Modal */}
      {isEventModalOpen && (
        <EventModal
          initialDate={eventModalInitialDate}
          initialTime={eventModalInitialTime}
          initialEvent={editingEvent}
          onSave={handleSaveEvent}
          onDelete={handleDeleteEvent}
          onClose={() => {
            setIsEventModalOpen(false);
            setEditingEvent(null);
            setEventModalInitialTime(undefined);
          }}
        />
      )}

      {/* Confirm Action Dialog */}
      {confirmDialog.isOpen && (
        <ConfirmModal
          title={confirmDialog.title}
          message={confirmDialog.message}
          danger={confirmDialog.danger}
          onConfirm={() => {
            confirmDialog.onConfirm();
            setConfirmDialog({ ...confirmDialog, isOpen: false });
          }}
          onCancel={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
        />
      )}

      {/* Add Custom Topic Modal */}
      <AddCustomTopicModal
        isOpen={isAddCustomTopicModalOpen}
        onClose={() => setIsAddCustomTopicModalOpen(false)}
        onAddTopic={handleAddCustomTopic}
      />
      </div>
    </div>
  );
}
