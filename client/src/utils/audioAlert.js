// Web Audio API Synthesizer for BEACON Operations Console
class AudioAlertService {
  constructor() {
    this.audioCtx = null;
    this.isMuted = true; // Default muted for pleasant initial UX
    this.lastChimeTime = 0;
    this.lastBeepTime = 0;
  }

  init() {
    // Must never throw: called from tick streams outside an explicit user gesture.
    try {
      if (this.audioCtx) {
        if (this.audioCtx.state === 'suspended') {
          this.audioCtx.resume().catch(() => {});
        }
        return;
      }
      if (typeof window !== 'undefined') {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (AudioContext) {
          this.audioCtx = new AudioContext();
        }
      }
      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        this.audioCtx.resume().catch(() => {});
      }
    } catch (e) {
      console.warn('Audio init error:', e);
      this.audioCtx = null;
    }
  }

  setMuted(muted) {
    this.isMuted = !!muted;
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (!this.isMuted) {
      this.playTestBeep();
    }
    return this.isMuted;
  }

  playTestBeep() {
    this.init();
    if (!this.audioCtx) return;

    try {
      const now = this.audioCtx.currentTime;
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, now); // A5 note
      osc.frequency.exponentialRampToValueAtTime(1320, now + 0.12);

      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start(now);
      osc.stop(now + 0.15);
    } catch (e) {
      console.warn('Audio alert error:', e);
    }
  }

  playBuzzerBeep() {
    // Hardware-mirror beep: shares the single AudioContext (no per-tick contexts).
    const nowMs = Date.now();
    if (nowMs - this.lastBeepTime < 600) return; // throttle
    this.lastBeepTime = nowMs;

    this.init();
    if (!this.audioCtx || this.audioCtx.state === 'closed') return;

    try {
      const now = this.audioCtx.currentTime;
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.linearRampToValueAtTime(740, now + 0.18);

      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start(now);
      osc.stop(now + 0.22);
    } catch (e) {
      console.warn('Buzzer beep error:', e);
    }
  }

  playWarningChime() {
    if (this.isMuted) return;
    const nowMs = Date.now();
    // Throttle chimes so they don't fire continuously
    if (nowMs - this.lastChimeTime < 4000) return;
    this.lastChimeTime = nowMs;

    this.init();
    if (!this.audioCtx) return;

    try {
      const now = this.audioCtx.currentTime;
      
      // Dual-tone high-tech warning chime
      const osc1 = this.audioCtx.createOscillator();
      const osc2 = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(659.25, now); // E5
      osc1.frequency.setValueAtTime(880.00, now + 0.1); // A5

      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(440.00, now); // A4
      osc2.frequency.setValueAtTime(554.37, now + 0.1); // C#5

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.35);
      osc2.stop(now + 0.35);
    } catch (e) {
      console.warn('Audio alert error:', e);
    }
  }

  playCriticalAlarm() {
    if (this.isMuted) return;
    const nowMs = Date.now();
    if (nowMs - this.lastChimeTime < 3000) return;
    this.lastChimeTime = nowMs;

    this.init();
    if (!this.audioCtx) return;

    try {
      const now = this.audioCtx.currentTime;

      // Triple pulse tactical alarm
      [0, 0.15, 0.30].forEach((delay) => {
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(950, now + delay);
        osc.frequency.linearRampToValueAtTime(750, now + delay + 0.1);

        gain.gain.setValueAtTime(0.14, now + delay);
        gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.12);

        osc.connect(gain);
        gain.connect(this.audioCtx.destination);

        osc.start(now + delay);
        osc.stop(now + delay + 0.12);
      });
    } catch (e) {
      console.warn('Critical alarm error:', e);
    }
  }
}

export const audioAlert = new AudioAlertService();
export default audioAlert;
