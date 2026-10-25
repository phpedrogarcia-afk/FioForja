import { beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  executeSwordFusionTransaction,
  executeComponentFusionTransaction,
  executeComponentInstallTransaction,
  executeShopPurchaseTransaction,
  executeStartForgeTransaction,
  executeFinishSwordTransaction,
  executeCancelForgeTransaction,
} from "./transactions.ts";
import { defaultSaveData, writeSave, loadSave, migrateSave, generateUniqueId, type SaveData } from "./save.ts";
import { calculateSwordAttributes } from "./catalog.ts";
import {
  componentFusionSelectionIssue,
  fuseComponents,
  fuseSwords,
  getComponentFusionCost,
  getFusionOdds,
  getSwordFusionCost,
  swordFusionSelectionIssue,
  validateSwordFusionTransaction,
  type SwordFusionOutcome,
} from "./fusion.ts";
import { playForgeAttempt } from "./forge-test-helpers.ts";
import { getMaterialStock } from "./materials.ts";
import { findShopArticle } from "./shop.ts";
import type { FinishedSword, InventoryComponent, SwordDesign } from "./types.ts";

const BASE_DESIGN: SwordDesign = {
  name: "Lâmina de Prova",
  family: "royal",
  profile: "long",
  steel: "steel",
  guard: "cross",
  pommel: "disc",
  wrap: "leather",
  inscription: "PROVA",
  runes: false,
  length: 1,
};

let memStore: Record<string, string> = {};
let failWrites = false;

function installStorage() {
  memStore = {};
  failWrites = false;
  const mockStorage = {
    getItem: (key: string) => memStore[key] ?? null,
    setItem: (key: string, value: string) => {
      if (failWrites) {
        const error: any = new Error("Quota exceeded");
        error.name = "QuotaExceededError";
        throw error;
      }
      memStore[key] = value;
    },
    removeItem: (key: string) => {
      delete memStore[key];
    },
    clear: () => {
      for (const key of Object.keys(memStore)) delete memStore[key];
    },
  };
  (globalThis as any).window = { localStorage: mockStorage };
  (globalThis as any).localStorage = mockStorage;
}

function seedSave(patch: Partial<SaveData> = {}): SaveData {
  const base = structuredClone(defaultSaveData);
  const save: SaveData = {
    ...base,
    wallet: { gold: 5000, rubies: 200, diamonds: 20 },
    inventory: {
      ...base.inventory,
      materials: { ...base.inventory.materials, iron_ingot: 10, steel_ingot: 10, catalyst_astral: 3 },
      components: [],
      fusionCores: [],
    },
    gallery: [],
    ...patch,
  };
  const written = writeSave(save);
  assert.equal(written.ok, true, written.error);
  return save;
}

function makeSword(overrides: Partial<FinishedSword> = {}): FinishedSword {
  const quality = overrides.quality ?? 85;
  const design = overrides.design ?? BASE_DESIGN;
  const stats = calculateSwordAttributes(design, quality, 0.02, 85, 85, 85);
  return {
    id: generateUniqueId("sword"),
    design,
    quality,
    grade: "Mestre",
    heatScore: 85,
    forgeScore: 85,
    quenchScore: 85,
    warp: 0.02,
    createdAt: Date.now(),
    damage: stats.damage,
    defense: stats.defense,
    agility: stats.agility,
    durability: stats.durability,
    baseDamage: stats.damage,
    baseDefense: stats.defense,
    baseAgility: stats.agility,
    baseDurability: stats.durability,
    combatRole: stats.combatRole,
    rarity: "Rara",
    ...overrides,
  };
}

function makeComponent(overrides: Partial<InventoryComponent> = {}): InventoryComponent {
  return {
    id: generateUniqueId("comp"),
    name: "Guarda em Cruz Clássica",
    category: "guard",
    componentKey: "guard_cross",
    rarity: "Comum",
    icon: "🛡️",
    description: "Quilhões retos tradicionais.",
    statModifier: { defenseBonus: 10 },
    acquiredAt: Date.now(),
    ...overrides,
  };
}

