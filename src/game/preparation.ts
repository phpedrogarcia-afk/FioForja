import { CANONICAL_PRESETS, type CanonicalPreset } from "./catalog.ts";
import { evaluateBlueprintStatus } from "./blueprints.ts";
import type {
  SwordDesign,
  SteelId,
  PlayerInventory,
  CareerStats,
  FinishedSword,
  FusionCore,
} from "./types.ts";

/** Mesma identificação utilizada pela transação, inclusive designs renomeados. */
export function getDesignBlueprint(design: SwordDesign) {
  return CANONICAL_PRESETS.find(
    (p) =>
      p.id === (design as SwordDesign & { id?: string }).id ||
      p.name === design.name ||
      p.design.name === design.name ||
      (p.family === design.family && p.design.profile === design.profile),
  );
}

/** Gates existentes, compartilhados pela tela e pela transação. Não consome recursos. */
export function getMetallurgyBlocker(
  steel: SteelId,
  inventory: PlayerInventory,
  career: CareerStats,
  activeCore?: FusionCore | null,
): { code: string; error: string } | null {
  // Proteção da metalurgia em design livre (gating contra craft de aço raro sem prestígio/núcleo)
  if (steel === "damascus") {
    const unlockedDamascus =
      career.totalForged >= 3 ||
      inventory.unlockedBlueprints?.includes("cimitarra_damasco") ||
      activeCore?.steel === "damascus";
    if (!unlockedDamascus) {
      return {
        error:
          "Metalurgia do Damasco bloqueada: Requer pelo menos 3 forjas concluídas ou autorização por Núcleo/Receita.",
        code: "METALLURGY_LOCKED",
      };
    }
  } else if (steel === "blacksteel") {
    const unlockedBlacksteel =
      career.totalForged >= 4 ||
      inventory.unlockedBlueprints?.includes("juramento_ferro") ||
      activeCore?.steel === "blacksteel";
    if (!unlockedBlacksteel) {
      return {
        error:
          "Metalurgia do Aço Negro bloqueada: Requer pelo menos 4 forjas concluídas ou receita/núcleo.",
        code: "METALLURGY_LOCKED",
      };
    }
  } else if (steel === "elven_silver") {
    const unlockedElven =
      career.totalForged >= 7 ||
      inventory.unlockedBlueprints?.includes("folha_aereth") ||
      activeCore?.steel === "elven_silver";
    if (!unlockedElven) {
      return {
        error:
          "Metalurgia Élfica bloqueada: Requer pelo menos 7 forjas concluídas ou receita élfica no Bazar.",
        code: "METALLURGY_LOCKED",
      };
    }
  } else if (steel === "meteor") {
    const unlockedMeteor =
      career.masterpieces >= 1 ||
      career.legendaries >= 1 ||
      inventory.unlockedBlueprints?.includes("queda_asterion") ||
      activeCore?.steel === "meteor";
    if (!unlockedMeteor) {
      return {
        error:
          "Metalurgia Meteórica bloqueada: Requer pelo menos 1 Obra-prima (Rank S) ou Núcleo de Fusão meteórico.",
        code: "METALLURGY_LOCKED",
      };
    }
  } else if (steel === "ancient_alloy") {
    const unlockedAncient =
      career.legendaries >= 1 ||
      inventory.unlockedBlueprints?.includes("cinzas_ancestrais") ||
      activeCore?.steel === "ancient_alloy";
    if (!unlockedAncient) {
      return {
        error:
          "Metalurgia Primordial bloqueada: Requer pelo menos 1 arma Lendária ou Núcleo de Fusão primordial.",
        code: "METALLURGY_LOCKED",
      };
    }
  }

  return null;
}

export function getPreparationBlocker(
  design: SwordDesign,
  inventory: PlayerInventory,
  career: CareerStats,
  gallery: FinishedSword[],
  activeCore?: FusionCore | null,
): { code: string; error: string } | null {
  // Validate blueprint lock
  const matchedPreset = getDesignBlueprint(design);
  if (matchedPreset) {
    const status = evaluateBlueprintStatus(matchedPreset, inventory, career, gallery, activeCore);
    if (!status.unlocked || status.state === "locked") {
      return {
        error: `Projeto "${matchedPreset.name}" bloqueado. ${status.requirementText}`,
        code: "BLUEPRINT_LOCKED",
      };
    }
  }

  return getMetallurgyBlocker(design.steel, inventory, career, activeCore);
}

/** Preenche o projeto canônico, preservando a escolha explícita de metal e o estoque. */
export function selectPreparationProject(
  preset: CanonicalPreset,
  current: SwordDesign,
  inventory: PlayerInventory,
  career: CareerStats,
  gallery: FinishedSword[],
  activeCore?: FusionCore | null,
): SwordDesign | null {
  if (activeCore || !evaluateBlueprintStatus(preset, inventory, career, gallery).unlocked)
    return null;
  // A escolha de projeto precede a de metal. Se o metal perder autorização
  // (ex.: Liberar núcleo), a tela deve permitir trocar o projeto e então
  // corrigir o metal, mantendo o bloqueio canônico da fabricação.
  return { ...preset.design, steel: current.steel };
}
