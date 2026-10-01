import React, { useEffect, useState } from 'react';

interface SplashScreenProps {
  onFinish: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
  // Choreography requested by user:
  // 1. Starts as "GD." in Fraunces serif font
  // 2. "GD." unfolds smoothly into "Gradiem."
  // 3. Tagline "Remember. You live." types out letter-by-letter
  // 4. Pure vector checkmark (✓) snaps in
  // 5. Mega smooth dissolution into the app
  const [isExpanded, setIsExpanded] = useState(false);
  const [tagline, setTagline] = useState('');
  const [showCheckmark, setShowCheckmark] = useState(false);
  const [fadingOut, setFadingOut] = useState(false);
  const [isDone, setIsDone] = useState(false);

  useEffect(() => {
    const fullTagline = 'Remember. You live.';
    let charIndex = 0;
    let typingInterval: any = null;

    // Step 1: At 650ms, "GD." unfolds smoothly into "Gradiem."
    const expandTimer = setTimeout(() => {
      setIsExpanded(true);
    }, 650);

    // Step 2: At 1400ms, start progressively typing the tagline
    const typingStartTimer = setTimeout(() => {
      typingInterval = setInterval(() => {
        charIndex++;
        setTagline(fullTagline.slice(0, charIndex));
        if (charIndex >= fullTagline.length) {
          clearInterval(typingInterval);
        }
      }, 42);
    }, 1400);

    // Step 3: At 2450ms, snap in the pure clean checkmark
    const checkTimer = setTimeout(() => {
      setShowCheckmark(true);
    }, 2450);

    // Step 4: At 3300ms, start ultra-smooth fade out
    const fadeTimer = setTimeout(() => {
      setFadingOut(true);
    }, 3300);

    // Step 5: Finish and unmount splash
    const doneTimer = setTimeout(() => {
      setIsDone(true);
      onFinish();
    }, 3950);

    return () => {
      clearTimeout(expandTimer);
      clearTimeout(typingStartTimer);
      if (typingInterval) clearInterval(typingInterval);
      clearTimeout(checkTimer);
      clearTimeout(fadeTimer);
      clearTimeout(doneTimer);
    };
  }, [onFinish]);

  if (isDone) return null;

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center bg-[#0C100E] text-[#F0F6F2] pointer-events-none select-none overflow-hidden transition-all duration-700 ease-[cubic-bezier(0.25,1,0.5,1)] ${
        fadingOut ? 'opacity-0 scale-[1.03] blur-[3px]' : 'opacity-100 scale-100 blur-0'
      }`}
    >
      {/* Ambient background glow */}
      <div className="absolute w-[500px] h-[500px] rounded-full bg-[#2F6F5E]/20 blur-[130px] pointer-events-none" />

      {/* Main typographic logo composition - using Fraunces font */}
      <div className="relative flex flex-col items-center justify-center text-center px-4 w-full max-w-sm mx-auto">
        <div className="relative inline-flex items-center justify-center">
          <h1 className="font-['Fraunces',Georgia,serif] text-5xl sm:text-6xl font-bold tracking-tight text-white drop-shadow-md flex items-baseline justify-center select-none">
            {/* The initial 'G' */}
            <span className="inline-block leading-none">G</span>

            {/* The 'ra' that expands between 'G' and 'd' with preserved font baseline */}
            <span
              className={`inline-block overflow-hidden align-baseline transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                isExpanded ? 'max-w-[75px] opacity-100' : 'max-w-0 opacity-0'
              }`}
            >
              <span className="inline-block leading-none">ra</span>
            </span>

            {/* The 'D' / 'd' */}
            <span className="inline-block leading-none transition-transform duration-300">
              {isExpanded ? 'd' : 'D'}
            </span>

            {/* The 'iem' that expands after 'd' with preserved font baseline */}
            <span
              className={`inline-block overflow-hidden align-baseline transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                isExpanded ? 'max-w-[125px] opacity-100' : 'max-w-0 opacity-0'
              }`}
            >
              <span className="inline-block leading-none">iem</span>
            </span>

            {/* The green dot that glides along */}
            <span className="text-[#4FA98A] font-['Fraunces',Georgia,serif] ml-0.5 inline-block leading-none">
              .
            </span>
          </h1>

          {/* Pure vector checkmark (✓) smoothly aligned without disrupting word centering */}
          <div
            className={`absolute -right-9 sm:-right-11 top-1/2 -translate-y-1/2 flex items-center justify-center transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
              showCheckmark
                ? 'opacity-100 scale-100'
                : 'opacity-0 scale-50 pointer-events-none'
            }`}
          >
            <svg
              viewBox="0 0 24 24"
              className="w-7 h-7 sm:w-9 sm:h-9 text-[#4FA98A]"
              style={{ background: 'none', border: 'none', outline: 'none', filter: 'none' }}
            >
              <path
                d="M5 13l4 4L19 7"
                fill="none"
                stroke="#4FA98A"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>

        {/* Progressively typed tagline: "Remember. You live." - centered and perfectly balanced */}
        <div className="mt-5 min-h-[1.75rem] flex items-center justify-center text-center w-full">
          <p className="text-[12px] sm:text-[13px] tracking-[0.28em] uppercase font-semibold text-[#A3B8AD] flex items-center justify-center text-center drop-shadow-xs">
            <span>{tagline}</span>
            {tagline.length > 0 && tagline.length < 19 && (
              <span className="inline-block w-1.5 h-3.5 bg-[#4FA98A] ml-1.5 animate-pulse rounded-full" />
            )}
          </p>
        </div>
      </div>
    </div>
  );
};
