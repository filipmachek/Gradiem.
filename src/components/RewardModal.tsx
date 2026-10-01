import React, { useState } from 'react';
import { EarnedFact } from '../types';
import { Sparkles, X, Volume2, Share2, Check, Star } from 'lucide-react';
import { AppleEmoji } from './AppleEmoji';

interface RewardModalProps {
  fact: EarnedFact;
  taskName: string;
  onClose: () => void;
  onToggleFavorite: (id: string) => void;
}

export const RewardModal: React.FC<RewardModalProps> = ({
  fact,
  taskName,
  onClose,
  onToggleFavorite,
}) => {
  const [showCzech, setShowCzech] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const speakFact = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const textToSpeak = showCzech ? fact.cs : fact.en;
      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      utterance.lang = showCzech ? 'cs-CZ' : 'en-US';
      utterance.rate = 0.95;
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      setIsSpeaking(true);
      window.speechSynthesis.speak(utterance);
    }
  };

  const copyFact = () => {
    const text = `${fact.emoji} ${fact.en}\n\n(🇨🇿 ${fact.cs})\n— DayByDay`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-3xl theme-panel p-6 shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Decorative background glow */}
        <div className="absolute -top-16 -right-16 w-44 h-44 rounded-full bg-[#4FA98A]/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-44 h-44 rounded-full bg-[#D9A05B]/15 blur-3xl pointer-events-none" />

        {/* Top Header */}
        <div className="flex items-center justify-between mb-4 relative z-10">
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-[#4FA98A]/20 theme-accent">
              <Sparkles className="w-4 h-4" />
            </span>
            <div>
              <span className="text-xs uppercase tracking-wider font-semibold theme-accent">
                Task completed!
              </span>
              <h4 className="text-xs theme-muted truncate max-w-[200px]">
                {taskName}
              </h4>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full theme-muted hover:opacity-80 transition cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Fact Card */}
        <div
          onClick={() => setShowCzech(!showCzech)}
          className="p-4 rounded-2xl theme-panel2 my-3 relative z-10 cursor-pointer transition hover:opacity-95"
        >
          <div className="flex items-center justify-between gap-2 mb-2.5">
            <div className="flex items-center gap-2">
              <AppleEmoji emoji={fact.emoji} size={28} />
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full theme-accent-bg">
                {fact.topic}
              </span>
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite(fact.id);
              }}
              className={`p-1.5 rounded-full transition ${
                fact.favorite ? 'text-amber-500 fill-amber-500' : 'theme-muted hover:text-amber-500'
              }`}
              title="Favorite fact"
            >
              <Star className="w-4 h-4" />
            </button>
          </div>

          {/* Primary English fact */}
          <p className="text-sm font-medium leading-relaxed theme-ink">
            {fact.en}
          </p>

          {/* Czech translation reveals on tap */}
          {showCzech ? (
            <div className="mt-2.5 pt-2.5 border-t border-dashed theme-line text-xs text-[#D9A05B] leading-relaxed">
              🇨🇿 {fact.cs}
              {fact.details && <div className="mt-1 theme-muted">💡 {fact.details}</div>}
            </div>
          ) : (
            <div className="mt-2.5 text-[11px] theme-muted italic">
              Tap for translation & details
            </div>
          )}

          {/* Action buttons inside card */}
          <div
            onClick={(e) => e.stopPropagation()}
            className="mt-3 pt-2.5 flex items-center justify-between border-t theme-line"
          >
            <span className="text-xs font-semibold theme-accent">
              {showCzech ? 'Hide details' : 'Tap card for details'}
            </span>

            <div className="flex items-center gap-1">
              <button
                onClick={speakFact}
                className={`p-1.5 rounded-lg theme-muted hover:theme-ink transition ${
                  isSpeaking ? 'theme-accent animate-pulse' : ''
                }`}
                title="Read aloud"
              >
                <Volume2 className="w-4 h-4" />
              </button>
              <button
                onClick={copyFact}
                className="p-1.5 rounded-lg theme-muted hover:theme-ink transition"
                title="Copy fact"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex gap-2 mt-4 relative z-10">
          <button
            onClick={onClose}
            className="flex-1 py-3 px-4 rounded-xl theme-accent-bg text-xs font-semibold shadow-md active:scale-98 transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Continue</span>
          </button>
        </div>
      </div>
    </div>
  );
};
