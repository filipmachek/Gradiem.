/**
 * Focus Acoustic Alerts Engine.
 * Clean, lightweight alert synthesizer for focus transitions, break reminders, and completion beeps.
 * Zero external audio assets, 100% offline, privacy-safe.
 */

class FocusAlertEngine {
  private ctx: AudioContext | null = null;

  public ensureContext(): AudioContext {
    if (!this.ctx) {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioContextClass();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  /**
   * BREAK ALERT:
   * Distinct, clear 3-pulse beep (pípnutí) at 880Hz -> 880Hz -> 660Hz.
   * Signals unmistakably to STOP working, pause, and step away!
   */
  public playBreakAlert() {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const tones = [
      { freq: 880, delay: 0.0, dur: 0.13 },
      { freq: 880, delay: 0.18, dur: 0.13 },
      { freq: 659.25, delay: 0.38, dur: 0.40 },
    ];

    tones.forEach((t) => {
      try {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(t.freq, ctx.currentTime + t.delay);

        gain.gain.setValueAtTime(0, ctx.currentTime + t.delay);
        gain.gain.linearRampToValueAtTime(0.45, ctx.currentTime + t.delay + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + t.delay + t.dur);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(ctx.currentTime + t.delay);
        osc.stop(ctx.currentTime + t.delay + t.dur + 0.05);
      } catch {
        // ignore
      }
    });
  }

  /**
   * FOCUS ALERT:
   * Positive 2-tone chime: Break is over, time to focus again!
   */
  public playFocusAlert() {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const tones = [
      { freq: 523.25, delay: 0.0, dur: 0.16 }, // C5
      { freq: 783.99, delay: 0.16, dur: 0.45 },  // G5
    ];

    tones.forEach((t) => {
      try {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(t.freq, ctx.currentTime + t.delay);

        gain.gain.setValueAtTime(0, ctx.currentTime + t.delay);
        gain.gain.linearRampToValueAtTime(0.35, ctx.currentTime + t.delay + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + t.delay + t.dur);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(ctx.currentTime + t.delay);
        osc.stop(ctx.currentTime + t.delay + t.dur + 0.05);
      } catch {
        // ignore
      }
    });
  }

  /**
   * CELEBRATION FANFARE:
   * Harmonious chord when the traveler reaches the goal!
   */
  public playCompletionFanfare() {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const freqs = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    freqs.forEach((freq, idx) => {
      try {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.09);

        gain.gain.setValueAtTime(0, ctx.currentTime + idx * 0.09);
        gain.gain.linearRampToValueAtTime(0.35, ctx.currentTime + idx * 0.09 + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + idx * 0.09 + 2.2);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(ctx.currentTime + idx * 0.09);
        osc.stop(ctx.currentTime + idx * 0.09 + 2.3);
      } catch {
        // ignore
      }
    });
  }

  /**
   * Soft UI click cue.
   */
  public playSoftBeep(pitch: 'high' | 'low' = 'high') {
    const ctx = this.ensureContext();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(pitch === 'high' ? 880 : 440, ctx.currentTime);

      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.12, ctx.currentTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.07);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.08);
    } catch {
      // ignore
    }
  }

  // No-op methods kept for API compatibility
  public stop() {}
  public setVolume(_val: number) {}
}

export const focusAlerts = new FocusAlertEngine();
