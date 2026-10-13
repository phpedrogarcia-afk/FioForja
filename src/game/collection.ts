import type { Collection, RewardDrop } from "./types";
export function emptyCollection(): Collection {
  return {
    claimed: [],
    items: {},
    unlocked: [
      "iron",
      "steel",
      "leather",
      "linen",
      "bone",
      "cross",
      "curved",
      "disc",
      "sphere",
      "ember",
    ],
    scrap: 0,
  };
}
export function claimRewards(
  collection: Collection,
  swordId: string,
  drops: RewardDrop[],
): Collection {
  if (collection.claimed.includes(swordId)) return collection;
  const next: Collection = {
    claimed: [...collection.claimed, swordId],
    items: { ...collection.items },
    unlocked: [...collection.unlocked],
    scrap: collection.scrap,
  };
  for (const drop of drops) {
    next.items[drop.id] = (next.items[drop.id] ?? 0) + drop.amount;
    if (drop.id === "scrap") next.scrap += drop.amount;
    for (const unlock of drop.unlocks)
      if (!next.unlocked.includes(unlock)) next.unlocked.push(unlock);
  }
  return next;
}
export function recycleScrap(collection: Collection): Collection {
  if (collection.scrap < 3) return collection;
  return {
    ...collection,
    scrap: collection.scrap - 3,
    items: {
      ...collection.items,
      scrap: Math.max(0, (collection.items.scrap ?? collection.scrap) - 3),
      refined: (collection.items.refined ?? 0) + 1,
    },
  };
}
