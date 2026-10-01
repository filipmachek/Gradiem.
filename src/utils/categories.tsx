import React from 'react';
import { CalendarEventType } from '../types';
import {
  Briefcase,
  GraduationCap,
  CheckSquare,
  FileText,
  Calendar,
  Plane,
  HeartPulse,
} from 'lucide-react';

export interface CategoryInfo {
  type: CalendarEventType;
  label: string;
  color: string;
  bgLight: string;
  borderLight: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const CATEGORIES: CategoryInfo[] = [
  {
    type: 'work',
    label: 'Práce',
    color: '#4F46E5', // Indigo
    bgLight: 'rgba(79, 70, 229, 0.12)',
    borderLight: 'rgba(79, 70, 229, 0.3)',
    icon: Briefcase,
  },
  {
    type: 'school',
    label: 'Škola rozvrh',
    color: '#0284C7', // Sky Blue
    bgLight: 'rgba(2, 132, 199, 0.12)',
    borderLight: 'rgba(2, 132, 199, 0.3)',
    icon: GraduationCap,
  },
  {
    type: 'task',
    label: 'Úkol',
    color: '#10B981', // Emerald
    bgLight: 'rgba(16, 185, 129, 0.12)',
    borderLight: 'rgba(16, 185, 129, 0.3)',
    icon: CheckSquare,
  },
  {
    type: 'test',
    label: 'Test',
    color: '#F59E0B', // Amber
    bgLight: 'rgba(245, 158, 11, 0.12)',
    borderLight: 'rgba(245, 158, 11, 0.3)',
    icon: FileText,
  },
  {
    type: 'personal',
    label: 'Osobní akce',
    color: '#8B5CF6', // Purple
    bgLight: 'rgba(139, 92, 246, 0.12)',
    borderLight: 'rgba(139, 92, 246, 0.3)',
    icon: Calendar,
  },
  {
    type: 'vacation',
    label: 'Dovolená',
    color: '#F43F5E', // Rose
    bgLight: 'rgba(244, 63, 94, 0.12)',
    borderLight: 'rgba(244, 63, 94, 0.3)',
    icon: Plane,
  },
  {
    type: 'doctor',
    label: 'Doktor',
    color: '#0D9488', // Teal
    bgLight: 'rgba(13, 148, 136, 0.12)',
    borderLight: 'rgba(13, 148, 136, 0.3)',
    icon: HeartPulse,
  },
];

export function getCategoryInfo(type: CalendarEventType | string): CategoryInfo {
  const normalized = type === 'health' ? 'doctor' : type;
  const found = CATEGORIES.find((c) => c.type === normalized);
  return found || CATEGORIES[0];
}