function purchaseOf(articleId: string, overrides: { costGold?: number; costRubies?: number; quantity?: number } = {}) {
  const article = findShopArticle(articleId);
  assert.ok(article, `catálogo deve conter ${articleId}`);
  return {
    id: article!.id,
    name: article!.name,
    type: article!.type,
    costGold: overrides.costGold ?? article!.costGold,
    costRubies: overrides.costRubies ?? article!.costRubies,
    quantity: overrides.quantity ?? 1,
    componentData: article!.componentData
      ? { name: article!.name, ...article!.componentData }
      : undefined,
  };
}

beforeEach(() => {
  installStorage();
});

describe("Loja real — compra, saldo, persistência e falha", () => {
  it("compra uma guarda, debita ouro e entrega componente instalável", () => {
    const save = seedSave();
    const before = save.wallet.gold;
    const result = executeShopPurchaseTransaction(save, purchaseOf("guard_cross_iron"));
    assert.equal(result.success, true, result.error);
    assert.equal(result.save.wallet.gold, before - 120);
    assert.equal(result.save.inventory.components.length, 1);
    assert.equal(result.save.inventory.components[0].category, "guard");
    assert.equal(result.save.inventory.components[0].componentKey, "guard_cross");
    const reloaded = loadSave();
    assert.equal(reloaded.wallet.gold, before - 120);
    assert.equal(reloaded.inventory.components.length, 1, "a compra precisa sobreviver ao reload");
  });

  it("compra um lingote e abastece o almoxarifado canônico", () => {
    const save = seedSave({ inventory: { ...structuredClone(defaultSaveData.inventory), materials: {} } });
    const result = executeShopPurchaseTransaction(save, purchaseOf("iron"));
    assert.equal(result.success, true, result.error);
    assert.equal(getMaterialStock(result.save.inventory.materials, "iron"), 1);
    assert.equal(result.save.wallet.gold, save.wallet.gold - 50);
    assert.equal(getMaterialStock(loadSave().inventory.materials, "iron"), 1);
  });

  it("recusa saldo insuficiente sem debitar nem entregar", () => {
    const save = seedSave({ wallet: { gold: 10, rubies: 0, diamonds: 0 } });
    const result = executeShopPurchaseTransaction(save, purchaseOf("guard_cross_iron"));
    assert.equal(result.success, false);
    assert.equal(result.code, "INSUFFICIENT_FUNDS");
    assert.equal(result.save.wallet.gold, 10);
    assert.equal(result.save.inventory.components.length, 0);
    assert.equal(loadSave().inventory.components.length, 0);
  });

  it("recusa produto inexistente e preço adulterado", () => {
    const save = seedSave();
    const missing = executeShopPurchaseTransaction(save, {
      id: "unobtainium",
      name: "Produto Fantasma",
      type: "material",
      costGold: 0,
    });
    assert.equal(missing.success, false);
    assert.equal(missing.code, "ITEM_NOT_FOUND");

    const underpay = executeShopPurchaseTransaction(save, purchaseOf("guard_cross_iron", { costGold: 1 }));
    assert.equal(underpay.success, false);
    assert.equal(underpay.code, "PRICE_MISMATCH");
    assert.equal(underpay.save.wallet.gold, save.wallet.gold);
  });

  it("não permite comprar a mesma receita duas vezes", () => {
    const save = seedSave();
    const first = executeShopPurchaseTransaction(save, purchaseOf("recipe_cimitarra_damasco"));
    assert.equal(first.success, true, first.error);
    const goldAfterFirst = first.save.wallet.gold;
    const second = executeShopPurchaseTransaction(first.save, purchaseOf("recipe_cimitarra_damasco"));
    assert.equal(second.success, false);
    assert.equal(second.code, "ALREADY_OWNED");
    assert.equal(second.save.wallet.gold, goldAfterFirst);
    assert.ok(second.save.inventory.unlockedBlueprints?.includes("cimitarra_damasco"));
  });

  it("falha de armazenamento não debita nem cria item", () => {
    const save = seedSave();
    const beforeGold = save.wallet.gold;
    failWrites = true;
    const result = executeShopPurchaseTransaction(save, purchaseOf("guard_cross_iron"));
    assert.equal(result.success, false);
    assert.equal(result.code, "QUOTA_EXCEEDED");
    assert.equal(result.save.wallet.gold, beforeGold, "estado devolvido permanece o original");
    assert.equal(result.save.inventory.components.length, 0);
    failWrites = false;
    assert.equal(loadSave().wallet.gold, beforeGold);
  });
});

