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

export function playClang(force: number, kind: "weak" | "good" | "perfect" | "hard", zone: "base" | "mid" | "tip" = "mid") {
  if (!ctx || !sfx) return;
  const t = now();
  const peak = kind === "weak" ? 0.28 : kind === "hard" ? 0.95 : kind === "perfect" ? 0.8 : 0.62;
  const zonePitchMult = zone === "base" ? 0.8 : zone === "tip" ? 1.35 : 1.0;
  const pitch = (140 + force * 90 + (kind === "perfect" ? 40 : 0)) * zonePitchMult;

  const g = envGain(0.45, peak, 0.004);
  if (!g) return;

  const osc = ctx.createOscillator();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(pitch, t);
  osc.frequency.exponentialRampToValueAtTime(pitch * 0.45, t + 0.28);
  const filt = ctx.createBiquadFilter();
  filt.type = "bandpass";
  filt.frequency.value = (700 + force * 900) * (zone === "tip" ? 1.4 : zone === "base" ? 0.75 : 1.0);
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
    hp.frequency.value = zone === "tip" ? 2400 : 1800;
    src.connect(hp);
    if (ng) hp.connect(ng);
    src.start(t);
  }
}

export function playUpgradeChime() {
  if (!ctx || !sfx) return;
  const audioCtx = ctx;
  const t = now();
  const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
  notes.forEach((freq, idx) => {
    const delay = idx * 0.07;
    const osc = audioCtx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, t + delay);
    const g = envGain(0.65, 0.28, 0.01);
    if (g) {
      osc.connect(g);
      osc.start(t + delay);
      osc.stop(t + delay + 0.65);
    }
  });
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

export function playCrack() {
  if (!ctx || !sfx) return;
  const t = now();
  const osc = ctx.createOscillator();
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(380, t);
  osc.frequency.exponentialRampToValueAtTime(140, t + 0.18);
  const g = envGain(0.22, 0.65, 0.002);
  const f = ctx.createBiquadFilter();
  f.type = "bandpass";
  f.frequency.value = 1800;
  f.Q.value = 8;
  osc.connect(f);
  if (g) f.connect(g);
  osc.start(t);
  osc.stop(t + 0.2);

  const buf = noiseBuffer(0.15);
  if (buf) {
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const ng = envGain(0.12, 0.45, 0.001);
    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 2200;
    src.connect(hp);
    if (ng) hp.connect(ng);
    src.start(t);
  }
}

export function playShatter() {
  if (!ctx || !sfx) return;
  const t = now();
  // Catastrophic metal snap
  const osc = ctx.createOscillator();
  osc.type = "square";
  osc.frequency.setValueAtTime(280, t);
  osc.frequency.exponentialRampToValueAtTime(45, t + 0.4);
  const g = envGain(0.5, 0.85, 0.003);
  if (g) osc.connect(g);
  osc.start(t);
  osc.stop(t + 0.5);

  // Hollow dull clunk
  const osc2 = ctx.createOscillator();
  osc2.type = "triangle";
  osc2.frequency.setValueAtTime(110, t);
  osc2.frequency.exponentialRampToValueAtTime(30, t + 0.6);
  const g2 = envGain(0.65, 0.9, 0.005);
  if (g2) osc2.connect(g2);
  osc2.start(t);
  osc2.stop(t + 0.65);

  const buf = noiseBuffer(0.4);
  if (buf) {
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const ng = envGain(0.35, 0.5, 0.002);
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 900;
    src.connect(lp);
    if (ng) lp.connect(ng);
    src.start(t);
  }
}

export function playRuneHum() {
  if (!ctx || !sfx) return;
  const t = now();
  const freqs = [528, 792, 1056];
  for (const f of freqs) {
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(f, t);
    osc.frequency.linearRampToValueAtTime(f * 1.02, t + 0.6);
    const g = envGain(0.7, 0.2, 0.05);
    if (g) {
      osc.connect(g);
      osc.start(t);
      osc.stop(t + 0.7);
    }
  }
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

export function playCoinJingle() {
  if (!ctx || !sfx) return;
  const audioCtx = ctx;
  const t = now();
  // Delicate double chime in high register (C7: 2093Hz, E7: 2637Hz)
  const freqs = [2093.0, 2637.0];
  freqs.forEach((freq, idx) => {
    const delay = idx * 0.055;
    const osc = audioCtx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, t + delay);
    const g = envGain(0.14, 0.22, 0.003);
    if (g) {
      osc.connect(g);
      osc.start(t + delay);
      osc.stop(t + delay + 0.15);
    }
  });
}

