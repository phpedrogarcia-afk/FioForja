import type { FinishedSword, SwordDesign } from "./types";
import { DEFAULT_DESIGN } from "./catalog";

const KEY = "a-forja-save";
const VERSION = 2;

export interface SaveData {
  version: number;
  gallery: FinishedSword[];
  lastDesign: SwordDesign;
  muted: boolean;
  shake: boolean;
}

const defaults: SaveData = {
  version: VERSION,
  gallery: [],
  lastDesign: DEFAULT_DESIGN,
  muted: false,
  shake: true,
};

function normalizeSword(raw: Partial<FinishedSword>): FinishedSword {
  const quality = raw.quality ?? 40;
  return {
    id: raw.id ?? `${Date.now()}`,
    design: { ...DEFAULT_DESIGN, ...raw.design },
    quality,
    grade: raw.grade ?? "Comum",
    heatScore: raw.heatScore ?? 0,
    forgeScore: raw.forgeScore ?? 0,
    quenchScore: raw.quenchScore ?? 0,
    warp: raw.warp ?? 0,
    createdAt: raw.createdAt ?? Date.now(),
    rarity: raw.rarity ?? (quality >= 88 ? "rara" : quality >= 60 ? "incomum" : "comum"),
    title: raw.title ?? raw.design?.name ?? "Lâmina antiga",
    stats: raw.stats ?? {
      atk: Math.round(8 + quality * 0.12),
      def: Math.round(6 + quality * 0.08),
      agi: Math.round(7 + quality * 0.08),
    },
    boon: raw.boon ?? "nenhum",
    broken: raw.broken ?? false,
  };
}

function migrate(raw: SaveData): SaveData {
  const next = { ...defaults, ...raw, lastDesign: { ...DEFAULT_DESIGN, ...raw.lastDesign } };
  next.version = VERSION;
  next.gallery = Array.isArray(raw.gallery) ? raw.gallery.slice(0, 24).map((s) => normalizeSword(s)) : [];
  return next;
}

export function loadSave(): SaveData {
  if (typeof window === "undefined") return structuredClone(defaults);
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return structuredClone(defaults);
    const parsed = JSON.parse(raw) as SaveData;
    return migrate(parsed);
  } catch {
    return structuredClone(defaults);
  }
}

export function writeSave(data: SaveData) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...data, version: VERSION }));
  } catch {
    /* private mode / quota */
  }
}