describe("Coleção real — instalação, troca e recálculo persistido", () => {
  it("instala guarda, recalcula defesa e sobrevive ao reload", () => {
    const guard = makeComponent({ statModifier: { defenseBonus: 40 } });
    const sword = makeSword({ quality: 80 });
    const save = seedSave({ gallery: [sword], inventory: { ...structuredClone(defaultSaveData.inventory), components: [guard], materials: { steel_ingot: 5 } } });
    const result = executeComponentInstallTransaction(save, sword.id, guard.id);
    assert.equal(result.success, true, result.error);
    const updated = result.save.gallery.find((s) => s.id === sword.id)!;
    assert.equal(updated.installedComponents?.guard?.id, guard.id);
    assert.equal(updated.design.guard, "cross");
    assert.ok((updated.defense || 0) > (sword.defense || 0), "a defesa deve subir com a guarda");
    assert.equal(result.save.inventory.components.length, 0);
    assert.ok(updated.affixes?.some((affix) => affix.includes("Montagem [guard]")));

    const reloaded = loadSave();
    const persisted = reloaded.gallery.find((s) => s.id === sword.id)!;
    assert.equal(persisted.installedComponents?.guard?.id, guard.id);
    assert.equal(persisted.defense, updated.defense);
    assert.equal(reloaded.inventory.components.length, 0);
  });

  it("troca a guarda e devolve a peça anterior ao inventário", () => {
    const first = makeComponent({ name: "Guarda Antiga", statModifier: { defenseBonus: 5 } });
    const second = makeComponent({ id: generateUniqueId("comp"), name: "Guarda Nova", componentKey: "guard_curved", statModifier: { defenseBonus: 30, damageBonus: 4 } });
    const sword = makeSword({ quality: 80 });
    const save = seedSave({ gallery: [sword], inventory: { ...structuredClone(defaultSaveData.inventory), components: [first, second], materials: { steel_ingot: 5 } } });
    const installed = executeComponentInstallTransaction(save, sword.id, first.id);
    assert.equal(installed.success, true, installed.error);
    const replaced = executeComponentInstallTransaction(installed.save, sword.id, second.id);
    assert.equal(replaced.success, true, replaced.error);
    const updated = replaced.save.gallery.find((s) => s.id === sword.id)!;
    assert.equal(updated.installedComponents?.guard?.id, second.id);
    assert.equal(updated.design.guard, "curved");
    assert.deepEqual(replaced.save.inventory.components.map((c) => c.id), [first.id]);
  });

  it("recusa instalar em lâmina quebrada e componente inexistente", () => {
    const guard = makeComponent();
    const broken = makeSword({ quality: 12, broken: true, structuralState: "broken" });
    const save = seedSave({ gallery: [broken], inventory: { ...structuredClone(defaultSaveData.inventory), components: [guard] } });
    const brokenResult = executeComponentInstallTransaction(save, broken.id, guard.id);
    assert.equal(brokenResult.success, false);
    assert.equal(brokenResult.code, "BLADE_BROKEN");
    const missingResult = executeComponentInstallTransaction(save, broken.id, "ghost");
    assert.equal(missingResult.success, false);
    assert.equal(missingResult.code, "COMPONENT_NOT_FOUND");
  });
});