export function playLootFanfare(rarity: "Comum" | "Incomum" | "Rara" | "Épica" | "Lendária" | "Relíquia") {
  if (!ctx || !sfx) return;
  const audioCtx = ctx;
  const t = now();

  if (rarity === "Comum") {
    // Quick clean ping
    const osc = audioCtx.createOscillator();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(783.99, t);
    const g = envGain(0.2, 0.25, 0.005);
    if (g) {
      osc.connect(g);
      osc.start(t);
      osc.stop(t + 0.2);
    }
  } else if (rarity === "Incomum") {
    // Dual chord
    const freqs = [783.99, 987.77]; // G5, B5
    freqs.forEach((f) => {
      const osc = audioCtx.createOscillator();
      osc.type = "sine";
      osc.frequency.setValueAtTime(f, t);
      const g = envGain(0.3, 0.25, 0.008);
      if (g) {
        osc.connect(g);
        osc.start(t);
        osc.stop(t + 0.3);
      }
    });
  } else if (rarity === "Rara") {
    // Triad ascending chime
    const notes = [783.99, 987.77, 1174.66]; // G5, B5, D6
    notes.forEach((freq, idx) => {
      const delay = idx * 0.07;
      const osc = audioCtx.createOscillator();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, t + delay);
      const g = envGain(0.45, 0.3, 0.008);
      if (g) {
        osc.connect(g);
        osc.start(t + delay);
        osc.stop(t + delay + 0.45);
      }
    });
  } else if (rarity === "Épica") {
    // Rich harmonic 4-note chord
    const notes = [587.33, 739.99, 880.0, 1174.66]; // D5, F#5, A5, D6
    notes.forEach((freq, idx) => {
      const delay = idx * 0.08;
      const osc = audioCtx.createOscillator();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, t + delay);
      const g = envGain(0.65, 0.35, 0.01);
      if (g) {
        osc.connect(g);
        osc.start(t + delay);
        osc.stop(t + delay + 0.65);
      }
    });
  } else if (rarity === "Lendária") {
    // Majestic fanfare
    const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5]; // C5, E5, G5, C6, E6
    notes.forEach((freq, idx) => {
      const delay = idx * 0.09;
      const osc = audioCtx.createOscillator();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(freq, t + delay);
      const f = audioCtx.createBiquadFilter();
      f.type = "lowpass";
      f.frequency.setValueAtTime(1200 + idx * 300, t + delay);
      const g = envGain(0.85, 0.38, 0.015);
      if (g) {
        osc.connect(f);
        f.connect(g);
        osc.start(t + delay);
        osc.stop(t + delay + 0.85);
      }
    });
  } else {
    // Relic: deep ancient resonance with subharmonics
    const notes = [110.0, 220.0, 440.0, 554.37, 659.25];
    notes.forEach((freq, idx) => {
      const osc = audioCtx.createOscillator();
      osc.type = idx === 0 ? "triangle" : "sine";
      osc.frequency.setValueAtTime(freq, t);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.98, t + 1.2);
      const g = envGain(1.4, 0.45, 0.03);
      if (g) {
        osc.connect(g);
        osc.start(t);
        osc.stop(t + 1.4);
      }
    });
  }
}

export function playFusionHum() {
  if (!ctx || !sfx) return;
  const audioCtx = ctx;
  const t = now();
  const osc = audioCtx.createOscillator();
  osc.type = "sine";
  osc.frequency.setValueAtTime(160, t);
  osc.frequency.exponentialRampToValueAtTime(420, t + 0.8);
  const g = envGain(0.85, 0.35, 0.05);
  if (g) {
    osc.connect(g);
    osc.start(t);
    osc.stop(t + 0.85);
  }
}

export function playFusionSuccess() {
  if (!ctx || !sfx) return;
  const audioCtx = ctx;
  const t = now();
  // Harmonic chime
  const notes = [440, 554.37, 659.25, 880];
  notes.forEach((freq, idx) => {
    const delay = idx * 0.07;
    const osc = audioCtx.createOscillator();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(freq, t + delay);
    const g = envGain(0.7, 0.35, 0.01);
    if (g) {
      osc.connect(g);
      osc.start(t + delay);
      osc.stop(t + delay + 0.7);
    }
  });
}

export function resumeAudio() {
  if (ctx?.state === "suspended") void ctx.resume();
}
