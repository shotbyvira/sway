export type Cue = "tap" | "cast" | "accept" | "dead" | "deal" | "tight" | "bolt" | "name" | "catch" | "miss";

const MUTE_KEY = "sway.mute";

let muted = false;
let ctx: AudioContext | null = null;
let bus: GainNode | null = null;

if (typeof window !== "undefined") {
  try {
    muted = localStorage.getItem(MUTE_KEY) === "1";
  } catch {
    muted = false;
  }
}

function context(): AudioContext | null {
  if (muted || typeof window === "undefined") return null;
  const AudioCtx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) return null;
  if (!ctx) {
    ctx = new AudioCtx();
    const master = ctx.createGain();
    master.gain.value = 0.8;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16;
    comp.knee.value = 8;
    comp.ratio.value = 6;
    comp.attack.value = 0.003;
    comp.release.value = 0.18;
    master.connect(comp);
    comp.connect(ctx.destination);
    bus = master;
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function env(audio: AudioContext, at: number, attack: number, dur: number, peak: number) {
  const amp = audio.createGain();
  const start = Math.max(0.0001, peak);
  amp.gain.setValueAtTime(0.0001, at);
  amp.gain.exponentialRampToValueAtTime(start, at + attack);
  amp.gain.exponentialRampToValueAtTime(0.0001, at + Math.max(dur, attack + 0.02));
  amp.connect(bus ?? audio.destination);
  return amp;
}

function tone(
  audio: AudioContext,
  freq: number,
  at: number,
  dur: number,
  type: OscillatorType,
  peak: number,
  slide = 0,
  attack = 0.012,
) {
  const osc = audio.createOscillator();
  const amp = env(audio, at, attack, dur, peak);
  osc.type = type;
  osc.frequency.setValueAtTime(freq, at);
  if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(48, freq + slide), at + dur);
  osc.connect(amp);
  osc.start(at);
  osc.stop(at + dur + 0.03);
}

function splash(audio: AudioContext, at: number, dur: number, peak: number, from: number, to: number) {
  const length = Math.max(1, Math.floor(audio.sampleRate * dur));
  const buffer = audio.createBuffer(1, length, audio.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
  const src = audio.createBufferSource();
  const filter = audio.createBiquadFilter();
  const amp = env(audio, at, 0.004, dur, peak);
  filter.type = "lowpass";
  filter.Q.value = 0.7;
  filter.frequency.setValueAtTime(from, at);
  filter.frequency.exponentialRampToValueAtTime(Math.max(80, to), at + dur);
  src.buffer = buffer;
  src.connect(filter);
  filter.connect(amp);
  src.start(at);
  src.stop(at + dur);
}

function bell(audio: AudioContext, freq: number, at: number, dur: number, peak: number) {
  tone(audio, freq, at, dur, "sine", peak, 0, 0.006);
  tone(audio, freq * 2, at, dur * 0.55, "sine", peak * 0.28, 0, 0.004);
}

export function play(cue: Cue) {
  const audio = context();
  if (!audio) return;
  const now = audio.currentTime;
  if (cue === "tap") tone(audio, 988, now, 0.045, "sine", 0.05, 0, 0.004);
  if (cue === "cast") {
    splash(audio, now, 0.32, 0.07, 2200, 280);
    tone(audio, 196, now, 0.26, "sine", 0.05, -90, 0.01);
    tone(audio, 392, now, 0.08, "sine", 0.03, 0, 0.004);
  }
  if (cue === "accept") {
    tone(audio, 659, now, 0.09, "triangle", 0.045, 0, 0.008);
    tone(audio, 880, now + 0.06, 0.12, "triangle", 0.04, 0, 0.008);
    splash(audio, now + 0.05, 0.06, 0.02, 2400, 900);
  }
  if (cue === "dead") {
    tone(audio, 98, now, 0.2, "sine", 0.05, 0, 0.01);
    tone(audio, 107, now, 0.2, "sine", 0.03, 0, 0.01);
    splash(audio, now, 0.08, 0.03, 500, 180);
  }
  if (cue === "deal") {
    tone(audio, 1480, now, 0.05, "sine", 0.035, -200, 0.003);
    tone(audio, 1860, now + 0.045, 0.05, "sine", 0.028, -240, 0.003);
    splash(audio, now, 0.07, 0.02, 1600, 400);
  }
  if (cue === "tight") {
    tone(audio, 392, now, 0.1, "triangle", 0.04);
    tone(audio, 494, now + 0.07, 0.1, "triangle", 0.038);
    tone(audio, 587, now + 0.14, 0.16, "sine", 0.04);
  }
  if (cue === "bolt") {
    splash(audio, now, 0.16, 0.045, 900, 160);
    tone(audio, 340, now, 0.28, "sine", 0.05, -230, 0.008);
  }
  if (cue === "name") bell(audio, 880, now, 0.22, 0.05);
  if (cue === "catch") {
    [523, 659, 784, 1046].forEach((freq, index) => bell(audio, freq, now + index * 0.075, 0.16, 0.035));
    tone(audio, 784, now + 0.32, 0.36, "sine", 0.03, 0, 0.02);
  }
  if (cue === "miss") {
    tone(audio, 146, now, 0.32, "sine", 0.045, 0, 0.02);
    tone(audio, 154, now, 0.32, "sine", 0.028, 0, 0.02);
  }
}

export function setMuted(next: boolean) {
  muted = next;
  try {
    localStorage.setItem(MUTE_KEY, next ? "1" : "0");
  } catch {
    /* ignore */
  }
}
