import { beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { defaultSaveData, loadSave, migrateSave, writeSave } from "./save.ts";
import { findShopArticle, SHOP_TOOLS } from "./shop.ts";
import { calculateSwordAttributes } from "./catalog.ts";
import { getMaterialStock } from "./materials.ts";
import { fuseComponents, fuseSwords, getComponentFusionBaseRarity, getComponentFusionCost, getSwordFusionCost, type ComponentFusionOutcome, type SwordFusionOutcome } from "./fusion.ts";
import { executeComponentFusionTransaction, executeShopPurchaseTransaction, executeStartForgeTransaction, executeSwordFusionTransaction, type TransactionExecutionResult } from "./transactions.ts";
import type { FinishedSword, InventoryComponent, SaveData, SwordDesign } from "./types.ts";

const PRIMARY_KEY = "a-forja-save";
let memStore: Record<string, string> = {};
let rejectPrimary = false;

beforeEach(() => {
  memStore = {};
  rejectPrimary = false;
  const storage = {
    getItem: (key: string) => memStore[key] ?? null,
    setItem: (key: string, value: string) => {
      if (rejectPrimary && key === PRIMARY_KEY) {
        const error = new Error("Quota exceeded on primary save");
        error.name = "QuotaExceededError";
        throw error;
      }
      memStore[key] = value;
    },
    removeItem: (key: string) => { delete memStore[key]; },
    clear: () => { memStore = {}; },
  };
  (globalThis as any).window = { localStorage: storage };
  (globalThis as any).localStorage = storage;
});

function purchaseOf(id: string, quantity = 1) {
  const article = findShopArticle(id);
  assert.ok(article, `Produto canônico ausente: ${id}`);
  return { id: article.id, name: article.name, type: article.type, costGold: article.costGold * quantity, costRubies: (article.costRubies || 0) * quantity, quantity };
}

const DESIGN: SwordDesign = { name: "Lâmina de Prova", family: "royal", profile: "long", steel: "steel", guard: "cross", pommel: "disc", wrap: "leather", inscription: "PROVA", runes: false, length: 1 };

function makeSword(id: string): FinishedSword {
  const stats = calculateSwordAttributes(DESIGN, 85, 0.02, 85, 85, 85);
  return { id, forgeRunId: `run_${id}`, design: { ...DESIGN }, quality: 85, grade: "Mestre", heatScore: 85, forgeScore: 85, quenchScore: 85, warp: 0.02, createdAt: 1, damage: stats.damage, defense: stats.defense, agility: stats.agility, durability: stats.durability, baseDamage: stats.damage, baseDefense: stats.defense, baseAgility: stats.agility, baseDurability: stats.durability, combatRole: stats.combatRole, rarity: "Rara" };
}

function makeComponent(id: string): InventoryComponent {
  return { id, name: "Guarda de Prova", category: "guard", componentKey: "guard_cross", rarity: "Rara", icon: "🛡️", description: "Guarda do corpus local.", statModifier: { defenseBonus: 10 }, acquiredAt: 1 };
}

function seedSave(): SaveData {
  const save = structuredClone(defaultSaveData);
  save.wallet = { gold: 5000, rubies: 200, diamonds: 20 };
  save.inventory.materials = { iron_ingot: 10, steel_ingot: 10, catalyst_astral: 3, fusion_fragment: 0 };
  save.gallery = [0, 1, 2, 3].map(i => makeSword(`sword_${i}`));
  save.inventory.components = [0, 1, 2, 3].map(i => makeComponent(`comp_${i}`));
  assert.equal(writeSave(save).ok, true);
  return save;
}

function expectRejectedWithoutChange(save: SaveData, execute: () => TransactionExecutionResult) {
  const initialState = structuredClone(save);
  const initialPrimary = memStore[PRIMARY_KEY];
  const result = execute();
  assert.equal(result.success, false, "payload adulterado deve ser recusado");
  assert.equal(result.save, save);
  assert.deepEqual(save, initialState, "recusa não pode mutar inventário nem saldo em memória");
  assert.equal(memStore[PRIMARY_KEY], initialPrimary, "recusa não pode gravar o payload adulterado");
}

describe("Codex08 — persistência de transações sem estado fantasma", () => {
  it("uma primeira compra recusada no save primário não reaparece pelo backup", () => {
    const save = structuredClone(defaultSaveData);
    rejectPrimary = true;
    const result = executeShopPurchaseTransaction(save, purchaseOf("guard_cross_iron"));
    assert.equal(result.success, false);
    assert.equal(result.code, "QUOTA_EXCEEDED");
    assert.equal(result.save, save);
    const reloaded = loadSave();
    assert.equal(reloaded.wallet.gold, save.wallet.gold, "backup não pode publicar débito de uma compra recusada");
    assert.equal(reloaded.inventory.components.length, 0, "backup não pode publicar item de uma compra recusada");
  });

  it("uma transação recusada mantém o save primário anterior recuperável", () => {
    const save = seedSave();
    rejectPrimary = true;
    const result = executeShopPurchaseTransaction(save, purchaseOf("guard_cross_iron"));
    assert.equal(result.success, false);
    const reloaded = loadSave();
    assert.equal(reloaded.wallet.gold, save.wallet.gold);
    assert.equal(reloaded.inventory.components.length, save.inventory.components.length);
  });
});

describe("Codex08 — Loja usa identidade, preço e efeitos canônicos", () => {
  it("ignora nome e efeitos adulterados e entrega a guarda do catálogo", () => {
    const save = seedSave();
    const article = findShopArticle("guard_cross_iron")!;
    const result = executeShopPurchaseTransaction(save, { ...purchaseOf(article.id), name: "Relíquia Falsa", componentData: { name: "Relíquia Falsa", category: "rune", componentKey: "unknown_rune", rarity: "Relíquia", icon: "x", description: "Payload adulterado", statModifier: { damageBonus: 999999 } } });
    assert.equal(result.success, true, result.error);
    const delivered = result.save.inventory.components.at(-1)!;
    assert.equal(delivered.name, article.name);
    assert.equal(delivered.category, "guard");
    assert.equal(delivered.componentKey, "guard_cross");
    assert.equal(delivered.rarity, "Comum");
    assert.deepEqual(delivered.statModifier, { defenseBonus: 10 });
    assert.equal(result.save.wallet.gold, save.wallet.gold - article.costGold);
    assert.equal(loadSave().inventory.components.at(-1)!.componentKey, "guard_cross");
  });

  for (const id of [SHOP_TOOLS[0].id, "recipe_cimitarra_damasco"]) {
    it(`recusa segunda aquisição do item único ${id} sem novo débito`, () => {
      const save = seedSave();
      const first = executeShopPurchaseTransaction(save, purchaseOf(id));
      assert.equal(first.success, true, first.error);
      expectRejectedWithoutChange(first.save, () => executeShopPurchaseTransaction(first.save, purchaseOf(id)));
      assert.equal(first.save.wallet.gold, save.wallet.gold - findShopArticle(id)!.costGold);
    });
  }

  it("quantidade de material debita o total e abastece uma única chave canônica", () => {
    const save = seedSave();
    const beforeStock = getMaterialStock(save.inventory.materials, "iron");
    const result = executeShopPurchaseTransaction(save, purchaseOf("iron", 3));
    assert.equal(result.success, true, result.error);
    assert.equal(getMaterialStock(result.save.inventory.materials, "iron"), beforeStock + 3);
    assert.equal(result.save.inventory.materials.iron, undefined);
    assert.equal(result.save.wallet.gold, save.wallet.gold - findShopArticle("iron")!.costGold * 3);
    assert.equal(getMaterialStock(loadSave().inventory.materials, "iron"), beforeStock + 3);
  });

  for (const quantity of [0, -1, 1.5, 100, NaN]) {
    it(`recusa quantidade inválida de material ${String(quantity)}`, () => {
      const save = seedSave();
      expectRejectedWithoutChange(save, () => executeShopPurchaseTransaction(save, purchaseOf("iron", quantity)));
    });
  }

  it("recusa quantidade múltipla de componente ou item único", () => {
    const save = seedSave();
    for (const id of ["guard_cross_iron", SHOP_TOOLS[0].id, "recipe_cimitarra_damasco", "catalyst_astral"]) {
      expectRejectedWithoutChange(save, () => executeShopPurchaseTransaction(save, purchaseOf(id, 2)));
    }
  });

  it("compra de catalisador persiste exatamente uma unidade na chave usada pelo Crisol", () => {
    const save = seedSave();
    const article = findShopArticle("catalyst_astral")!;
    const result = executeShopPurchaseTransaction(save, purchaseOf(article.id));
    assert.equal(result.success, true, result.error);
    assert.equal(result.save.inventory.materials.catalyst_astral, 4);
    assert.equal(result.save.wallet.gold, save.wallet.gold - article.costGold);
    assert.equal(result.save.wallet.rubies, save.wallet.rubies - (article.costRubies || 0));
    assert.equal(loadSave().inventory.materials.catalyst_astral, 4);
  });
});

describe("Codex08 — Crisol valida o efeito recebido antes do débito", () => {
  const swordMutations: Array<[string, (outcome: SwordFusionOutcome) => void]> = [
    ["custo de ouro negativo", outcome => { outcome.goldCost = -1; }],
    ["custo de ouro NaN", outcome => { outcome.goldCost = NaN; }],
    ["custo de ouro adulterado finito", outcome => { outcome.goldCost += 1; }],
    ["custo de rubis negativo", outcome => { outcome.rubiesCost = -1; }],
    ["custo de rubis NaN", outcome => { outcome.rubiesCost = NaN; }],
    ["custo de rubis adulterado finito", outcome => { outcome.rubiesCost += 1; }],
    ["fragmentos inflados", outcome => { outcome.fragmentsAwarded = 999999; }],
    ["núcleo com tier impossível para quatro Raras", outcome => { outcome.resultCore.rarity = "Relíquia"; }],
    ["núcleo com bônus de qualidade impossível", outcome => { outcome.resultCore.bonusQuality = 999; }],
    ["núcleo com proveniência falsa", outcome => { outcome.resultCore.consumedSwordIds = ["ghost_a", "ghost_b", "ghost_c", "ghost_d"]; }],
    ["núcleo com herança inflada", outcome => { outcome.resultCore.heritage!.attackBias = 999999; }],
    ["flag de catalisador sem tipo booleano", outcome => { (outcome as any).usedCatalyst = "true"; }],
  ];
  for (const [label, mutate] of swordMutations) {
    it(`recusa fusão de espadas com ${label}`, () => {
      const save = seedSave();
      const outcome = fuseSwords(save.gallery, { seed: 3 });
      mutate(outcome);
      expectRejectedWithoutChange(save, () => executeSwordFusionTransaction(save, outcome));
    });
  }

  const componentMutations: Array<[string, (outcome: ComponentFusionOutcome) => void]> = [
    ["custo negativo", outcome => { outcome.goldCost = -1; }],
    ["custo NaN", outcome => { outcome.goldCost = NaN; }],
    ["custo adulterado finito", outcome => { outcome.goldCost += 1; }],
    ["fragmentos inflados", outcome => { outcome.fragmentsAwarded = 999999; }],
    ["categoria de resultado trocada", outcome => { outcome.resultComponent.category = "rune"; }],
    ["chave de resultado inexistente", outcome => { outcome.resultComponent.componentKey = "ghost_component"; }],
    ["tier impossível para quatro Raras", outcome => { outcome.resultComponent.rarity = "Relíquia"; }],
    ["atributo inflado", outcome => { outcome.resultComponent.statModifier = { damageBonus: 999999 }; }],
    ["flag de catalisador sem tipo booleano", outcome => { (outcome as any).usedCatalyst = "true"; }],
  ];
  for (const [label, mutate] of componentMutations) {
    it(`recusa fusão de componentes com ${label}`, () => {
      const save = seedSave();
      const outcome = fuseComponents(save.inventory.components, { seed: 3 });
      mutate(outcome);
      expectRejectedWithoutChange(save, () => executeComponentFusionTransaction(save, outcome));
    });
  }

  it("aceita resultado legítimo de espadas e consome o catalisador uma única vez", () => {
    const save = seedSave();
    const outcome = fuseSwords(save.gallery, { seed: 5, useCatalyst: true });
    const result = executeSwordFusionTransaction(save, outcome);
    assert.equal(result.success, true, result.error);
    const cost = getSwordFusionCost("Rara");
    assert.equal(result.save.wallet.gold, save.wallet.gold - cost.gold);
    assert.equal(result.save.wallet.rubies, save.wallet.rubies - cost.rubies);
    assert.equal(result.save.gallery.length, 0);
    assert.equal(result.save.inventory.fusionCores.length, 1);
    assert.equal(result.save.inventory.materials.catalyst_astral, 2);
    expectRejectedWithoutChange(result.save, () => executeSwordFusionTransaction(result.save, outcome));
    assert.equal(loadSave().inventory.materials.catalyst_astral, 2);
    assert.equal(loadSave().inventory.fusionCores.length, 1);
  });

  it("aceita resultado legítimo de componentes e recusa repetir o consumo", () => {
    const save = seedSave();
    const outcome = fuseComponents(save.inventory.components, { seed: 9 });
    const result = executeComponentFusionTransaction(save, outcome);
    assert.equal(result.success, true, result.error);
    assert.equal(result.save.wallet.gold, save.wallet.gold - getComponentFusionCost(getComponentFusionBaseRarity(save.inventory.components)));
    assert.equal(result.save.inventory.components.length, 1);
    expectRejectedWithoutChange(result.save, () => executeComponentFusionTransaction(result.save, outcome));
    assert.equal(loadSave().inventory.components.length, 1);
  });

  it("recusa catalisador solicitado que já não existe no inventário atual", () => {
    const save = seedSave();
    save.inventory.materials.catalyst_astral = 0;
    assert.equal(writeSave(save).ok, true);
    const swords = fuseSwords(save.gallery, { seed: 5, useCatalyst: true });
    const components = fuseComponents(save.inventory.components, { seed: 5, useCatalyst: true });
    expectRejectedWithoutChange(save, () => executeSwordFusionTransaction(save, swords));
    expectRejectedWithoutChange(save, () => executeComponentFusionTransaction(save, components));
  });

  it("recusa IDs repetidos e proteção adicionada após a geração do resultado", () => {
    const save = seedSave();
    const outcome = fuseSwords(save.gallery, { seed: 3 });
    const duplicate = structuredClone(outcome);
    duplicate.consumedSwordIds[3] = duplicate.consumedSwordIds[0];
    expectRejectedWithoutChange(save, () => executeSwordFusionTransaction(save, duplicate));
    save.gallery[0].favorite = true;
    assert.equal(writeSave(save).ok, true);
    expectRejectedWithoutChange(save, () => executeSwordFusionTransaction(save, outcome));
  });

  it("falha de persistência não consome doadoras, núcleo ou catalisador", () => {
    const save = seedSave();
    const swordOutcome = fuseSwords(save.gallery, { seed: 3, useCatalyst: true });
    const componentOutcome = fuseComponents(save.inventory.components, { seed: 3, useCatalyst: true });
    rejectPrimary = true;
    expectRejectedWithoutChange(save, () => executeSwordFusionTransaction(save, swordOutcome));
    expectRejectedWithoutChange(save, () => executeComponentFusionTransaction(save, componentOutcome));
    assert.equal(loadSave().gallery.length, 4);
    assert.equal(loadSave().inventory.components.length, 4);
    assert.equal(loadSave().inventory.materials.catalyst_astral, 3);
  });
});

describe("Codex08 — núcleos existentes conservam identidade", () => {
  it("não inicia forja com núcleo inexistente", () => {
    const save = seedSave();
    expectRejectedWithoutChange(save, () => executeStartForgeTransaction(save, DESIGN, { activeCoreId: "ghost_core" }));
  });

  it("núcleo antigo permanece forjável sem reavaliar a receita das doadoras", () => {
    const save = seedSave();
    const legacyCore = { id: "core_legacy", name: "Núcleo Antigo", rarity: "Épica" as const, family: "royal" as const, profile: "long" as const, steel: "steel" as const, bonusQuality: 8, inheritedPerks: [], consumedSwordIds: ["a", "b", "c", "d"], createdAt: 1 };
    const migrated = migrateSave({ ...save, version: 4, inventory: { ...save.inventory, fusionCores: [legacyCore] } });
    const result = executeStartForgeTransaction(migrated, DESIGN, { activeCoreId: legacyCore.id });
    assert.equal(result.success, true, result.error);
    assert.equal(result.save.inventory.fusionCores.length, 1, "o núcleo só é consumido na conclusão manual");
    assert.equal(result.save.activeForgeAttempt!.activeCoreId, legacyCore.id);
    assert.equal(result.save.activeForgeAttempt!.snapshot!.state.activeCore!.bonusQuality, 8);
    expectRejectedWithoutChange(result.save, () => executeStartForgeTransaction(result.save, DESIGN, { activeCoreId: legacyCore.id }));
  });
});
