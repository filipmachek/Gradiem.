import React, { useState, useEffect, useMemo, useRef } from 'react';
import { TravelerJourney } from './TravelerJourney';
import { focusAlerts } from '../services/ambientAudio';
import {
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  Flame,
  Coffee,
  X,
  Sparkles,
  Droplets,
  Smile,
  Eye,
  Wind,
  Bell,
  Check,
  Compass,
} from 'lucide-react';

interface FocusHubProps {
  onSessionComplete: (durationMinutes: number, intention: string) => void;
  stats?: {
    totalMinutes: number;
    sessionsCompleted: number;
  };
  theme?: 'day' | 'night';
}

const PRESET_DURATIONS = [
  { label: '15m', minutes: 15 },
  { label: '25m', minutes: 25 },
  { label: '45m', minutes: 45 },
  { label: '60m', minutes: 60 },
  { label: '90m', minutes: 90 },
];

const INTENTIONS = ['Exam Study', 'Reading', 'Deep Work', 'Coding', 'Writing', 'Project Prep'];

const NUDGES = [
  {
    icon: Droplets,
    color: 'text-sky-400 bg-sky-500/10 border-sky-500/20',
    title: 'Mindful Hydration',
    text: 'Take a slow sip of water. Hydration boosts focus and memory.',
  },
  {
    icon: Smile,
    color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    title: 'Body Check',
    text: 'Drop your shoulders, unclamp your jaw, and loosen your neck.',
  },
  {
    icon: Eye,
    color: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    title: '20-20-20 Eye Rest',
    text: 'Glance at something 20 feet away for 20 seconds to ease eye strain.',
  },
  {
    icon: Wind,
    color: 'text-teal-400 bg-teal-500/10 border-teal-500/20',
    title: 'Deep Breath',
    text: 'Inhale deeply for 4 seconds... hold for 2... and let it all go.',
  },
];

type PhaseType = 'focus' | 'break';

interface TimelineBlock {
  type: PhaseType;
  durationSeconds: number;
  label: string;
}

const SESSION_STORAGE_KEY = 'gradiem_active_focus_session';

