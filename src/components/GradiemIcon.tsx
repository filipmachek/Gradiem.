import React from 'react';
import {
  Droplets,
  BookOpen,
  Smile,
  Activity,
  Code,
  Apple,
  Coffee,
  Moon,
  Music,
  FileText,
  Shield,
  Trophy,
  Tent,
  Car,
  Cake,
  Feather,
  Scroll,
  Scale,
  Type,
  Orbit,
  Dna,
  Brain,
  Cpu,
  Compass,
  Utensils,
  Lightbulb,
  GraduationCap,
  Plane,
  Target,
  Briefcase,
  HeartPulse,
  Sun,
  Mountain,
  Library,
  FlaskConical,
  PartyPopper,
  Stethoscope,
  Pizza,
  Sprout,
  Star,
  CheckCircle2,
  Calendar,
  Clock,
  Sparkles,
  Palette,
  Zap,
  Bike,
  PenTool,
} from 'lucide-react';

export interface GradiemIconProps {
  emoji: string;
  size?: number | string;
  className?: string;
  alt?: string;
}

interface BadgeConfig {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  bg: string; // Solid opaque background color
  fg?: string; // Icon color (default: white)
}

// Master map of all emojis to handcrafted opaque badge configurations
const ICON_REGISTRY: Record<string, BadgeConfig> = {
  // Habit icons
  '💧': { icon: Droplets, bg: '#1B6B93' },
  '📖': { icon: BookOpen, bg: '#B36B22' },
  '🧘': { icon: Smile, bg: '#485596' },
  '🏃': { icon: Activity, bg: '#B54929' },
  '💻': { icon: Code, bg: '#2B3A4A' },
  '🥗': { icon: Apple, bg: '#25704E' },
  '☕': { icon: Coffee, bg: '#6B4226' },
  '💤': { icon: Moon, bg: '#1C2744' },
  '🎸': { icon: Music, bg: '#6B3A99' },
  '📝': { icon: FileText, bg: '#8A5529' },
  '🦷': { icon: Shield, bg: '#1F7A78' },
  '⚽': { icon: Trophy, bg: '#28754A' },
  '⛺': { icon: Tent, bg: '#366838' },
  '🚗': { icon: Car, bg: '#385375' },
  '🎂': { icon: Cake, bg: '#9E2A34' },
  '🌿': { icon: Sprout, bg: '#25704E' },
  '✍️': { icon: PenTool, bg: '#8A5529' },
  '🎨': { icon: Palette, bg: '#783A70' },
  '🧹': { icon: Sparkles, bg: '#485596' },
  '☀️': { icon: Sun, bg: '#D97706' },
  '🚴': { icon: Bike, bg: '#1B6B93' },
  '⚡': { icon: Zap, bg: '#E5933A' },
  '🍵': { icon: Coffee, bg: '#25704E' },

  // Topics & Fact Categories
  '🦉': { icon: Feather, bg: '#1E5E41' },
  '📜': { icon: Scroll, bg: '#8A5D27' },
  '⚖️': { icon: Scale, bg: '#784624' },
  '🔤': { icon: Type, bg: '#2B5E7D' },
  '🌌': { icon: Orbit, bg: '#1E2C5A' },
  '🧬': { icon: Dna, bg: '#226B5D' },
  '🧠': { icon: Brain, bg: '#783A70' },
  '🗺️': { icon: Compass, bg: '#36633D' },
  '🍽️': { icon: Utensils, bg: '#965529' },
  '💡': { icon: Lightbulb, bg: '#9E7A1C' },

  // Calendar & Plans
  '🎓': { icon: GraduationCap, bg: '#B56417' },
  '✈️': { icon: Plane, bg: '#2563EB' },
  '🎯': { icon: Target, bg: '#0D8A58' },
  '💼': { icon: Briefcase, bg: '#6D38C7' },
  '🏥': { icon: HeartPulse, bg: '#C22B69' },
  '🏖️': { icon: Sun, bg: '#0284C7' },
  '⛰️': { icon: Mountain, bg: '#475569' },
  '📚': { icon: Library, bg: '#9A5825' },
  '🧪': { icon: FlaskConical, bg: '#6D28D9' },
  '🎉': { icon: PartyPopper, bg: '#D946EF' },
  '🩺': { icon: Stethoscope, bg: '#0F766E' },
  '🍕': { icon: Pizza, bg: '#D97706' },
  '🌱': { icon: Sprout, bg: '#25704E' },
  '⭐': { icon: Star, bg: '#D97706' },
  '📅': { icon: Calendar, bg: '#2563EB' },
};

// Deterministic opaque palette for arbitrary custom emojis
const FALLBACK_PALETTES = [
  '#2F6F5E',
  '#B36B22',
  '#1B6B93',
  '#485596',
  '#783A70',
  '#25704E',
  '#B54929',
  '#385375',
];

function getDeterministicColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  const idx = Math.abs(hash) % FALLBACK_PALETTES.length;
  return FALLBACK_PALETTES[idx];
}

export const GradiemIcon: React.FC<GradiemIconProps> = ({
  emoji,
  size = 22,
  className = '',
  alt,
}) => {
  if (!emoji) return null;

  const rawEmoji = emoji.trim();
  const numSize = typeof size === 'number' ? size : parseInt(size as string, 10) || 22;
  const config = ICON_REGISTRY[rawEmoji];

  // Optical padding and glyph scaling:
  // Container is numSize x numSize, icon is ~58% of container
  const iconPx = Math.max(10, Math.round(numSize * 0.58));
  const borderRadius = Math.max(4, Math.round(numSize * 0.28));

  if (config) {
    const IconComponent = config.icon;
    return (
      <span
        role="img"
        aria-label={alt || rawEmoji}
        style={{
          width: `${numSize}px`,
          height: `${numSize}px`,
          backgroundColor: config.bg,
          borderRadius: `${borderRadius}px`,
        }}
        className={`inline-flex items-center justify-center flex-shrink-0 select-none align-middle pointer-events-none border border-black/10 dark:border-white/15 shadow-xs transition-transform duration-150 ${className}`}
      >
        <IconComponent
          className="text-white drop-shadow-xs"
          style={{ width: `${iconPx}px`, height: `${iconPx}px` }}
        />
      </span>
    );
  }

  // Fallback for custom user emojis: render in matching solid opaque badge
  const fallbackBg = getDeterministicColor(rawEmoji);
  return (
    <span
      role="img"
      aria-label={alt || rawEmoji}
      style={{
        width: `${numSize}px`,
        height: `${numSize}px`,
        backgroundColor: fallbackBg,
        borderRadius: `${borderRadius}px`,
        fontSize: `${Math.round(numSize * 0.55)}px`,
      }}
      className={`inline-flex items-center justify-center flex-shrink-0 select-none align-middle pointer-events-none text-white font-medium border border-black/10 dark:border-white/15 shadow-xs ${className}`}
    >
      {rawEmoji}
    </span>
  );
};

// Re-export as AppleEmoji so every component in the project instantly uses this opaque design
export const AppleEmoji = GradiemIcon;
