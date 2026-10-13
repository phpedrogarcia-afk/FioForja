import type { Collection, FinishedSword, ForgeRank, RuneSchool, SwordDesign } from "./types";
import { DEFAULT_DESIGN, GUARDS, POMMELS, PROFILES, STEELS, WRAPS, gradeFor } from "./catalog";
import { emptyCollection } from "./collection";
const KEY = "a-forja-save";
const VERSION = 3;
export interface SaveData {
  version: number;
  gallery: FinishedSword[];
  lastDesign: SwordDesign;
  muted: boolean;
  shake: boolean;
  collection: Collection;
}
const defaults = (): SaveData => ({
  version: VERSION,
  gallery: [],
  lastDesign: { ...DEFAULT_DESIGN },
  muted: false,
  shake: true,
  collection: emptyCollection(),
});
const object = (v: unknown): Record<string, unknown> =>
  v && typeof v === "object" ? (v as Record<string, unknown>) : {};
const finite = (v: unknown, fallback: number, min = 0, max = 100) =>
  typeof v === "number" && Number.isFinite(v) ? Math.max(min, Math.min(max, v)) : fallback;
function designFrom(value: unknown): SwordDesign {
  const raw = object(value);
  const member = <T extends string>(v: unknown, values: Record<T, unknown>, fallback: T): T =>
    typeof v === "string" && Object.hasOwn(values, v) ? (v as T) : fallback;
  return {
    name: typeof raw.name === "string" ? raw.name.slice(0, 28) : DEFAULT_DESIGN.name,
    profile: member(raw.profile, PROFILES, "long"),
    steel: member(raw.steel, STEELS, "steel"),
    wrap: member(raw.wrap, WRAPS, "leather"),
    guard: member(raw.guard, GUARDS, "cross"),
    pommel: member(raw.pommel, POMMELS, "disc"),
    runes: raw.runes === true,
    runeSchool: ["ember", "frost", "gold", "ancestral"].includes(String(raw.runeSchool))
      ? (raw.runeSchool as RuneSchool)
      : "ember",
    inscription: typeof raw.inscription === "string" ? raw.inscription.slice(0, 24) : "",
    length: finite(raw.length, 1, 0.75, 1.2),
  };
}
export function migrateSave(value: unknown): SaveData {
  const raw = object(value),
    d = defaults();
  const gallery = Array.isArray(raw.gallery)
    ? raw.gallery.map((value, index): FinishedSword => {
        const s = object(value),
          q = finite(s.quality, 40),
          stats = object(s.stats);
        const sword: FinishedSword = {
          id: typeof s.id === "string" ? s.id : `legacy-${index}`,
          design: designFrom(s.design),
          quality: q,
          grade: s.broken ? "Falha" : gradeFor(q),
          heatScore: finite(s.heatScore, 0),
          forgeScore: finite(s.forgeScore, 0),
          quenchScore: finite(s.quenchScore, 0),
          warp: finite(s.warp, 0, 0, 1),
          createdAt: finite(s.createdAt, 0, 0, Number.MAX_SAFE_INTEGER),
          rarity: ["quebrada", "comum", "incomum", "rara", "epica", "lendaria"].includes(
            String(s.rarity),
          )
            ? (s.rarity as FinishedSword["rarity"])
            : "comum",
          title: typeof s.title === "string" ? s.title : designFrom(s.design).name,
          stats: {
            atk: finite(stats.atk, Math.round(8 + q * 0.12), 0, 9999),
            def: finite(stats.def, Math.round(6 + q * 0.08), 0, 9999),
            agi: finite(stats.agi, Math.round(7 + q * 0.08), 0, 9999),
          },
          boon: ["nenhum", "runas", "elfico", "runas-elfico"].includes(String(s.boon))
            ? (s.boon as FinishedSword["boon"])
            : "nenhum",
          broken: s.broken === true,
          drops: [],
        };
        if (raw.version === VERSION) {
          sword.rank = ["S", "A", "B", "C", "F"].includes(String(s.rank))
            ? (s.rank as ForgeRank)
            : undefined;
          sword.performance =
            typeof s.performance === "number" ? finite(s.performance, 0) : undefined;
          sword.drops = Array.isArray(s.drops)
            ? (s.drops.filter((v) => {
                const r = object(v);
                return (
                  typeof r.id === "string" &&
                  Array.isArray(r.unlocks) &&
                  typeof r.amount === "number"
                );
              }) as FinishedSword["drops"])
            : [];
          sword.history = Array.isArray(s.history)
            ? (s.history.filter((v) => {
                const r = object(v);
                return typeof r.accuracy === "number" && typeof r.thermal === "number";
              }) as FinishedSword["history"])
            : [];
          sword.reheats = finite(s.reheats, 0, 0, 1000);
        }
        return sword;
      })
    : [];
  const c = object(raw.collection),
    items: Record<string, number> = {};
  for (const [id, count] of Object.entries(object(c.items)))
    items[id] = finite(count, 0, 0, Number.MAX_SAFE_INTEGER);
  const strings = (v: unknown) =>
    Array.isArray(v) ? v.filter((s): s is string => typeof s === "string") : [];
  return {
    ...d,
    gallery,
    lastDesign: designFrom(raw.lastDesign),
    muted: raw.muted === true,
    shake: raw.shake !== false,
    collection: {
      claimed: strings(c.claimed),
      items,
      unlocked: [...new Set([...d.collection.unlocked, ...strings(c.unlocked)])],
      scrap: finite(c.scrap, 0, 0, Number.MAX_SAFE_INTEGER),
    },
  };
}
export function loadSave(): SaveData {
  if (typeof window === "undefined") return defaults();
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? migrateSave(JSON.parse(raw)) : defaults();
  } catch {
    return defaults();
  }
}
export function writeSave(data: SaveData): boolean {
  if (typeof window === "undefined") return false;
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...data, version: VERSION }));
    return true;
  } catch {
    return false;
  }
}
