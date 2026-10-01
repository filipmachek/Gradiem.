export interface Habit {
  id: string;
  name: string;
  category: string;
  icon: string;
  color: string;
  timesPerDay: number;
  days: number[]; // 0 = Sun, 1 = Mon, ..., 6 = Sat
  type: 'check' | 'timer';
  minutes?: number;
}

export type CompletionsMap = Record<string, Record<string, number>>;

export interface EarnedFact {
  id: string;
  emoji: string;
  topic: string;
  en: string;
  cs: string;
  details?: string;
  earnedAt: string;
  source: 'gemini' | 'pool';
  favorite?: boolean;
}

export interface CustomTopic {
  id: string;
  name: string;
  emoji: string;
}

export interface UserProfile {
  name: string;
  notes: string;
  selectedTopics: string[];
  customTopics: CustomTopic[];
  focusStats?: {
    totalMinutes: number;
    sessionsCompleted: number;
  };
}

export interface TopicDefinition {
  emoji: string;
  id: string;
  name: string;
  description: string;
}

export type CalendarEventType =
  | 'work'
  | 'school'
  | 'task'
  | 'test'
  | 'personal'
  | 'vacation'
  | 'doctor'
  | 'health';

export interface CalendarEvent {
  id: string;
  title: string;
  category: CalendarEventType;
  startDate: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD for multi-day vacations or trips
  time?: string; // e.g. "09:00" or empty for all-day
  endTime?: string; // e.g. "10:00"
  emoji?: string;
  color: string;
  notes?: string;
  completed?: boolean;
  createdAt: string;
}

