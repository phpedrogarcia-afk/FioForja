import type { FinishedSword, SwordDesign } from "./types";
import { DEFAULT_DESIGN } from "./catalog";

const KEY = "a-forja-save";
const VERSION = 1;

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

function migrate(raw: SaveData): SaveData {
  const next = { ...defaults, ...raw, lastDesign: { ...DEFAULT_DESIGN, ...raw.lastDesign } };
  next.version = VERSION;
  next.gallery = Array.isArray(raw.gallery) ? raw.gallery.slice(0, 24) : [];
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
