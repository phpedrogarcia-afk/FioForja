/** Shared emergency-recovery threshold and bazaar price for one basic iron ingot. */
export const BASIC_IRON_RECOVERY_COST = 50;

import type { SteelId } from "./types.ts";

export interface CanonicalMaterialInfo {
  key: string;
  aliases: string[];
  name: string;
  steelId: SteelId;
  rarity: "Comum" | "Incomum" | "Rara" | "Épica" | "Lendária" | "Relíquia";
  icon: string;
  description: string;
}

export const CANONICAL_MATERIALS: Record<SteelId, CanonicalMaterialInfo> = {
  iron: {
    key: "iron_ingot",
    aliases: ["iron", "iron_ingot"],
    name: "Lingote de Ferro Batido",
    steelId: "iron",
    rarity: "Comum",
    icon: "🧱",
    description: "Ferro purificado com teor moderado de carbono. Insumo fundamental para armas de oficina.",
  },
  steel: {
    key: "steel_ingot",
    aliases: ["steel", "steel_ingot"],
    name: "Lingote de Aço Forjado",
    steelId: "steel",
    rarity: "Incomum",
    icon: "🪙",
    description: "Aço refinado com tratamento térmico preliminar, ideal para lâminas militares.",
  },
  damascus: {
    key: "damascus_billet",
    aliases: ["damascus", "damascus_billet"],
    name: "Tarugo Dobrado de Damasco",
    steelId: "damascus",
    rarity: "Rara",
    icon: "🌊",
    description: "Aço dobrado em centenas de camadas, exibindo ondulações hidrográficas e elasticidade incomparável.",
  },
  blacksteel: {
    key: "blacksteel_chunk",
    aliases: ["blacksteel", "blacksteel_chunk"],
    name: "Aço Negro dos Abismos",
    steelId: "blacksteel",
    rarity: "Rara",
    icon: "⬛",
    description: "Liga enriquecida com grafite e minério vulcânico. Retém o fio sob choques extremos.",
  },
  elven_silver: {
    key: "elven_silver_ingot",
    aliases: ["elven_silver", "elven_silver_ingot"],
    name: "Lingote de Prata Élfica",
    steelId: "elven_silver",
    rarity: "Rara",
    icon: "🪙",
    description: "Liga sagrada dos elfos com reflexos lunares. Massa levíssima e resistência encantada.",
  },
  meteor: {
    key: "starmetal_ore",
    aliases: ["meteor", "starmetal_ore", "meteor_ingot"],
    name: "Fragmento de Minério Estelar",
    steelId: "meteor",
    rarity: "Épica",
    icon: "✨",
    description: "Rocha meteórica brilhante que caiu dos confins do cosmos. Irradia centelhas frias.",
  },
  ancient_alloy: {
    key: "ancient_relic_shard",
    aliases: ["ancient_alloy", "ancient_relic_shard"],
    name: "Estilhaço de Liga Primordial",
    steelId: "ancient_alloy",
    rarity: "Relíquia",
    icon: "🏺",
    description: "Resíduo de metal forjado antes do primeiro cataclismo. Dureza indecifrável e aura silenciosa.",
  },
};

/** Resolves a canonical material by steel id, canonical key or any alias. */
export function findCanonicalMaterial(keyOrSteel: string): CanonicalMaterialInfo | undefined {
  return (
    CANONICAL_MATERIALS[keyOrSteel as SteelId] ||
    Object.values(CANONICAL_MATERIALS).find(
      (info) => info.key === keyOrSteel || info.aliases.includes(keyOrSteel),
    )
  );
}

/**
 * Resolves the canonical material required for forging a given steel.
 */
export function getRequiredMaterialForSteel(steel: SteelId): CanonicalMaterialInfo {
  return CANONICAL_MATERIALS[steel] || CANONICAL_MATERIALS.iron;
}

/**
 * Returns total available stock across all known aliases of a material.
 */
export function getMaterialStock(materials: Record<string, number> | undefined, keyOrSteel: string): number {
  if (!materials) return 0;

  // Direct lookup if steelId
  const steelInfo = CANONICAL_MATERIALS[keyOrSteel as SteelId];
  if (steelInfo) {
    let sum = 0;
    const seen = new Set<string>();
    for (const alias of steelInfo.aliases) {
      if (!seen.has(alias)) {
        seen.add(alias);
        sum += typeof materials[alias] === "number" ? materials[alias] : 0;
      }
    }
    return sum;
  }

  // Lookup by canonical key or alias
  for (const info of Object.values(CANONICAL_MATERIALS)) {
    if (info.key === keyOrSteel || info.aliases.includes(keyOrSteel)) {
      let sum = 0;
      const seen = new Set<string>();
      for (const alias of info.aliases) {
        if (!seen.has(alias)) {
          seen.add(alias);
          sum += typeof materials[alias] === "number" ? materials[alias] : 0;
        }
      }
      return sum;
    }
  }

  // Fallback direct key
  return typeof materials[keyOrSteel] === "number" ? materials[keyOrSteel] : 0;
}

/**
 * Deducts specified amount of material from inventory, drawing from aliases seamlessly.
 */
export function deductMaterialStock(
  materials: Record<string, number> | undefined,
  keyOrSteel: string,
  amount = 1,
): Record<string, number> {
  const next = { ...(materials || {}) };
  let remaining = amount;

  const steelInfo =
    CANONICAL_MATERIALS[keyOrSteel as SteelId] ||
    Object.values(CANONICAL_MATERIALS).find((i) => i.key === keyOrSteel || i.aliases.includes(keyOrSteel));

  if (steelInfo) {
    // Prefer primary key first, then aliases
    const priority = [steelInfo.key, ...steelInfo.aliases.filter((a) => a !== steelInfo.key)];
    for (const alias of priority) {
      const avail = next[alias] || 0;
      if (avail > 0) {
        const take = Math.min(avail, remaining);
        next[alias] = avail - take;
        remaining -= take;
        if (remaining <= 0) break;
      }
    }
  } else {
    const cur = next[keyOrSteel] || 0;
    next[keyOrSteel] = Math.max(0, cur - remaining);
  }

  return next;
}

/**
 * Adds specified quantity of material to inventory, consolidating under the primary canonical key.
 */
export function addMaterialStock(
  materials: Record<string, number> | undefined,
  keyOrSteel: string,
  amount = 1,
): Record<string, number> {
  const next = { ...(materials || {}) };
  const steelInfo =
    CANONICAL_MATERIALS[keyOrSteel as SteelId] ||
    Object.values(CANONICAL_MATERIALS).find((i) => i.key === keyOrSteel || i.aliases.includes(keyOrSteel));

  const targetKey = steelInfo ? steelInfo.key : keyOrSteel;
  next[targetKey] = (next[targetKey] || 0) + amount;
  return next;
}

/**
 * Anti-softlock scrap recycling: converts 2x scrap into 1x iron_ingot.
 */
export function recycleScrapToIron(materials: Record<string, number> | undefined): {
  success: boolean;
  nextMaterials: Record<string, number>;
  ironCreated: number;
} {
  const next = { ...(materials || {}) };
  const scrap = next.scrap || 0;
  if (scrap < 2) {
    return { success: false, nextMaterials: next, ironCreated: 0 };
  }
  const pairs = Math.floor(scrap / 2);
  next.scrap = scrap - pairs * 2;
  next.iron_ingot = (next.iron_ingot || 0) + pairs;
  return { success: true, nextMaterials: next, ironCreated: pairs };
}
