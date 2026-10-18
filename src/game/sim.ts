import { STEELS, calculateSwordAttributes, gradeFor, rarityFor } from "./catalog.ts";
import type { EquippedWorkshopGear, FinishedSword, ForgeRewardsData, ForgeZone, HammerType, PhysicalBladeProfile, SimState, StrikeKind, SwordDesign } from "./types.ts";

export interface SimInput {
  charging: boolean;
  action: boolean;
  reheat: boolean;
  switchZone?: ForgeZone;
  switchHammer?: HammerType;
}

export interface SimEvent {
  sfx?: "clang" | "whoosh" | "hiss" | "pull" | "crack" | "shatter" | "rune";
  kind?: StrikeKind;
  force?: number;
  trauma?: number;
  hitstop?: number;
  message?: string;
  finished?: boolean;
  broken?: boolean;
}

export function createSim(
  design: SwordDesign,
  options?: { hammer?: HammerType; equippedGear?: EquippedWorkshopGear },
): SimState {
  const steel = STEELS[design.steel];
  const equippedGear: EquippedWorkshopGear = options?.equippedGear ?? {
    hammer: options?.hammer ?? "standard",
    anvil: "anvil_cast",
    furnace: "furnace_coal",
    quench: "quench_water",
  };
  const activeHammer = options?.hammer ?? equippedGear.hammer ?? "standard";

  const initialProfile: PhysicalBladeProfile = {
    baseWidth: 0.16,
    midWidth: 0.16,
    tipWidth: 0.16,
    distalTaper: 0.08,
    fullerDepth: 0,
    bevelSharpness: 0,
    hammerMarksCount: 0,
  };

  return {
    phase: "heat",
    heat: 0.1,
    heatScore: 0,
    shape: 0.16,
    physicalProfile: initialProfile,
    quality: 42,
    warp: 0,
    strikes: 0,
    maxStrikes: 8,
    force: 0,
    charging: false,
    sweetCenter: 0.66,
    sweetWidth: steel.sweetWidth + (equippedGear.anvil === "anvil_master" ? 0.025 : 0),
    quenchFill: 0,
    quenching: false,
    quenchScore: 0,
    quenchSteam: 0,
    reheating: false,
    strikeKind: null,
    strikeAnim: 0,
    sparkAnim: 0,
    done: false,
    lastMessage: "Espere o ferro atingir a cor amarelo-laranja ideal e retire para a bigorna.",
    integrity: 100,
    cracks: 0,
    structuralState: "stable",
    broken: false,
    runicCharge: 0,
    targetZone: "mid",
    zoneProgress: { base: 0, mid: 0, tip: 0 },
    activeHammer,
    equippedGear,
    history: [],
  };
}

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function recomputeQuality(s: SimState, design: SwordDesign) {
  const steel = STEELS[design.steel];
  const forge = clamp(s.shape * 100 - s.warp * 38, 0, 100);
  const q =
    s.heatScore * 0.24 +
    forge * 0.44 +
    s.quenchScore * 0.22 +
    steel.hardness * 10 -
    s.warp * 22 -
    s.cracks * 18;
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
    const heatGainRate = s.equippedGear?.furnace === "furnace_bluefire" ? 0.22 : 0.16;
    s.heat = clamp(s.heat + dt * heatGainRate, 0, 1);
    const mid = (steel.heatMin + steel.heatMax) / 2;
    if (s.heat >= steel.heatMin && s.heat <= steel.heatMax) {
      s.lastMessage = "Calor ideal! O aço está plástico e pronto para a bigorna.";
    } else if (s.heat < steel.heatMin) {
      s.lastMessage = "Ainda frio. Deixe o fogo da fornalha penetrar o tarugo.";
    } else if (s.heat < 0.92) {
      s.lastMessage = "Quente demais! O aço começará a queimar carbono. Retire!";
    } else {
      s.lastMessage = "O aço está queimando! Descarbonização acelerada.";
      s.warp = clamp(s.warp + dt * 0.08, 0, 1);
      s.integrity = clamp(s.integrity - dt * 10, 20, 100);
    }

    if (input.action) {
      const dist = Math.abs(s.heat - mid);
      const window = (steel.heatMax - steel.heatMin) / 2;
      s.heatScore = clamp(100 * (1 - dist / (window + 0.12)), 20, 100);
      if (s.heat > 0.93) s.heatScore = Math.min(s.heatScore, 38);
      if (s.heat < 0.4) s.heatScore = Math.min(s.heatScore, 36);
      s.phase = "forge";
      s.lastMessage = "Segure para erguer o martelo e solte na faixa ideal.";
      s.sweetCenter = 0.64;
      event.sfx = "pull";
      event.message = s.lastMessage;
      recomputeQuality(s, design);
      return event;
    }
  }

  if (s.phase === "forge") {
    if (input.switchZone && input.switchZone !== s.targetZone) {
      s.targetZone = input.switchZone;
      const zoneNames = { base: "Base (Ricasso)", mid: "Centro (Corpo)", tip: "Ponta (Ápice)" };
      s.lastMessage = `Posicionando martelo na ${zoneNames[s.targetZone]}.`;
    }

    if (input.switchHammer && input.switchHammer !== s.activeHammer) {
      s.activeHammer = input.switchHammer;
      const hammerNames = { precision: "Martelo de Pena (Precisão)", standard: "Martelo Padrão", sledge: "Marreta Pesada" };
      s.lastMessage = `Equipado: ${hammerNames[s.activeHammer]}.`;
    }

    s.sweetCenter = 0.62 + Math.sin(time * 0.85) * 0.11;
    const hammerWidthBonus = s.activeHammer === "precision" ? 0.03 : s.activeHammer === "sledge" ? -0.02 : 0;
    const anvilBonus = s.equippedGear?.anvil === "anvil_master" ? 0.025 : 0;
    s.sweetWidth = Math.max(0.06, steel.sweetWidth + hammerWidthBonus + anvilBonus);

    if (s.reheating) {
      const reheatRate = s.equippedGear?.furnace === "furnace_bluefire" ? 0.55 : 0.42;
      s.heat = clamp(s.heat + dt * reheatRate, 0, 0.88);
      s.integrity = clamp(s.integrity + dt * 6, 0, 100);
      s.lastMessage = "Reaquecendo na fornalha… Aliviando tensões internas.";
      if (s.heat >= 0.76) s.reheating = false;
    } else {
      const coolingRate = s.equippedGear?.furnace === "furnace_bluefire" ? 0.027 : 0.038;
      s.heat = clamp(s.heat - dt * coolingRate, 0.08, 1);
    }

    if (input.reheat && !s.reheating && s.heat < 0.58) {
      s.reheating = true;
      event.sfx = "pull";
      return event;
    }

    if (input.charging && !s.reheating) {
      if (!s.charging && s.force < 0.05) event.sfx = "whoosh";
      s.charging = true;
      const chargeSpeed = s.activeHammer === "precision" ? 1.45 : s.activeHammer === "sledge" ? 0.9 : 1.18;
      s.force = clamp(s.force + dt * chargeSpeed, 0, 1);
    } else if (s.charging) {
      const kind = gradeStrike(s.force, s.sweetCenter, s.sweetWidth);
      const usedForce = s.force;
      applyStrike(s, kind, design, event);
      s.charging = false;
      s.force = 0;
      s.strikeKind = kind;
      s.strikeAnim = 0.38;
      s.sparkAnim = 0.42;

      // Event SFX handling
      if (s.broken) {
        event.sfx = "shatter";
        event.trauma = 0.9;
        event.hitstop = 0.12;
        event.finished = true;
        event.broken = true;
        return event;
      }

      if (event.sfx !== "crack" && event.sfx !== "rune") {
        event.sfx = "clang";
      }
      event.kind = kind;
      event.force = usedForce;
      event.trauma = kind === "perfect" ? 0.55 : kind === "hard" ? 0.72 : kind === "good" ? 0.38 : 0.2;
      event.hitstop = kind === "perfect" || kind === "hard" ? 0.06 : 0.03;
      event.message = s.lastMessage;
      recomputeQuality(s, design);

      if (s.strikes >= s.maxStrikes && !s.broken) {
        s.phase = "quench";
        s.heat = Math.max(s.heat, 0.52);
        s.lastMessage = "Hora da têmpera! Mergulhe a lâmina na cuba e solte na faixa ideal.";
      }
      return event;
    }

    if (s.heat < 0.34 && !s.reheating) {
      s.lastMessage = "PERIGO: O ferro esfriou! Martelar agora causará trincas. Reaqueça!";
    }
  }

  if (s.phase === "quench") {
    if (input.charging) {
      s.quenching = true;
      s.quenchFill = clamp(s.quenchFill + dt * 0.48, 0, 1);
      s.quenchSteam = clamp(s.quenchSteam + dt * 1.5, 0, 1);
      if (s.quenchFill > 0.42 && s.quenchFill < 0.62) {
        s.lastMessage = "Faixa perfeita de têmpera — solte agora!";
      } else if (s.quenchFill >= 0.62) {
        s.lastMessage = "Tempo demais no banho! Risco de empenamento térmico.";
      } else {
        s.lastMessage = "Mergulhando no banho de têmpera…";
      }
    } else if (s.quenching) {
      const ideal = 0.52;
      const dist = Math.abs(s.quenchFill - ideal);
      s.quenchScore = clamp(100 * (1 - dist / 0.38), 12, 100);
      const isOilQuench = s.equippedGear?.quench === "quench_oil";

      if (s.quenchFill < 0.22) {
        s.quenchScore = Math.min(s.quenchScore, 40);
        s.lastMessage = isOilQuench
          ? "Têmpera branda em óleo. Estrutura parcialmente martensítica."
          : "Têmpera incompleta. O aço permaneceu brando.";
      } else if (s.quenchFill > 0.78) {
        const warpPenalty = isOilQuench ? 0.07 : 0.18;
        const integrityPenalty = isOilQuench ? 6 : 15;
        s.warp = clamp(s.warp + warpPenalty, 0, 1);
        s.integrity = clamp(s.integrity - integrityPenalty, 0, 100);
        s.lastMessage = isOilQuench
          ? "Têmpera longa em óleo — leve empenamento evitado por resfriamento brando."
          : "Choque térmico violento! O gume curvou pelo excesso de tempo na água.";
      } else {
        s.lastMessage = isOilQuench
          ? "Têmpera magistral em óleo vegetal! Martensita refinada e tenacidade suprema."
          : "Têmpera perfeita! Martensita consolidada e fio cristalizado.";
      }

      recomputeQuality(s, design);
      s.done = true;
      event.sfx = "hiss";
      event.finished = true;
      event.trauma = 0.25;
      event.message = s.lastMessage;
      return event;
    } else {
      s.quenchSteam = Math.max(0, s.quenchSteam - dt * 0.35);
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

function applyStrike(s: SimState, kind: StrikeKind, design: SwordDesign, event: SimEvent) {
  const steel = STEELS[design.steel];
  const isCold = s.heat < steel.heatMin - 0.04;
  const isOverheated = s.heat > steel.heatMax + 0.08;
  const inHeat = !isCold && !isOverheated;

  // Multi-zone register
  s.zoneProgress[s.targetZone] = (s.zoneProgress[s.targetZone] || 0) + 1;

  // Base shape gain modified by hammer type
  let shapeGain = 0;
  if (kind === "perfect") shapeGain = 0.16;
  else if (kind === "good") shapeGain = 0.12;
  else if (kind === "hard") shapeGain = 0.07;
  else shapeGain = 0.035;

  const hammerShapeMult = s.activeHammer === "sledge" ? 1.45 : s.activeHammer === "precision" ? 0.85 : 1.0;
  const hammerStressMult = s.activeHammer === "sledge" ? 1.6 : s.activeHammer === "precision" ? 0.65 : 1.0;
  shapeGain *= hammerShapeMult;

  // Multi-segment PhysicalBladeProfile dynamic deformation
  s.physicalProfile.hammerMarksCount += 1;
  const zone = s.targetZone;
  let zoneMult = kind === "perfect" ? 1.25 : kind === "good" ? 1.0 : kind === "hard" ? 0.75 : 0.4;
  if (isCold) zoneMult *= 0.35;

  if (zone === "base") {
    s.physicalProfile.baseWidth = clamp(s.physicalProfile.baseWidth + 0.16 * zoneMult * hammerShapeMult, 0, 1);
    s.physicalProfile.bevelSharpness = clamp(s.physicalProfile.bevelSharpness + 0.07 * zoneMult, 0, 1);
  } else if (zone === "mid") {
    s.physicalProfile.midWidth = clamp(s.physicalProfile.midWidth + 0.17 * zoneMult * hammerShapeMult, 0, 1);
    s.physicalProfile.fullerDepth = clamp(s.physicalProfile.fullerDepth + 0.18 * zoneMult, 0, 1);
    s.physicalProfile.bevelSharpness = clamp(s.physicalProfile.bevelSharpness + 0.12 * zoneMult, 0, 1);
  } else if (zone === "tip") {
    s.physicalProfile.tipWidth = clamp(s.physicalProfile.tipWidth + 0.18 * zoneMult * hammerShapeMult, 0, 1);
    s.physicalProfile.distalTaper = clamp(s.physicalProfile.distalTaper + 0.19 * zoneMult, 0, 1);
    s.physicalProfile.bevelSharpness = clamp(s.physicalProfile.bevelSharpness + 0.16 * zoneMult, 0, 1);
  }

  s.history.push({
    strike: s.strikes + 1,
    kind,
    force: s.force,
    inHeat,
    zone: s.targetZone,
  });

  // Structural stress and integrity calculations
  if (isCold) {
    // Cold hammering creates dangerous brittle stress fractures
    shapeGain *= 0.25;
    const baseStress = kind === "hard" ? 38 : kind === "good" ? 22 : 14;
    const stress = baseStress * hammerStressMult;
    s.integrity -= stress;
    s.warp += 0.07;
    s.lastMessage = `Golpe no ferro frio na ${s.targetZone.toUpperCase()}! O aço resiste e sofre estresse.`;
  } else if (isOverheated) {
    shapeGain *= 0.55;
    s.integrity -= 12;
    s.warp += 0.09;
    s.lastMessage = "Ferro quase queimando! A espinha deforma com facilidade excessiva.";
  } else {
    // Normal / Ideal heat
    if (kind === "perfect") {
      s.warp = Math.max(0, s.warp - 0.025);
      if (s.equippedGear?.anvil === "anvil_master") {
        s.warp = Math.max(0, s.warp - 0.015);
      }
      if (s.targetZone === "base") {
        s.integrity = Math.min(100, s.integrity + 3);
        s.lastMessage = "Base consolidada! O ricasso ganha tenacidade excepcional.";
      } else if (s.targetZone === "mid") {
        s.runicCharge = clamp(s.runicCharge + 0.28, 0, 1);
        s.lastMessage = "Golpe magistral no corpo! As ondas de choque alinham o gume perfeitamente.";
        if (design.runes && s.runicCharge > 0.5) event.sfx = "rune";
      } else {
        s.lastMessage = "Ponta estirada com precisão cirúrgica!";
      }
    } else if (kind === "good") {
      const zoneMsgs = {
        base: "Bom golpe na base. Espessura do ricasso uniforme.",
        mid: "Bom golpe no centro. O perfil da lâmina se desenvolve com precisão.",
        tip: "Bom golpe na ponta. Geometria de corte refinada.",
      };
      s.lastMessage = zoneMsgs[s.targetZone];
    } else if (kind === "hard") {
      s.integrity -= 10 * hammerStressMult;
      s.warp += 0.08;
      s.lastMessage = "Força excessiva! O aço sofreu deformação localizada.";
    } else {
      s.lastMessage = "Golpe fraco. A martelada não deslocou massa suficiente.";
    }
  }

  // Check cracking and failure
  if (s.integrity <= 0 || (s.cracks >= 2 && (isCold || kind === "hard"))) {
    s.broken = true;
    s.structuralState = "broken";
    s.done = true;
    s.lastMessage = "FALHA ESTRUTURAL: A espada quebrou sob o impacto do martelo!";
    s.quality = 8;
    return;
  }

  if (s.integrity < 38) {
    s.cracks = 2;
    s.structuralState = "cracked";
    event.sfx = "crack";
    s.lastMessage = "TRINCA CRÍTICA: Uma fissura surgiu no aço! Reaqueça antes de novo golpe!";
  } else if (s.integrity < 65) {
    s.cracks = 1;
    s.structuralState = "damaged";
  } else if (s.warp > 0.15) {
    s.structuralState = "deformed";
  } else {
    s.structuralState = "stable";
  }

  s.shape = clamp(s.shape + shapeGain, 0, 1);
  s.strikes += 1;
  s.warp = clamp(s.warp, 0, 1);
}

export function finishSword(s: SimState, design: SwordDesign): FinishedSword {
  recomputeQuality(s, design);
  const q = Math.round(s.quality);
  const grade = gradeFor(q);
  const rarity = rarityFor(design, q);
  const heatScore = Math.round(s.heatScore);
  const forgeScore = Math.round(clamp(s.shape * 100 - s.warp * 38, 0, 100));
  const quenchScore = Math.round(s.quenchScore);
  const attrs = calculateSwordAttributes(design, q, s.warp, heatScore, forgeScore, quenchScore);

  // Additional perks based on multi-zone harmony and tool mastery
  if (s.zoneProgress.base >= 2 && s.zoneProgress.mid >= 2 && s.zoneProgress.tip >= 2) {
    attrs.perks.push("Harmonia da Forja: Estiramento uniforme entre base, centro e ponta");
    attrs.damage += 12;
    attrs.agility += 8;
  }
  if (s.activeHammer === "precision" && q >= 85) {
    attrs.perks.push("Pena de Mestre: Fio afiado com martelo de precisão");
    attrs.agility += 10;
  }
  if (s.activeHammer === "sledge" && q >= 85) {
    attrs.perks.push("Massa de Guerra: Forja pesada com marreta de impacto");
    attrs.damage += 15;
  }
  if (s.equippedGear?.anvil === "anvil_master") {
    attrs.perks.push("Bigorna Magistral: Rebote perfeito sem deflexão interna");
    attrs.defense += 8;
  }
  if (s.equippedGear?.quench === "quench_oil") {
    attrs.perks.push("Banho em Óleo: Matriz cristalina homogênea sem microtrincas");
    attrs.durability = Math.min(100, attrs.durability + 10);
  }

  return {
    id: `${Date.now()}`,
    design,
    quality: q,
    grade,
    rarity,
    heatScore,
    forgeScore,
    quenchScore,
    warp: s.warp,
    createdAt: Date.now(),
    damage: attrs.damage,
    defense: attrs.defense,
    agility: attrs.agility,
    durability: attrs.durability,
    upgradesApplied: 0,
    flaws: attrs.flaws,
    perks: attrs.perks,
    structuralState: s.structuralState,
    cracks: s.cracks,
    physicalProfile: { ...s.physicalProfile },
    history: s.history,
  };
}

export function generateForgeRewards(sword: FinishedSword): ForgeRewardsData {
  const q = sword.quality;
  let rank = "C";
  let gold = 500;
  let rubies = 15;
  let diamonds = 10;

  if (q >= 95) {
    rank = "S (98%)";
    gold = 4850;
    rubies = 165;
    diamonds = 165;
  } else if (q >= 88) {
    rank = "A (90%)";
    gold = 2950;
    rubies = 95;
    diamonds = 80;
  } else if (q >= 75) {
    rank = "B (78%)";
    gold = 1600;
    rubies = 45;
    diamonds = 35;
  } else {
    rank = "C (55%)";
    gold = 850;
    rubies = 20;
    diamonds = 15;
  }

  const items = [
    {
      id: "rune_fire",
      name: "Fiery Rune Stone",
      type: "Pedra Rúnica",
      rarity: (q >= 90 ? "Lendária" : "Rara") as import("./types").RarityGrade,
      icon: "🔥",
      description: "Pedra primordial de calor rúnico que confere chama perene às incisões da lâmina.",
    },
    {
      id: "crossguard_damascus",
      name: "Damascus Crossguard",
      type: "Componente de Guarda",
      rarity: (q >= 95 ? "Lendária" : "Épica") as import("./types").RarityGrade,
      icon: "⚔️",
      description: "Guarda em aço de Damasco gravada com volutas nórdicas e equilíbrio supremo.",
    },
    {
      id: "grip_dragon",
      name: "Dragon Leather Sword Grip",
      type: "Empunhadura",
      rarity: (q >= 85 ? "Épica" : "Rara") as import("./types").RarityGrade,
      icon: "🐉",
      description: "Couro escamoso de alta densidade que repele umidade e oferece aderência inabalável.",
    },
    {
      id: "ingot_starmetal",
      name: "Star Metal Ingot",
      type: "Lingote Raro",
      rarity: (q >= 90 ? "Relíquia" : "Épica") as import("./types").RarityGrade,
      icon: "✨",
      description: "Lingotes celestes reluzentes forjados no coração de meteoritos ancestrais.",
    },
  ];

  return {
    rank,
    scorePercent: q,
    gold,
    rubies,
    diamonds,
    items,
  };
}
