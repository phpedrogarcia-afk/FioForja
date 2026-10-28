import type { RarityGrade } from "./types";

/** Seções internas da Coleção, na ordem canônica. */
export type CollectionSectionId =
  "arsenal" | "compendio" | "componentes" | "runas" | "nucleos" | "comparar";

export interface CollectionSection {
  id: CollectionSectionId;
  label: string;
}

export const COLLECTION_SECTIONS: readonly CollectionSection[] = [
  { id: "arsenal", label: "Arsenal" },
  { id: "compendio", label: "Compêndio" },
  { id: "componentes", label: "Peças" },
  { id: "runas", label: "Runas" },
  { id: "nucleos", label: "Núcleos" },
  { id: "comparar", label: "Comparar" },
];

export type CollectionRarityFilter = "Todas" | RarityGrade;

/**
 * Distingue uma coleção vazia de um filtro sem resultados. A mensagem antiga
 * tratava os dois casos como "nenhuma lâmina aqui ainda", o que era falso
 * quando o jogador já possuía armas.
 */
export type ArsenalEmptyState =
  | { kind: "none" }
  | { kind: "collection-empty" }
  | { kind: "filter-empty"; filter: Exclude<CollectionRarityFilter, "Todas"> };

export function getArsenalEmptyState(
  totalSwords: number,
  visibleSwords: number,
  filter: CollectionRarityFilter,
): ArsenalEmptyState {
  if (totalSwords <= 0) return { kind: "collection-empty" };
  if (visibleSwords <= 0 && filter !== "Todas") return { kind: "filter-empty", filter };
  return { kind: "none" };
}

export function collectionCountLabel(
  totalSwords: number,
  visibleSwords: number,
  filter: CollectionRarityFilter,
): string {
  const noun = totalSwords === 1 ? "arma" : "armas";
  if (totalSwords <= 0) return `0 ${noun} no Arsenal`;
  if (filter === "Todas") return `${totalSwords} ${noun} no Arsenal`;
  return `${visibleSwords} de ${totalSwords} ${noun} · ${filter}`;
}
