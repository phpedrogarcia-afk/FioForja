import { STEELS, gradeFor } from "./catalog";
import type { SimState, StrikeKind, SwordDesign } from "./types";

export interface SimInput {
  charging: boolean;
  action: boolean;
  reheat: boolean;
}

export interface SimEvent {
  sfx?: "clang" | "whoosh" | "hiss" | "pull";
  kind?: StrikeKind;
  force?: number;
  trauma?: number;
  hitstop?: number;
  message?: string;
  finished?: boolean;
}

export function createSim(design: SwordDesign): SimState {
  const steel = STEELS[design.steel];
  return {
    phase: "heat",
    heat: 0.1,
    heatScore: 0,
    shape: 0.18,
    quality: 42,
    warp: 0,
    strikes: 0,
    maxStrikes: 8,
    force: 0,
    charging: false,
    sweetCenter: 0.66,
    sweetWidth: steel.sweetWidth,
    quenchFill: 0,
    quenching: false,
    quenchScore: 0,
    reheating: false,
    strikeKind: null,
    strikeAnim: 0,
    sparkAnim: 0,
    done: false,
    lastMessage: "Espere o ferro ficar amarelo-branco, depois retire.",
    integrity: 1,
    missStreak: 0,
    perfects: 0,
    broken: false,
    along: 0.12,
  };
}

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function recomputeQuality(s: SimState, design: SwordDesign) {
  const steel = STEELS[design.steel];
  const forge = clamp(s.shape * 100 - s.warp * 38, 0, 100);
  const q =
    s.heatScore * 0.26 +
    forge * 0.42 +
    s.quenchScore * 0.22 +
    steel.hardness * 10 -
    s.warp * 18;
  s.quality = clamp(q, 4, 100);
}

