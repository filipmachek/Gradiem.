import React, { useState } from 'react';
import { AppleEmoji } from './AppleEmoji';
import { X, Plus, Sparkles, Check } from 'lucide-react';

interface AddCustomTopicModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddTopic: (newTopic: { name: string; emoji: string }) => void;
}

const POPULAR_EMOJIS = [
  '🏎️', '🔬', '🏛️', '🪐', '🎨', '🎵', '🎬', '⚽',
  '🎮', '🤖', '💻', '🍕', '☕', '🧠', '💰', '🐾',
  '🌿', '✈️', '⚔️', '📖', '🏰', '🥋', '🧬', '⚡'
];

export const AddCustomTopicModal: React.FC<AddCustomTopicModalProps> = ({
  isOpen,
  onClose,
  onAddTopic,
}) => {
  const [topicName, setTopicName] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState('💡');

  if (!isOpen) return null;

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = topicName.trim();
    if (!trimmed) return;
    onAddTopic({
      name: trimmed,
      emoji: selectedEmoji.trim() || '💡',
    });
    setTopicName('');
    setSelectedEmoji('💡');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm animate-fadeIn">
      <div
        className="w-full max-w-md theme-panel rounded-3xl border theme-line shadow-2xl overflow-hidden animate-scaleUp max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b theme-line flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl theme-accent-bg flex items-center justify-center shadow-xs">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold font-serif theme-ink">
                Add Custom Topic
              </h2>
              <p className="text-[11px] theme-muted">
                Choose an emoji and any topic you're curious about
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full theme-panel2 flex items-center justify-center theme-muted hover:text-ink transition cursor-pointer active:scale-95"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
          {/* Emoji Selection */}
          <div>
            <label className="block text-xs font-semibold theme-ink mb-1.5">
              1. Choose an emoji for your topic
            </label>
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-2xl theme-panel2 border theme-line flex items-center justify-center flex-shrink-0 shadow-inner">
                <AppleEmoji emoji={selectedEmoji} size={30} />
              </div>
              <div className="flex-1">
                <input
                  type="text"
                  value={selectedEmoji}
                  onChange={(e) => setSelectedEmoji(e.target.value.trim() || '💡')}
                  placeholder="Type or paste any emoji..."
                  maxLength={4}
                  className="w-full px-3 py-2 rounded-xl theme-panel2 border theme-line text-xs theme-ink focus:outline-none"
                />
                <span className="text-[10px] theme-muted mt-1 block">
                  Or pick from popular favorites below:
                </span>
              </div>
            </div>

            {/* Emoji Quick-pick Grid */}
            <div className="mt-2.5 p-2 rounded-2xl theme-panel2/60 border theme-line flex flex-wrap gap-1.5 justify-center max-h-24 overflow-y-auto no-scrollbar">
              {POPULAR_EMOJIS.map((emoji) => (
                <button
                  type="button"
                  key={emoji}
                  onClick={() => setSelectedEmoji(emoji)}
                  className={`w-8 h-8 rounded-xl flex items-center justify-center transition active:scale-90 cursor-pointer ${
                    selectedEmoji === emoji
                      ? 'theme-accent-bg shadow-xs scale-105'
                      : 'hover:bg-white/10 dark:hover:bg-white/5'
                  }`}
                >
                  <AppleEmoji emoji={emoji} size={18} />
                </button>
              ))}
            </div>
          </div>

          {/* Topic Name Input */}
          <div>
            <label className="block text-xs font-semibold theme-ink mb-1.5">
              2. Topic name
            </label>
            <input
              type="text"
              autoFocus
              value={topicName}
              onChange={(e) => setTopicName(e.target.value)}
              placeholder="e.g. Formula 1, Quantum Physics, Marvel..."
              className="w-full px-3.5 py-2.5 rounded-xl theme-panel2 border theme-line text-xs sm:text-sm theme-ink focus:outline-none font-medium"
              maxLength={40}
            />
          </div>


          {/* Explanation */}
          <div className="p-3 rounded-xl bg-[#2F6F5E]/10 border border-[#2F6F5E]/20 text-[11px] text-[#2F6F5E] dark:text-[#4FA98A] flex items-start gap-2">
            <Sparkles className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>
              This topic will be added to your selected pool. When you complete habits or focus sessions, AI will curate authentic facts for it.
            </span>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl theme-panel2 theme-muted text-xs font-semibold transition active:scale-95 cursor-pointer hover:text-ink"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!topicName.trim()}
              className={`px-5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                topicName.trim()
                  ? 'theme-accent-bg text-white shadow-md active:scale-95'
                  : 'opacity-40 bg-gray-500 text-white cursor-not-allowed'
              }`}
            >
              <Check className="w-4 h-4" />
              <span>Add Topic</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
