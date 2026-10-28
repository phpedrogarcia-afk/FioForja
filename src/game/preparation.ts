import { CANONICAL_PRESETS, DEFAULT_DESIGN, FAMILIES, type CanonicalPreset } from "./catalog.ts";
import { evaluateBlueprintStatus } from "./blueprints.ts";
import type {
  SwordDesign,
  SteelId,
  PlayerInventory,
  CareerStats,
  FinishedSword,
  FusionCore,
  FamilyId,
  DesignCustomizationField,
} from "./types.ts";

/** Mesma identificação utilizada pela transação, inclusive designs renomeados. */
export function getDesignBlueprint(design: SwordDesign) {
  const byId = design.id && CANONICAL_PRESETS.find((p) => p.id === design.id);
  if (byId) return byId;
  return CANONICAL_PRESETS.find(
    (p) =>
      p.name === design.name ||
      p.design.name === design.name ||
      (p.family === design.family && p.design.profile === design.profile),
  );
}

export type AdjustableField = DesignCustomizationField;
const adjustable: AdjustableField[] = [
  "name",
  "profile",
  "wrap",
  "guard",
  "pommel",
  "length",
  "inscription",
  "runes",
  "runeSymbol",
  "runeKey",
];

/** Inferência para saves antigos, que não registravam quais campos foram editados. */
function previousDefaults(current: SwordDesign): SwordDesign {
  const preset =
    (current.id && CANONICAL_PRESETS.find((p) => p.id === current.id)) ||
    CANONICAL_PRESETS.find((p) => p.family === current.family) ||
    getDesignBlueprint(current);
  return preset?.design || DEFAULT_DESIGN;
}

function retainEdits(
  next: SwordDesign,
  current: SwordDesign,
  touched: ReadonlySet<AdjustableField>,
): SwordDesign {
  const previous = previousDefaults(current);
  const retained = new Set<AdjustableField>(
    Array.isArray(current.customizedFields)
      ? current.customizedFields.filter((field) => adjustable.includes(field))
      : [],
  );
  for (const field of adjustable) {
    if (touched.has(field) || retained.has(field) || current[field] !== previous[field]) {
      Object.assign(next, { [field]: current[field] });
      retained.add(field);
    }
  }
  if (retained.size) next.customizedFields = [...retained];
  return next;
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
  // Uma identidade explícita não pode esconder outro projeto canônico que a
  // família e o perfil personalizados também identificam. Saves sem ID seguem
  // o matching histórico; nomes editados não definem um segundo projeto.
  const profileMatch =
    design.id && matchedPreset?.id === design.id
      ? CANONICAL_PRESETS.find(
          (p) => p.family === design.family && p.design.profile === design.profile,
        )
      : undefined;
  const matches = [matchedPreset, profileMatch].filter((p, i, all) => p && all.indexOf(p) === i);
  for (const preset of matches) {
    if (!preset) continue;
    const status = evaluateBlueprintStatus(preset, inventory, career, gallery, activeCore);
    if (!status.unlocked || status.state === "locked") {
      return {
        error: `Projeto "${preset.name}" bloqueado. ${status.requirementText}`,
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
  touched: ReadonlySet<AdjustableField> = new Set(),
): SwordDesign | null {
  if (activeCore || !evaluateBlueprintStatus(preset, inventory, career, gallery).unlocked)
    return null;
  // A escolha de projeto precede a de metal. Se o metal perder autorização
  // (ex.: Liberar núcleo), a tela deve permitir trocar o projeto e então
  // corrigir o metal, mantendo o bloqueio canônico da fabricação.
  return retainEdits({ ...preset.design, id: preset.id, steel: current.steel }, current, touched);
}

export function selectPreparationFamily(
  family: FamilyId,
  current: SwordDesign,
  touched: ReadonlySet<AdjustableField> = new Set(),
): SwordDesign {
  const defaults = FAMILIES[family];
  return retainEdits(
    {
      ...current,
      family,
      profile: defaults.defaultProfile,
      wrap: defaults.defaultWrap,
      guard: defaults.defaultGuard,
      pommel: defaults.defaultPommel,
    },
    current,
    touched,
  );
}