describe("Craft real — mesma raridade, transação, núcleo e reload", () => {
  it("aceita quatro Raras com qualidades diferentes e gera um núcleo", () => {
    const swords = [72, 85, 91, 96].map((quality) => makeSword({ quality, rarity: "Rara" }));
    assert.equal(swordFusionSelectionIssue(swords), null);
    const outcome = fuseSwords(swords, { seed: 7 });
    assert.equal(outcome.consumedSwordIds.length, 4);
    assert.equal(new Set(outcome.consumedSwordIds).size, 4);
    assert.ok(["Rara", "Épica", "Lendária"].includes(outcome.resultCore.rarity));
    assert.equal(outcome.goldCost, getSwordFusionCost("Rara").gold);
    assert.equal(outcome.resultCore.consumedSwordIds.length, 4);
  });

  it("recusa raridades misturadas no motor, na seleção e na transação", () => {
    const mixed = [makeSword({ rarity: "Rara" }), makeSword({ rarity: "Épica" }), makeSword({ rarity: "Rara" }), makeSword({ rarity: "Comum" })];
    assert.ok(swordFusionSelectionIssue(mixed));
    assert.throws(() => fuseSwords(mixed, { seed: 1 }), /mesma raridade/);

    const same = mixed.map((sword, index) => ({ ...sword, rarity: "Rara" as const, id: `s${index}` }));
    const outcome = fuseSwords(same, { seed: 1 });
    const tamperedSave = seedSave({ gallery: same.map((sword, index) => (index === 1 ? { ...sword, rarity: "Épica" as const } : sword)) });
    assert.throws(() => validateSwordFusionTransaction(tamperedSave, outcome), /mesma raridade/);
  });

  it("recusa IDs repetidos, lâmina quebrada, protegida, de treino e entregue", () => {
    const base = makeSword({ rarity: "Rara" });
    assert.ok(swordFusionSelectionIssue([base, base, makeSword({ rarity: "Rara" }), makeSword({ rarity: "Rara" })]));
    assert.ok(swordFusionSelectionIssue([makeSword({ rarity: "Rara", broken: true }), makeSword({ rarity: "Rara" }), makeSword({ rarity: "Rara" }), makeSword({ rarity: "Rara" })]));
    assert.ok(swordFusionSelectionIssue([makeSword({ rarity: "Rara", favorite: true }), makeSword({ rarity: "Rara" }), makeSword({ rarity: "Rara" }), makeSword({ rarity: "Rara" })]));
    assert.ok(swordFusionSelectionIssue([makeSword({ rarity: "Rara", isTraining: true }), makeSword({ rarity: "Rara" }), makeSword({ rarity: "Rara" }), makeSword({ rarity: "Rara" })]));
    assert.ok(swordFusionSelectionIssue([makeSword({ rarity: "Rara", commissionDelivered: "c1" }), makeSword({ rarity: "Rara" }), makeSword({ rarity: "Rara" }), makeSword({ rarity: "Rara" })]));
  });

  it("executa a fusão atomicamente: consome 4, cria 1 núcleo e persiste", () => {
    const swords = [72, 85, 91, 96].map((quality) => makeSword({ quality, rarity: "Rara" }));
    const save = seedSave({ gallery: swords });
    const outcome = fuseSwords(swords, { seed: 3 });
    const beforeGold = save.wallet.gold;
    const result = executeSwordFusionTransaction(save, outcome);
    assert.equal(result.success, true, result.error);
    assert.equal(result.save.gallery.length, 0);
    assert.equal(result.save.inventory.fusionCores.length, 1);
    assert.equal(result.save.wallet.gold, beforeGold - outcome.goldCost);
    assert.equal(result.save.wallet.rubies, save.wallet.rubies - outcome.rubiesCost);

    const reloaded = loadSave();
    assert.equal(reloaded.inventory.fusionCores.length, 1, "o núcleo precisa sobreviver ao reload");
    assert.equal(reloaded.inventory.fusionCores[0].id, outcome.resultCore.id);
    assert.equal(reloaded.gallery.length, 0);
  });

  it("repetir a mesma transação não cria um segundo núcleo", () => {
    const swords = [70, 80, 90, 95].map((quality) => makeSword({ quality, rarity: "Rara" }));
    const save = seedSave({ gallery: swords });
    const outcome = fuseSwords(swords, { seed: 4 });
    const first = executeSwordFusionTransaction(save, outcome);
    assert.equal(first.success, true, first.error);
    const second = executeSwordFusionTransaction(first.save, outcome);
    assert.equal(second.success, false);
    assert.equal(second.save.inventory.fusionCores.length, 1);
  });

  it("catalisador é consumido uma vez e muda as chances reais", () => {
    const swords = [80, 82, 84, 86].map((quality) => makeSword({ quality, rarity: "Rara" }));
    const save = seedSave({ gallery: swords });
    const baseOdds = getFusionOdds("Rara", "swords", false);
    const boosted = getFusionOdds("Rara", "swords", true);
    assert.ok(boosted.superior > baseOdds.superior || boosted.exceptional > baseOdds.exceptional);
    const outcome = fuseSwords(swords, { seed: 5, useCatalyst: true });
    assert.equal(outcome.usedCatalyst, true);
    const result = executeSwordFusionTransaction(save, outcome);
    assert.equal(result.success, true, result.error);
    assert.equal(result.save.inventory.materials.catalyst_astral, 2);
    assert.equal(loadSave().inventory.materials.catalyst_astral, 2);
  });

  it("fusão de componentes gera peça pronta, com custo canônico e persistência", () => {
    const items = [1, 2, 3, 4].map(() => makeComponent({ id: generateUniqueId("comp"), rarity: "Rara" }));
    assert.equal(componentFusionSelectionIssue(items), null);
    const save = seedSave({ inventory: { ...structuredClone(defaultSaveData.inventory), components: items, materials: { catalyst_astral: 1 } } });
    const outcome = fuseComponents(items, { seed: 9 });
    assert.equal(outcome.goldCost, getComponentFusionCost("Rara"));
    const result = executeComponentFusionTransaction(save, outcome);
    assert.equal(result.success, true, result.error);
    assert.equal(result.save.inventory.components.length, 1);
    assert.equal(result.save.wallet.gold, save.wallet.gold - outcome.goldCost);
    assert.equal(loadSave().inventory.components.length, 1);
  });

  it("componentes de categorias diferentes são recusados", () => {
    const items = [makeComponent(), makeComponent(), makeComponent(), makeComponent({ category: "pommel" })];
    assert.ok(componentFusionSelectionIssue(items));
    assert.throws(() => fuseComponents(items, { seed: 1 }), /mesma categoria/);
  });
});