export function stepSim(
  s: SimState,
  dt: number,
  input: SimInput,
  design: SwordDesign,
  time: number,
): SimEvent {
  const event: SimEvent = {};
  if (s.done) return event;

  s.strikeAnim = Math.max(0, s.strikeAnim - dt);
  s.sparkAnim = Math.max(0, s.sparkAnim - dt);
  if (s.strikeAnim <= 0) s.strikeKind = null;

  const steel = STEELS[design.steel];

  if (s.phase === "heat") {
    s.heat = clamp(s.heat + dt * 0.16, 0, 1);
    const mid = (steel.heatMin + steel.heatMax) / 2;
    if (s.heat >= steel.heatMin && s.heat <= steel.heatMax) {
      s.lastMessage = "Ponto certo — retire agora.";
    } else if (s.heat < steel.heatMin) {
      s.lastMessage = "Ainda frio. Deixe o fogo trabalhar.";
    } else if (s.heat < 0.92) {
      s.lastMessage = "Quase queimando. Retire!";
    } else {
      s.lastMessage = "O ferro está queimando.";
      s.warp = clamp(s.warp + dt * 0.08, 0, 1);
    }

    if (input.action) {
      const dist = Math.abs(s.heat - mid);
      const window = (steel.heatMax - steel.heatMin) / 2;
      s.heatScore = clamp(100 * (1 - dist / (window + 0.12)), 20, 100);
      if (s.heat > 0.93) s.heatScore = Math.min(s.heatScore, 38);
      if (s.heat < 0.4) s.heatScore = Math.min(s.heatScore, 36);
      s.phase = "forge";
      s.lastMessage = "Segure e solte no brilho. O martelo vai percorrer a lâmina inteira.";
      s.sweetCenter = 0.64;
      event.sfx = "pull";
      event.message = s.lastMessage;
      recomputeQuality(s, design);
      return event;
    }
  }

  if (s.phase === "forge") {
    const progress = s.strikes / s.maxStrikes;
    s.sweetWidth = Math.max(0.05, steel.sweetWidth * (1 - progress * 0.62));
    s.sweetCenter = 0.58 + Math.sin(time * (0.9 + progress * 2.2)) * (0.1 + progress * 0.08);

    if (s.reheating) {
      s.heat = clamp(s.heat + dt * 0.42, 0, 0.86);
      s.lastMessage = "Reaquecendo no fogo…";
      if (s.heat >= 0.74) s.reheating = false;
    } else {
      s.heat = clamp(s.heat - dt * (0.034 + progress * 0.028), 0.08, 1);
    }

    if (input.reheat && !s.reheating && s.heat < 0.55) {
      s.reheating = true;
    }

    if (input.charging && !s.reheating) {
      if (!s.charging && s.force < 0.05) event.sfx = "whoosh";
      s.charging = true;
      s.force = clamp(s.force + dt * 1.15, 0, 1);
    } else if (s.charging) {
      const kind = gradeStrike(s.force, s.sweetCenter, s.sweetWidth);
      const usedForce = s.force;
      applyStrike(s, kind, design);
      const snapped = strainBlade(s, kind, design);
      s.charging = false;
      s.force = 0;
      s.strikeKind = kind;
      s.strikeAnim = 0.38;
      s.sparkAnim = 0.42;
      event.sfx = "clang";
      event.kind = kind;
      event.force = usedForce;
      event.trauma = snapped ? 0.9 : kind === "perfect" ? 0.55 : kind === "hard" ? 0.7 : kind === "good" ? 0.38 : 0.18;
      event.hitstop = kind === "perfect" || kind === "hard" || snapped ? 0.055 : 0.03;
      event.message = s.lastMessage;
      recomputeQuality(s, design);

      if (snapped) {
        s.done = true;
        event.finished = true;
        return event;
      }

      if (s.strikes >= s.maxStrikes) {
        s.phase = "quench";
        s.heat = Math.max(s.heat, 0.5);
        s.lastMessage = "Leve a lâmina ao balde. Segure para mergulhar e solte na faixa.";
      }
      return event;
    }

    if (s.heat < 0.32 && !s.reheating) {
      s.lastMessage = "O ferro esfriou. Reaqueça.";
    }
  }

  if (s.phase === "quench") {
    if (input.charging) {
      s.quenching = true;
      s.quenchFill = clamp(s.quenchFill + dt * 0.48, 0, 1);
      if (s.quenchFill > 0.42 && s.quenchFill < 0.62) {
        s.lastMessage = "Agora — solte.";
      } else if (s.quenchFill >= 0.62) {
        s.lastMessage = "Demais. Vai rachar.";
      } else {
        s.lastMessage = "Segure: a lâmina desce no balde.";
      }
    } else if (s.quenching) {
      const ideal = 0.52;
      const dist = Math.abs(s.quenchFill - ideal);
      s.quenchScore = clamp(100 * (1 - dist / 0.38), 12, 100);
      if (s.quenchFill < 0.22) {
        s.quenchScore = Math.min(s.quenchScore, 40);
        s.lastMessage = "Temperou pouco. O aço ficou mole.";
      } else if (s.quenchFill > 0.78) {
        s.warp = clamp(s.warp + 0.18, 0, 1);
        s.integrity = clamp(s.integrity - 0.22, 0, 1);
        if (s.quenchFill > 0.8 && (s.warp > 0.42 || s.integrity < 0.3)) {
          s.broken = true;
          s.integrity = 0;
          s.lastMessage = "A têmpera rachou o aço. Ficou tempo demais no banho.";
        } else {
          s.lastMessage = "Ficou tempo demais no banho.";
        }
      } else {
        s.lastMessage = "Têmpera limpa.";
      }
      recomputeQuality(s, design);
      s.done = true;
      event.sfx = "hiss";
      event.finished = true;
      event.trauma = 0.25;
      event.message = s.lastMessage;
      return event;
    }
  }

  return event;
}

function gradeStrike(force: number, center: number, width: number): StrikeKind {
  const lo = center - width / 2;
  const hi = center + width / 2;
  if (Math.abs(force - center) < 0.045) return "perfect";
  if (force >= lo && force <= hi) return "good";
  if (force < lo) return "weak";
  return "hard";
}

