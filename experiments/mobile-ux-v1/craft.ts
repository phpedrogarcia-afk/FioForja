import type { FinishedSword } from "../../src/game/types.ts";
import { specimens } from "./specimens.ts";

export interface CraftDonor {
  sword: FinishedSword;
  protected?: boolean;
  synthetic?: boolean;
}

// Three real emulator examples plus an explicitly synthetic fourth Rare.
// Never load the owner's inventory or change the original specimens.
export const craftDonors: CraftDonor[] = [
  ...specimens.filter(s => s.rarity === "Rara").map(sword => ({ sword })),
  { sword: { ...specimens[0], id: "craft-demo-fourth-rare", design: { ...specimens[0].design, name: "Guarda da Fronteira · IV" } }, synthetic: true },
  ...specimens.filter(s => s.rarity !== "Rara").map(sword => ({ sword })),
  { sword: { ...specimens[1], id: "craft-demo-protected", design: { ...specimens[1].design, name: "Lâmina protegida" } }, protected: true, synthetic: true },
];

export function donorBlockReason(donor: CraftDonor, selected: CraftDonor[]): string | null {
  const s = donor.sword;
  if (donor.protected) return "Espada protegida";
  if (s.broken || s.structuralState === "broken") return "Lâmina quebrada";
  if (s.isTraining) return "Espada de treino";
  if (s.commissionDelivered) return "Entregue em encomenda";
  if (selected.length && selected[0].sword.rarity !== s.rarity) return `Selecione outra ${selected[0].sword.rarity}`;
  return null;
}

export function selectionIssue(donors: CraftDonor[], ids: string[]): string | null {
  if (ids.length !== 4) return "Selecione quatro espadas da mesma raridade.";
  if (new Set(ids).size !== 4) return "Cada espaço precisa de uma espada diferente.";
  const selected = ids.map(id => donors.find(d => d.sword.id === id));
  if (selected.some(d => !d)) return "Uma doadora não está mais disponível.";
  for (const donor of selected as CraftDonor[]) {
    const reason = donorBlockReason(donor, selected as CraftDonor[]);
    if (reason) return reason;
  }
  return null;
}