describe("Núcleo → Forja → Arsenal — herança, consumo único e reload", () => {
  function prepareCoreSave() {
    const swords = [72, 85, 91, 96].map((quality) => makeSword({ quality, rarity: "Rara" }));
    const save = seedSave({ gallery: swords });
    const outcome = fuseSwords(swords, { seed: 11 });
    const fused = executeSwordFusionTransaction(save, outcome);
    assert.equal(fused.success, true, fused.error);
    return { save: fused.save, outcome };
  }

  it("inicia a forja com núcleo, consome material e preserva o núcleo até a conclusão", () => {
    const { save } = prepareCoreSave();
    const core = save.inventory.fusionCores[0];
    const coreDesign: SwordDesign = {
      ...BASE_DESIGN,
      name: "Espada do Crisol",
      family: core.family,
      profile: core.profile,
      steel: core.steel,
    };
    const started = executeStartForgeTransaction(save, coreDesign, { activeCoreId: core.id });
    assert.equal(started.success, true, started.error);
    assert.equal(started.save.activeForgeAttempt?.activeCoreId, core.id);
    assert.equal(getMaterialStock(started.save.inventory.materials, core.steel), 9);
    assert.equal(started.save.inventory.fusionCores.length, 1, "o núcleo só é consumido na conclusão");
  });

  it("recusa iniciar sem o material exigido, mantendo o núcleo", () => {
    const { save } = prepareCoreSave();
    const core = save.inventory.fusionCores[0];
    const noMetal: SaveData = { ...save, inventory: { ...save.inventory, materials: { ...save.inventory.materials, steel_ingot: 0 } } };
    const started = executeStartForgeTransaction(noMetal, { ...BASE_DESIGN, family: core.family, profile: core.profile, steel: core.steel }, { activeCoreId: core.id });
    assert.equal(started.success, false);
    assert.equal(started.code, "INSUFFICIENT_MATERIALS");
    assert.equal(started.save.inventory.fusionCores.length, 1);
  });

  it("conclui a espada, consome o núcleo uma única vez e preserva herança e origem", () => {
    const { save, outcome } = prepareCoreSave();
    const core = save.inventory.fusionCores[0];
    const coreDesign: SwordDesign = {
      ...BASE_DESIGN,
      name: "Espada do Crisol",
      family: core.family,
      profile: core.profile,
      steel: core.steel,
    };
    const started = executeStartForgeTransaction(save, coreDesign, { activeCoreId: core.id });
    assert.equal(started.success, true, started.error);
    const played = playForgeAttempt(started.save);
    const attempt = played.save.activeForgeAttempt!;
    const finished = executeFinishSwordTransaction(played.save, played.sim, attempt.design);
    assert.equal(finished.success, true, finished.error);
    const sword = finished.payload!;
    assert.equal(finished.save.inventory.fusionCores.length, 0, "o núcleo é consumido na conclusão");
    assert.equal(sword.fusionHistory?.coreId, core.id);
    assert.equal(sword.fusionHistory?.coreName, core.name);
    assert.deepEqual(sword.fusionHistory?.parentIds, outcome.consumedSwordIds);
    assert.equal(sword.fusionHistory?.inheritedRarity, core.rarity);

    const reloaded = loadSave();
    assert.equal(reloaded.inventory.fusionCores.length, 0);
    const persisted = reloaded.gallery.find((s) => s.id === sword.id)!;
    assert.equal(persisted.fusionHistory?.coreId, core.id);
  });

  it("não permite concluir a mesma forja duas vezes", () => {
    const { save } = prepareCoreSave();
    const core = save.inventory.fusionCores[0];
    const coreDesign: SwordDesign = { ...BASE_DESIGN, family: core.family, profile: core.profile, steel: core.steel };
    const started = executeStartForgeTransaction(save, coreDesign, { activeCoreId: core.id });
    const played = playForgeAttempt(started.save);
    const attempt = played.save.activeForgeAttempt!;
    const first = executeFinishSwordTransaction(played.save, played.sim, attempt.design);
    assert.equal(first.success, true, first.error);
    const second = executeFinishSwordTransaction(first.save, played.sim, attempt.design);
    assert.equal(second.success, false);
    assert.equal(first.save.inventory.fusionCores.length, 0);
  });

  it("cancelar antes do primeiro golpe devolve o metal e preserva o núcleo", () => {
    const { save } = prepareCoreSave();
    const core = save.inventory.fusionCores[0];
    const coreDesign: SwordDesign = { ...BASE_DESIGN, family: core.family, profile: core.profile, steel: core.steel };
    const started = executeStartForgeTransaction(save, coreDesign, { activeCoreId: core.id });
    const cancelled = executeCancelForgeTransaction(started.save);
    assert.equal(cancelled.success, true, cancelled.error);
    assert.equal(cancelled.save.inventory.fusionCores.length, 1);
    assert.equal(cancelled.save.activeForgeAttempt, null);
    assert.equal(getMaterialStock(cancelled.save.inventory.materials, core.steel), save.inventory.materials[core.steel === "iron" ? "iron_ingot" : "steel_ingot"]);
  });
});