function applyStrike(s: SimState, kind: StrikeKind, design: SwordDesign) {
  const steel = STEELS[design.steel];
  const inHeat = s.heat >= steel.heatMin - 0.08 && s.heat <= steel.heatMax + 0.1;
  let shapeGain = 0;
  if (kind === "perfect") shapeGain = 0.16;
  else if (kind === "good") shapeGain = 0.11;
  else if (kind === "hard") shapeGain = 0.07;
  else shapeGain = 0.03;

  if (!inHeat) {
    shapeGain *= s.heat < steel.heatMin ? 0.35 : 0.55;
    s.warp += s.heat > steel.heatMax ? 0.08 : 0.03;
  }
  if (kind === "hard") s.warp += 0.1;
  if (kind === "perfect" && inHeat) {
    s.warp = Math.max(0, s.warp - 0.02);
    s.perfects += 1;
  }

  s.shape = clamp(s.shape + shapeGain, 0, 1);
  s.strikes += 1;
  s.warp = clamp(s.warp, 0, 1);
  s.along = clamp((s.strikes - 0.4) / Math.max(1, s.maxStrikes - 1), 0.1, 0.92);
  const where = s.along < 0.34 ? "junto à guarda" : s.along < 0.67 ? "no meio da lâmina" : "perto da ponta";

  if (!inHeat && s.heat < steel.heatMin) {
    s.lastMessage = `Frio demais, ${where}.`;
  } else if (kind === "perfect") {
    s.lastMessage = `Golpe limpo ${where}.`;
  } else if (kind === "good") {
    s.lastMessage = `Bom golpe ${where}. Siga em frente.`;
  } else if (kind === "weak") {
    s.lastMessage = `Fraco demais ${where}.`;
  } else {
    s.lastMessage = `Força demais ${where}. O gume entorta.`;
  }
}

function strainBlade(s: SimState, kind: StrikeKind, design: SwordDesign): boolean {
  const steel = STEELS[design.steel];
  const progress = s.strikes / s.maxStrikes;
  const cold = s.heat < steel.heatMin - 0.05;
  const mistimed = kind === "weak" || kind === "hard";
  if (!mistimed && !cold) {
    s.missStreak = 0;
    s.integrity = clamp(s.integrity + (kind === "perfect" ? 0.07 : 0.03), 0, 1);
    return false;
  }
  if (!mistimed && cold) {
    s.integrity = clamp(s.integrity - 0.06, 0, 1);
    const where = s.along < 0.34 ? "junto à guarda" : s.along < 0.67 ? "no meio da lâmina" : "perto da ponta";
    s.lastMessage = `No tempo, mas o ferro estava frio — ${where}.`;
    return s.integrity <= 0.02 ? markBroken(s) : false;
  }
  s.missStreak += 1;
  s.integrity = clamp(s.integrity - (0.12 + s.missStreak * 0.05 + progress * 0.07), 0, 1);
  if (s.integrity <= 0.02 || s.missStreak >= 3) return markBroken(s);
  if (s.missStreak >= 2) s.lastMessage = "Outro erro. A lâmina está a um golpe de partir.";
  return false;
}

function markBroken(s: SimState) {
  s.broken = true;
  s.integrity = 0;
  s.lastMessage = "A lâmina partiu. O ritmo dos golpes abriu o ferro.";
  return true;
}

export function finishSword(s: SimState, design: SwordDesign) {
  recomputeQuality(s, design);
  return {
    quality: Math.round(s.quality),
    grade: gradeFor(s.quality),
    heatScore: Math.round(s.heatScore),
    forgeScore: Math.round(clamp(s.shape * 100 - s.warp * 38, 0, 100)),
    quenchScore: Math.round(s.quenchScore),
    warp: s.warp,
    broken: s.broken,
    perfects: s.perfects,
    strikes: s.strikes,
    integrity: s.integrity,
  };
}
