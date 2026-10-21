export type Cue = "tap" | "cast" | "accept" | "dead" | "deal" | "tight" | "bolt" | "name" | "catch" | "miss";

const MUTE_KEY = "sway.mute";

let muted = false;
let ctx: AudioContext | null = null;

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
  if (!ctx) ctx = new AudioCtx();
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function tone(audio: AudioContext, freq: number, at: number, dur: number, type: OscillatorType, gain: number, slide = 0) {
  const osc = audio.createOscillator();
  const amp = audio.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, at);
  if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), at + dur);
  amp.gain.setValueAtTime(gain, at);
  amp.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  osc.connect(amp);
  amp.connect(audio.destination);
  osc.start(at);
  osc.stop(at + dur + 0.02);
}

function noise(audio: AudioContext, at: number, dur: number, gain: number) {
  const length = Math.floor(audio.sampleRate * dur);
  const buffer = audio.createBuffer(1, length, audio.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
  const src = audio.createBufferSource();
  const amp = audio.createGain();
  const filter = audio.createBiquadFilter();
  filter.type = "highpass";
  filter.frequency.value = 400;
  src.buffer = buffer;
  amp.gain.setValueAtTime(gain, at);
  amp.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  src.connect(filter);
  filter.connect(amp);
  amp.connect(audio.destination);
  src.start(at);
  src.stop(at + dur);
}

export function play(cue: Cue) {
  const audio = context();
  if (!audio) return;
  const now = audio.currentTime;
  if (cue === "tap") tone(audio, 880, now, 0.05, "square", 0.04);
  if (cue === "cast") {
    noise(audio, now, 0.18, 0.08);
    tone(audio, 240, now, 0.22, "sine", 0.06, -140);
  }
  if (cue === "accept") {
    tone(audio, 660, now, 0.08, "square", 0.05);
    tone(audio, 880, now + 0.07, 0.1, "square", 0.05);
  }
  if (cue === "dead") {
    noise(audio, now, 0.12, 0.05);
    tone(audio, 110, now, 0.16, "square", 0.05);
  }
  if (cue === "deal") {
    noise(audio, now, 0.08, 0.05);
    tone(audio, 520, now, 0.07, "triangle", 0.04);
  }
  if (cue === "tight") {
    tone(audio, 523, now, 0.08, "triangle", 0.05);
    tone(audio, 659, now + 0.07, 0.08, "triangle", 0.05);
    tone(audio, 784, now + 0.14, 0.12, "triangle", 0.05);
  }
  if (cue === "bolt") tone(audio, 420, now, 0.22, "sawtooth", 0.04, -240);
  if (cue === "name") tone(audio, 784, now, 0.16, "triangle", 0.06);
  if (cue === "catch") {
    [523, 659, 784, 1046].forEach((freq, index) => tone(audio, freq, now + index * 0.08, 0.14, "triangle", 0.05));
  }
  if (cue === "miss") tone(audio, 180, now, 0.22, "sine", 0.05, -40);
}

export function setMuted(next: boolean) {
  muted = next;
  try {
    localStorage.setItem(MUTE_KEY, next ? "1" : "0");
  } catch {
    /* ignore */
  }
}