describe("Compatibilidade de save — proteção e núcleos antigos", () => {
  it("migra save v4 preservando favorite e núcleos já produzidos", () => {
    const legacyCore = {
      id: "core_legacy",
      name: "Núcleo Antigo",
      rarity: "Épica",
      family: "royal",
      profile: "long",
      steel: "steel",
      bonusQuality: 8,
      inheritedPerks: [],
      consumedSwordIds: ["a", "b", "c", "d"],
      createdAt: 1,
    };
    const migrated = migrateSave({
      version: 4,
      gallery: [{ ...makeSword({ rarity: "Rara" }), favorite: true }],
      inventory: { fusionCores: [legacyCore], materials: { catalyst_crystal: 2 } },
      wallet: { gold: 99, rubies: 1, diamonds: 0 },
    });
    assert.equal(migrated.gallery[0].favorite, true);
    assert.equal(migrated.inventory.fusionCores.length, 1);
    assert.equal(migrated.inventory.fusionCores[0].id, "core_legacy");
    assert.equal(migrated.inventory.materials.catalyst_astral, 2, "cristal legado migra para catalisador canônico");
  });

  it("espada protegida não pode ser consumida no Crisol", () => {
    const swords = [80, 82, 84, 86].map((quality, index) => makeSword({ quality, rarity: "Rara", favorite: index === 0 }));
    const save = seedSave({ gallery: swords });
    const outcome = fuseSwords(swords.map((s) => ({ ...s, favorite: false })), { seed: 2 });
    const blocked = executeSwordFusionTransaction(save, outcome);
    assert.equal(blocked.success, false);
    assert.equal(blocked.code, "VALIDATION_FAILED");
    assert.equal(blocked.save.gallery.length, 4);
  });
});