export const FocusHub: React.FC<FocusHubProps> = ({
  onSessionComplete,
  stats = { totalMinutes: 0, sessionsCompleted: 0 },
  theme = 'night',
}) => {
  // Configuration state
  const [totalMinutes, setTotalMinutes] = useState(25);
  const [numBreaks, setNumBreaks] = useState(0); // 0, 1, 2, 3
  const [breakLengthMinutes, setBreakLengthMinutes] = useState(5);
  const [intention, setIntention] = useState('Deep Work');
  const [isDndDismissed, setIsDndDismissed] = useState(false);

  // Active session state
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isZenMode, setIsZenMode] = useState(false); // hides numbers to reduce clock anxiety
  const [activeBlockIndex, setActiveBlockIndex] = useState(0);
  const [secondsRemainingInBlock, setSecondsRemainingInBlock] = useState(25 * 60);
  const [totalElapsedSeconds, setTotalElapsedSeconds] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [bannerAlert, setBannerAlert] = useState<{ title: string; subtitle: string; isBreak: boolean } | null>(null);

  // Micro-nudge state
  const [activeNudge, setActiveNudge] = useState<typeof NUDGES[0] | null>(null);
  const lastNudgeTimeRef = useRef<number>(0);

  // WALL-CLOCK TIMEKEEPING REFS (Immune to phone screen lock & backgrounding)
  const runAnchorTimeRef = useRef<number>(Date.now());
  const accumulatedSecondsRef = useRef<number>(0);

  const isRunningRef = useRef(isRunning);
  isRunningRef.current = isRunning;

  const isPausedRef = useRef(isPaused);
  isPausedRef.current = isPaused;

  const activeBlockIndexRef = useRef(activeBlockIndex);
  activeBlockIndexRef.current = activeBlockIndex;

  const totalMinutesRef = useRef(totalMinutes);
  totalMinutesRef.current = totalMinutes;

  const intentionRef = useRef(intention);
  intentionRef.current = intention;

  // Generate blocks based on total duration and breaks
  const timelineBlocks = useMemo<TimelineBlock[]>(() => {
    if (numBreaks === 0) {
      return [{ type: 'focus', durationSeconds: totalMinutes * 60, label: 'Deep Focus' }];
    }
    const numFocusBlocks = numBreaks + 1;
    const focusMinutesPerBlock = Math.max(1, Math.round(totalMinutes / numFocusBlocks));
    const blocks: TimelineBlock[] = [];

    for (let i = 0; i < numFocusBlocks; i++) {
      blocks.push({
        type: 'focus',
        durationSeconds: focusMinutesPerBlock * 60,
        label: `Trek Block ${i + 1}/${numFocusBlocks}`,
      });
      if (i < numBreaks) {
        blocks.push({
          type: 'break',
          durationSeconds: breakLengthMinutes * 60,
          label: `Camp Rest (${breakLengthMinutes}m)`,
        });
      }
    }
    return blocks;
  }, [totalMinutes, numBreaks, breakLengthMinutes]);

  const timelineBlocksRef = useRef<TimelineBlock[]>(timelineBlocks);
  timelineBlocksRef.current = timelineBlocks;

  // Overall session total seconds
  const totalSessionSeconds = useMemo(() => {
    return timelineBlocks.reduce((acc, b) => acc + b.durationSeconds, 0);
  }, [timelineBlocks]);

  const totalSessionSecondsRef = useRef<number>(totalSessionSeconds);
  totalSessionSecondsRef.current = totalSessionSeconds;

  // Total session progress (0 to 100)
  const totalSessionProgress = useMemo(() => {
    if (totalSessionSeconds <= 0) return 0;
    return Math.min(100, Math.max(0, (totalElapsedSeconds / totalSessionSeconds) * 100));
  }, [totalElapsedSeconds, totalSessionSeconds]);

  // Wall-clock synchronization function:
  // Dynamically computes exact real-world seconds elapsed regardless of screen lock
  const syncTimerState = () => {
    if (!isRunningRef.current) return;
    if (isPausedRef.current) return;

    const now = Date.now();
    const currentRunDelta = Math.max(0, Math.floor((now - runAnchorTimeRef.current) / 1000));
    const totalElapsed = accumulatedSecondsRef.current + currentRunDelta;

    const totalTarget = totalSessionSecondsRef.current;
    const blocks = timelineBlocksRef.current;

    // Trigger mindful micro-nudge every 7 minutes (420s)
    if (totalElapsed - lastNudgeTimeRef.current >= 420) {
      lastNudgeTimeRef.current = totalElapsed;
      const randomNudge = NUDGES[Math.floor(Math.random() * NUDGES.length)];
      setActiveNudge(randomNudge);
      setTimeout(() => {
        setActiveNudge(null);
      }, 14000);
    }

    if (totalElapsed >= totalTarget) {
      // Entire session complete!
      localStorage.removeItem(SESSION_STORAGE_KEY);
      focusAlerts.playCompletionFanfare();
      setIsRunning(false);
      setIsFinished(true);
      setTotalElapsedSeconds(totalTarget);
      setSecondsRemainingInBlock(0);
      onSessionComplete(totalMinutesRef.current, intentionRef.current);
      return;
    }

    // Determine current block in timeline
    let rem = totalElapsed;
    let targetIndex = 0;
    let secInBlock = blocks[0]?.durationSeconds || 0;

    for (let i = 0; i < blocks.length; i++) {
      const bDur = blocks[i].durationSeconds;
      if (rem < bDur) {
        targetIndex = i;
        secInBlock = bDur - rem;
        break;
      }
      rem -= bDur;
    }

    if (targetIndex !== activeBlockIndexRef.current) {
      const newBlock = blocks[targetIndex];
      if (newBlock.type === 'break') {
        focusAlerts.playBreakAlert();
        setBannerAlert({
          title: 'Break Time! Step Away & Rest',
          subtitle: 'The traveler is resting by the campfire. Take a break, stretch, and relax.',
          isBreak: true,
        });
      } else {
        focusAlerts.playFocusAlert();
        setBannerAlert({
          title: 'Break Finished — Back on the Trail!',
          subtitle: 'Settle back in and resume walking toward your goal.',
          isBreak: false,
        });
      }
      activeBlockIndexRef.current = targetIndex;
      setActiveBlockIndex(targetIndex);
    }

    setTotalElapsedSeconds(totalElapsed);
    setSecondsRemainingInBlock(secInBlock);

    // Save session checkpoint to localStorage
    try {
      localStorage.setItem(
        SESSION_STORAGE_KEY,
        JSON.stringify({
          isRunning: true,
          isPaused: false,
          runAnchorTime: runAnchorTimeRef.current,
          accumulatedSeconds: accumulatedSecondsRef.current,
          totalMinutes: totalMinutesRef.current,
          intention: intentionRef.current,
          numBreaks,
          breakLengthMinutes,
        })
      );
    } catch {
      // ignore
    }
  };

  // Restore session from localStorage if user refreshed or background killed app
  useEffect(() => {
    try {
      const saved = localStorage.getItem(SESSION_STORAGE_KEY);
      if (saved) {
        const data = JSON.parse(saved);
        if (data.isRunning && data.runAnchorTime) {
          runAnchorTimeRef.current = data.runAnchorTime;
          accumulatedSecondsRef.current = data.accumulatedSeconds || 0;
          if (data.totalMinutes) setTotalMinutes(data.totalMinutes);
          if (data.intention) setIntention(data.intention);
          if (typeof data.numBreaks === 'number') setNumBreaks(data.numBreaks);
          if (data.breakLengthMinutes) setBreakLengthMinutes(data.breakLengthMinutes);
          setIsRunning(true);
          setIsPaused(Boolean(data.isPaused));
          setTimeout(syncTimerState, 50);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  // Listen to mobile phone screen lock/unlock & visibilitychange events
  useEffect(() => {
    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible') {
        syncTimerState();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityOrFocus);
    window.addEventListener('focus', handleVisibilityOrFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      window.removeEventListener('focus', handleVisibilityOrFocus);
    };
  }, []);

  // Main countdown timer interval: runs every 500ms and syncs with wall-clock time
  useEffect(() => {
    if (!isRunning || isPaused) return;

    const timer = setInterval(() => {
      syncTimerState();
    }, 500);

    return () => clearInterval(timer);
  }, [isRunning, isPaused]);

  // Start session (immediate user gesture context unlock)
  const startSession = () => {
    focusAlerts.ensureContext();
    focusAlerts.playSoftBeep('high');
    const now = Date.now();
    runAnchorTimeRef.current = now;
    accumulatedSecondsRef.current = 0;
    activeBlockIndexRef.current = 0;
    lastNudgeTimeRef.current = 0;

    setActiveBlockIndex(0);
    setSecondsRemainingInBlock(timelineBlocks[0].durationSeconds);
    setTotalElapsedSeconds(0);
    setBannerAlert(null);
    setIsPaused(false);
    setIsRunning(true);
    setIsFinished(false);

    try {
      localStorage.setItem(
        SESSION_STORAGE_KEY,
        JSON.stringify({
          isRunning: true,
          isPaused: false,
          runAnchorTime: now,
          accumulatedSeconds: 0,
          totalMinutes,
          intention,
          numBreaks,
          breakLengthMinutes,
        })
      );
    } catch {
      // ignore
    }
  };

  // Toggle Pause / Resume
  const togglePause = () => {
    focusAlerts.ensureContext();
    const now = Date.now();

    if (!isPaused) {
      // PAUSING: Save seconds elapsed in current run segment into accumulated
      focusAlerts.playSoftBeep('low');
      const segmentSeconds = Math.max(0, Math.floor((now - runAnchorTimeRef.current) / 1000));
      accumulatedSecondsRef.current += segmentSeconds;
      setIsPaused(true);

      try {
        localStorage.setItem(
          SESSION_STORAGE_KEY,
          JSON.stringify({
            isRunning: true,
            isPaused: true,
            runAnchorTime: now,
            accumulatedSeconds: accumulatedSecondsRef.current,
            totalMinutes,
            intention,
            numBreaks,
            breakLengthMinutes,
          })
        );
      } catch {
        // ignore
      }
    } else {
      // RESUMING: Set new anchor time
      focusAlerts.playSoftBeep('high');
      runAnchorTimeRef.current = now;
      setIsPaused(false);

      try {
        localStorage.setItem(
          SESSION_STORAGE_KEY,
          JSON.stringify({
            isRunning: true,
            isPaused: false,
            runAnchorTime: now,
            accumulatedSeconds: accumulatedSecondsRef.current,
            totalMinutes,
            intention,
            numBreaks,
            breakLengthMinutes,
          })
        );
      } catch {
        // ignore
      }
    }
  };

  // Stop / Abandon session
  const cancelSession = () => {
    localStorage.removeItem(SESSION_STORAGE_KEY);
    setIsRunning(false);
    setIsPaused(false);
    setIsFinished(false);
  };

  // Skip block
  const skipCurrentBlock = () => {
    focusAlerts.ensureContext();
    focusAlerts.playSoftBeep('high');
    const nextIndex = activeBlockIndex + 1;

    if (nextIndex < timelineBlocks.length) {
      const nextBlock = timelineBlocks[nextIndex];
      if (nextBlock.type === 'break') {
        focusAlerts.playBreakAlert();
      } else {
        focusAlerts.playFocusAlert();
      }

      // Fast-forward accumulated seconds to the start of next block
      let targetElapsed = 0;
      for (let i = 0; i < nextIndex; i++) {
        targetElapsed += timelineBlocks[i].durationSeconds;
      }
      accumulatedSecondsRef.current = targetElapsed;
      runAnchorTimeRef.current = Date.now();

      activeBlockIndexRef.current = nextIndex;
      setActiveBlockIndex(nextIndex);
      setSecondsRemainingInBlock(nextBlock.durationSeconds);
      setTotalElapsedSeconds(targetElapsed);
    } else {
      localStorage.removeItem(SESSION_STORAGE_KEY);
      focusAlerts.playCompletionFanfare();
      setIsRunning(false);
      setIsFinished(true);
      onSessionComplete(totalMinutes, intention);
    }
  };

  const currentBlock = timelineBlocks[activeBlockIndex] || timelineBlocks[0];

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const isDark = theme === 'night';

  return (
    <div className="space-y-4 animate-fadeSlide">
      {/* Active Session View */}
      {isRunning && (
        <div className="p-4 sm:p-6 rounded-3xl theme-panel border theme-line shadow-2xl relative overflow-hidden flex flex-col items-center">
          {/* Top Status & Controls */}
          <div className="w-full flex items-center justify-between relative z-10 mb-3">
            <div className="flex items-center gap-2">
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-xs ${
                  currentBlock.type === 'focus'
                    ? 'bg-[#2F6F5E]/20 text-[#2F6F5E] dark:text-[#4FA98A] border border-[#2F6F5E]/30'
                    : 'bg-amber-500/20 text-amber-500 border border-amber-500/30 animate-pulse'
                }`}
              >
                {currentBlock.type === 'focus' ? (
                  <>
                    <Flame className="w-3.5 h-3.5" />
                    <span>{currentBlock.label}</span>
                  </>
                ) : (
                  <>
                    <Coffee className="w-3.5 h-3.5" />
                    <span>{currentBlock.label}</span>
                  </>
                )}
              </span>
              <span className="text-xs theme-muted truncate max-w-[130px] font-medium hidden sm:inline">
                {intention}
              </span>
            </div>

            {/* Zen Mode Switch (anti-timer-anxiety) */}
            <button
              onClick={() => setIsZenMode(!isZenMode)}
              className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition active:scale-95 cursor-pointer border ${
                isZenMode
                  ? 'theme-accent-bg border-transparent text-white'
                  : 'theme-panel2 theme-muted hover:text-ink border-transparent'
              }`}
              title="Zen view hides seconds to reduce stress"
            >
              Zen Mode {isZenMode ? 'ON' : 'OFF'}
            </button>
          </div>

          {/* Banner Alert (Break started or Focus resumed) */}
          {bannerAlert && (
            <div
              className={`w-full mb-3 p-3 rounded-2xl border flex items-center gap-3 animate-fadeSlide shadow-sm ${
                bannerAlert.isBreak
                  ? 'bg-amber-500/20 text-amber-600 dark:text-amber-300 border-amber-500/40'
                  : 'bg-[#2F6F5E]/20 text-[#2F6F5E] dark:text-[#4FA98A] border-[#2F6F5E]/40'
              }`}
            >
              {bannerAlert.isBreak ? (
                <Coffee className="w-6 h-6 flex-shrink-0 animate-bounce" />
              ) : (
                <Flame className="w-6 h-6 flex-shrink-0 animate-bounce" />
              )}
              <div className="flex-1 text-left">
                <div className="text-xs font-bold">{bannerAlert.title}</div>
                <div className="text-[11px] opacity-90">{bannerAlert.subtitle}</div>
              </div>
              <button
                onClick={() => setBannerAlert(null)}
                className="p-1 opacity-60 hover:opacity-100 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Floating Mindful Nudge Toast */}
          {activeNudge && (
            <div
              className={`w-full max-w-sm mb-3 p-3 rounded-2xl border flex items-center gap-3 animate-fadeSlide shadow-lg z-20 ${activeNudge.color}`}
            >
              <activeNudge.icon className="w-5 h-5 flex-shrink-0 animate-bounce" />
              <div className="flex-1 text-left">
                <div className="text-xs font-bold">{activeNudge.title}</div>
                <div className="text-[11px] opacity-90 leading-tight">{activeNudge.text}</div>
              </div>
              <button
                onClick={() => setActiveNudge(null)}
                className="p-1 opacity-60 hover:opacity-100 transition cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Centerpiece: THE TRAVELER'S JOURNEY */}
          <div className="w-full my-2">
            <TravelerJourney
              progressPercent={totalSessionProgress}
              isRunning={isRunning}
              isPaused={isPaused}
              isBreak={currentBlock.type === 'break'}
              isFinished={isFinished}
              isDark={isDark}
              totalDurationSeconds={totalMinutes * 60}
            />
          </div>

          {/* Countdown & Intention */}
          <div className="text-center my-2 space-y-1">
            {!isZenMode ? (
              <div className="text-3xl sm:text-4xl font-mono font-bold theme-ink tracking-tight">
                {formatSeconds(secondsRemainingInBlock)}
              </div>
            ) : (
              <div className="text-base font-serif font-bold theme-accent tracking-wide italic">
                {currentBlock.type === 'focus' ? 'Walking the Mountain Trail' : 'Resting by the Campfire'}
              </div>
            )}
            <div className="text-[11px] theme-muted flex items-center justify-center gap-1.5 font-medium">
              <span>Goal: {intention}</span>
            </div>
          </div>

          {/* Timeline Multi-Block Indicators */}
          {timelineBlocks.length > 1 && (
            <div className="w-full max-w-xs flex gap-1.5 my-3">
              {timelineBlocks.map((blk, idx) => {
                const isPast = idx < activeBlockIndex;
                const isCurrent = idx === activeBlockIndex;
                return (
                  <div
                    key={idx}
                    className="flex-1 flex flex-col items-center gap-1"
                    title={blk.label}
                  >
                    <div
                      className={`h-2 w-full rounded-full transition-all duration-300 ${
                        isPast
                          ? 'bg-[#2F6F5E] dark:bg-[#4FA98A]'
                          : isCurrent
                          ? blk.type === 'focus'
                            ? 'bg-[#2F6F5E] dark:bg-[#4FA98A] animate-pulse ring-2 ring-[#4FA98A]/30'
                            : 'bg-amber-500 animate-pulse ring-2 ring-amber-500/30'
                          : 'bg-black/10 dark:bg-white/10'
                      }`}
                    />
                    <span className="text-[9px] theme-muted truncate w-full text-center">
                      {blk.type === 'break' ? 'Rest' : 'Focus'}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Main Controls: Pause / Resume, Skip, Abandon */}
          <div className="flex items-center gap-3 mt-2">
            <button
              onClick={cancelSession}
              className="p-3 rounded-full theme-panel2 text-muted hover:text-red-400 transition active:scale-90 cursor-pointer"
              title="Cancel session"
            >
              <RotateCcw className="w-5 h-5" />
            </button>

            <button
              onClick={togglePause}
              className={`px-8 py-3.5 rounded-full text-white font-bold text-sm shadow-xl active:scale-95 transition-all flex items-center gap-2 cursor-pointer ${
                isPaused
                  ? 'bg-amber-600 hover:bg-amber-500'
                  : 'theme-accent-bg'
              }`}
            >
              {isPaused ? (
                <>
                  <Play className="w-4 h-4 fill-white" />
                  <span>Resume March</span>
                </>
              ) : (
                <>
                  <Pause className="w-4 h-4 fill-white" />
                  <span>Pause</span>
                </>
              )}
            </button>

            <button
              onClick={skipCurrentBlock}
              className="p-3 rounded-full theme-panel2 text-muted hover:theme-ink transition active:scale-90 cursor-pointer"
              title="Skip to next block"
            >
              <SkipForward className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Finished / Victory Screen */}
      {isFinished && !isRunning && (
        <div className="p-6 rounded-3xl theme-panel border theme-line shadow-2xl text-center space-y-4 animate-scaleUp">
          <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-500 mx-auto flex items-center justify-center animate-bounce">
            <Sparkles className="w-8 h-8" />
          </div>
          <h2 className="font-serif font-bold text-2xl theme-ink">
            Summit Conquered! 🏔️
          </h2>
          <p className="text-xs theme-muted max-w-sm mx-auto leading-relaxed">
            The traveler has completed the journey. You focused for{' '}
            <strong className="theme-ink">{totalMinutes} minutes</strong> toward{' '}
            <strong className="theme-ink">{intention}</strong>.
          </p>

          <div className="flex justify-center pt-2">
            <button
              onClick={() => setIsFinished(false)}
              className="px-6 py-2.5 rounded-full theme-accent-bg text-white font-bold text-xs shadow-lg active:scale-95 transition cursor-pointer"
            >
              Start New Journey
            </button>
          </div>
        </div>
      )}

      {/* Configuration / Pre-Session Setup Screen */}
      {!isRunning && !isFinished && (
        <div className="p-5 sm:p-6 rounded-3xl theme-panel border theme-line shadow-xs space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="font-serif font-bold text-xl sm:text-2xl theme-ink">
              Focus.
            </h2>

            <div className="text-right">
              <span className="text-xs font-bold theme-ink">
                {stats.totalMinutes}m focused
              </span>
            </div>
          </div>

          {/* Session Duration Selector */}
          <div>
            <label className="text-xs font-semibold theme-muted uppercase tracking-wider block mb-2">
              Duration
            </label>
            <div className="grid grid-cols-5 gap-1.5">
              {PRESET_DURATIONS.map((preset) => (
                <button
                  key={preset.minutes}
                  onClick={() => setTotalMinutes(preset.minutes)}
                  className={`py-2 rounded-xl text-xs font-bold transition active:scale-95 cursor-pointer border ${
                    totalMinutes === preset.minutes
                      ? 'theme-accent-bg border-transparent text-white shadow-xs'
                      : 'theme-panel2 theme-muted hover:text-ink border-transparent'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Pomodoro Breaks Configuration */}
          <div>
            <label className="text-xs font-semibold theme-muted uppercase tracking-wider block mb-2">
              Break
            </label>
            <div className="grid grid-cols-4 gap-1.5 mb-2">
              {[
                { label: 'No Break', count: 0 },
                { label: '1 Break', count: 1 },
                { label: '2 Breaks', count: 2 },
                { label: '3 Breaks', count: 3 },
              ].map((b) => (
                <button
                  key={b.count}
                  onClick={() => setNumBreaks(b.count)}
                  className={`py-2 px-1 rounded-xl text-xs font-semibold transition active:scale-95 cursor-pointer border ${
                    numBreaks === b.count
                      ? 'theme-accent-bg border-transparent text-white shadow-xs'
                      : 'theme-panel2 theme-muted hover:text-ink border-transparent'
                  }`}
                >
                  {b.label}
                </button>
              ))}
            </div>

            {numBreaks > 0 && (
              <div className="flex items-center gap-2 p-2.5 rounded-xl theme-panel2 text-xs theme-muted animate-fadeSlide">
                <span>Break length:</span>
                {[3, 5, 10].map((m) => (
                  <button
                    key={m}
                    onClick={() => setBreakLengthMinutes(m)}
                    className={`px-2 py-0.5 rounded-md font-semibold text-xs cursor-pointer ${
                      breakLengthMinutes === m
                        ? 'bg-amber-500/20 text-amber-500'
                        : 'hover:text-ink'
                    }`}
                  >
                    {m}m
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Start Session CTA Button */}
          <button
            onClick={startSession}
            className="w-full py-4 rounded-2xl theme-accent-bg text-white font-bold text-sm shadow-xl active:scale-98 transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <Play className="w-4 h-4 fill-white" />
            <span>Begin</span>
          </button>
        </div>
      )}
    </div>
  );
};
