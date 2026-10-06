let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let sfx: GainNode | null = null;
let amb: GainNode | null = null;
let muted = false;
let fireTimer: number | null = null;

function now() {
  return ctx?.currentTime ?? 0;
}

export function isMuted() {
  return muted;
}

export function setMuted(next: boolean) {
  muted = next;
  if (master) master.gain.setTargetAtTime(next ? 0 : 1, now(), 0.02);
}

export function unlockAudio() {
  if (!ctx) {
    ctx = new AudioContext({ latencyHint: "interactive" });
    master = ctx.createGain();
    sfx = ctx.createGain();
    amb = ctx.createGain();
    sfx.gain.value = 0.85;
    amb.gain.value = 0.22;
    sfx.connect(master);
    amb.connect(master);
    master.connect(ctx.destination);
    if (muted) master.gain.value = 0;
  }
  if (ctx.state === "suspended") void ctx.resume();
  startFire();
}

function envGain(duration: number, peak = 1, attack = 0.008) {
  if (!ctx || !sfx) return null;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, now());
  g.gain.linearRampToValueAtTime(peak, now() + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, now() + duration);
  g.connect(sfx);
  return g;
}

function noiseBuffer(seconds: number) {
  if (!ctx) return null;
  const rate = ctx.sampleRate;
  const len = Math.floor(rate * seconds);
  const buf = ctx.createBuffer(1, len, rate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  return buf;
}

export function playClang(force: number, kind: "weak" | "good" | "perfect" | "hard") {
  if (!ctx || !sfx) return;
  const t = now();
  const peak = kind === "weak" ? 0.28 : kind === "hard" ? 0.95 : kind === "perfect" ? 0.8 : 0.62;
  const pitch = 140 + force * 90 + (kind === "perfect" ? 40 : 0);

  const g = envGain(0.45, peak, 0.004);
  if (!g) return;

  const osc = ctx.createOscillator();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(pitch, t);
  osc.frequency.exponentialRampToValueAtTime(pitch * 0.45, t + 0.28);
  const filt = ctx.createBiquadFilter();
  filt.type = "bandpass";
  filt.frequency.value = 700 + force * 900;
  filt.Q.value = 6;
  osc.connect(filt);
  filt.connect(g);
  osc.start(t);
  osc.stop(t + 0.4);

  const osc2 = ctx.createOscillator();
  osc2.type = "sine";
  osc2.frequency.value = pitch * 2.4;
  const g2 = envGain(0.18, peak * 0.35, 0.002);
  if (g2) {
    osc2.connect(g2);
    osc2.start(t);
    osc2.stop(t + 0.16);
  }

  const buf = noiseBuffer(0.12);
  if (buf) {
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const ng = envGain(0.08, peak * 0.45, 0.001);
    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 1800;
    src.connect(hp);
    if (ng) hp.connect(ng);
    src.start(t);
  }
}

export function playWhoosh() {
  if (!ctx) return;
  const buf = noiseBuffer(0.25);
  if (!buf) return;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const f = ctx.createBiquadFilter();
  f.type = "bandpass";
  f.frequency.setValueAtTime(400, now());
  f.frequency.exponentialRampToValueAtTime(1800, now() + 0.18);
  const g = envGain(0.22, 0.18, 0.02);
  src.connect(f);
  if (g) f.connect(g);
  src.start();
}

export function playHiss() {
  if (!ctx) return;
  const buf = noiseBuffer(0.7);
  if (!buf) return;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const f = ctx.createBiquadFilter();
  f.type = "highpass";
  f.frequency.value = 2400;
  const g = envGain(0.7, 0.35, 0.04);
  src.connect(f);
  if (g) f.connect(g);
  src.start();
}

export function playPull() {
  if (!ctx || !sfx) return;
  const osc = ctx.createOscillator();
  osc.type = "sine";
  osc.frequency.setValueAtTime(220, now());
  osc.frequency.exponentialRampToValueAtTime(90, now() + 0.22);
  const g = envGain(0.28, 0.22, 0.01);
  if (g) osc.connect(g);
  osc.start();
  osc.stop(now() + 0.28);
}

function startFire() {
  if (!ctx || !amb || fireTimer != null) return;
  const tick = () => {
    if (!ctx || !amb) return;
    const buf = noiseBuffer(0.35);
    if (!buf) return;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const f = ctx.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.value = 500 + Math.random() * 280;
    const g = ctx.createGain();
    g.gain.value = 0.18 + Math.random() * 0.08;
    src.connect(f);
    f.connect(g);
    g.connect(amb);
    src.start();
    fireTimer = window.setTimeout(tick, 280);
  };
  tick();
}

export function resumeAudio() {
  if (ctx?.state === "suspended") void ctx.resume();
}
