let audioCtx: AudioContext | null = null;

const getContext = (): AudioContext | null => {
  if (!audioCtx) {
    if (typeof window !== 'undefined') {
        const Ctx = window.AudioContext || (window as any).webkitAudioContext;
        if (Ctx) {
            audioCtx = new Ctx();
        }
    }
  }
  return audioCtx;
};

export const tryResumeAudio = () => {
    const ctx = getContext();
    if (ctx && ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
    }
};

export const playJumpSound = () => {
  const ctx = getContext();
  if (!ctx) return;
  
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  // "Flap" sound: quick pitch ramp up
  osc.type = 'sine';
  osc.frequency.setValueAtTime(200, ctx.currentTime);
  osc.frequency.linearRampToValueAtTime(450, ctx.currentTime + 0.1);

  gain.gain.setValueAtTime(0.15, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.1);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.1);
};

export const playScoreSound = () => {
  const ctx = getContext();
  if (!ctx) return;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  // "Coin" sound: High pitch ding
  osc.type = 'sine';
  osc.frequency.setValueAtTime(1000, ctx.currentTime);
  
  gain.gain.setValueAtTime(0.08, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.4);
};

export const playDieSound = () => {
  const ctx = getContext();
  if (!ctx) return;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  // "Hit" sound: Low saw wave drop
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(150, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.25);

  gain.gain.setValueAtTime(0.2, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.25);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.25);
};

// --- Background Music Player ---

class MusicPlayer {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private isPlaying: boolean = false;
  private isMuted: boolean = false;
  private nextNoteTime: number = 0;
  private currentNoteIndex: number = 0;
  private timerID: number | null = null;
  
  // Scheduler config
  private lookahead: number = 25.0; // ms
  private scheduleAheadTime: number = 0.1; // seconds

  // Simple looped melody (Frequency, Duration)
  private melody = [
    // Bar 1 (C Major)
    { f: 261.63, d: 0.2 }, { f: 329.63, d: 0.2 }, { f: 392.00, d: 0.2 }, { f: 523.25, d: 0.2 },
    { f: 392.00, d: 0.2 }, { f: 329.63, d: 0.2 }, { f: 261.63, d: 0.4 },
    
    // Bar 2 (F Major)
    { f: 349.23, d: 0.2 }, { f: 440.00, d: 0.2 }, { f: 523.25, d: 0.2 }, { f: 698.46, d: 0.2 },
    { f: 523.25, d: 0.2 }, { f: 440.00, d: 0.2 }, { f: 349.23, d: 0.4 },

    // Bar 3 (G Major)
    { f: 392.00, d: 0.2 }, { f: 493.88, d: 0.2 }, { f: 587.33, d: 0.2 }, { f: 783.99, d: 0.2 },
    { f: 587.33, d: 0.2 }, { f: 493.88, d: 0.2 }, { f: 392.00, d: 0.4 },

    // Bar 4 (Turnaround)
    { f: 523.25, d: 0.2 }, { f: 392.00, d: 0.2 }, { f: 329.63, d: 0.2 }, { f: 261.63, d: 0.2 },
    { f: 196.00, d: 0.4 }, { f: 261.63, d: 0.4 },
  ];

  constructor() {}

  private init() {
    this.ctx = getContext();
    if (this.ctx && !this.masterGain) {
        this.masterGain = this.ctx.createGain();
        // Lower volume for background music so SFX cut through
        this.masterGain.gain.value = this.isMuted ? 0 : 0.05; 
        this.masterGain.connect(this.ctx.destination);
    }
  }

  setMuted(muted: boolean) {
    this.isMuted = muted;
    if (this.masterGain && this.ctx) {
        // Smooth transition to avoid clicking
        this.masterGain.gain.setTargetAtTime(muted ? 0 : 0.05, this.ctx.currentTime, 0.2);
    }
  }

  start() {
    this.init();
    if (!this.ctx || this.isPlaying) return;

    // Ensure context is running (browser autoplay policy)
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    
    this.isPlaying = true;
    this.nextNoteTime = this.ctx.currentTime + 0.1;
    this.scheduler();
  }

  stop() {
    this.isPlaying = false;
    if (this.timerID) {
        window.clearTimeout(this.timerID);
        this.timerID = null;
    }
    this.currentNoteIndex = 0;
  }

  private scheduler() {
    if (!this.isPlaying || !this.ctx) return;

    // While there are notes that will need to play before the next interval, 
    // schedule them and advance the pointer.
    while (this.nextNoteTime < this.ctx.currentTime + this.scheduleAheadTime) {
        this.scheduleNote(this.nextNoteTime);
        this.nextNote();
    }
    this.timerID = window.setTimeout(() => this.scheduler(), this.lookahead);
  }

  private scheduleNote(time: number) {
    if (!this.ctx || !this.masterGain) return;
    
    const note = this.melody[this.currentNoteIndex];
    const osc = this.ctx.createOscillator();
    const noteGain = this.ctx.createGain();

    osc.type = 'triangle'; // Softer, flute-like sound
    osc.frequency.value = note.f;

    // Envelope for the note (Pluck feel)
    noteGain.gain.setValueAtTime(0, time);
    noteGain.gain.linearRampToValueAtTime(1, time + 0.02);
    noteGain.gain.exponentialRampToValueAtTime(0.1, time + note.d);

    osc.connect(noteGain);
    noteGain.connect(this.masterGain);

    osc.start(time);
    osc.stop(time + note.d);
  }

  private nextNote() {
    const note = this.melody[this.currentNoteIndex];
    this.nextNoteTime += note.d;
    this.currentNoteIndex++;
    if (this.currentNoteIndex === this.melody.length) {
        this.currentNoteIndex = 0;
    }
  }
}

const musicPlayer = new MusicPlayer();

export const startMusic = () => musicPlayer.start();
export const stopMusic = () => musicPlayer.stop();
export const setMusicMuted = (muted: boolean) => musicPlayer.setMuted(muted);