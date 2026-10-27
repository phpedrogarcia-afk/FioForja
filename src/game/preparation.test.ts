import { beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { CANONICAL_PRESETS, DEFAULT_DESIGN } from "./catalog.ts";
import { defaultSaveData, loadSave, writeSave } from "./save.ts";
import {
  getDesignBlueprint,
  getPreparationBlocker,
  selectPreparationProject,
} from "./preparation.ts";
import { executeStartForgeTransaction } from "./transactions.ts";
import type { FusionCore, SteelId } from "./types.ts";

beforeEach(() => {
  const entries = new Map<string, string>();
  const storage = {
    getItem: (k: string) => entries.get(k) ?? null,
    setItem: (k: string, v: string) => entries.set(k, v),
    removeItem: (k: string) => entries.delete(k),
  };
  (globalThis as any).window = { localStorage: storage };
  (globalThis as any).localStorage = storage;
});

describe("M03A — preparação pelo motor canônico", () => {
  it("aplica componentes do projeto sem trocar silenciosamente o metal escolhido", () => {
    const s = structuredClone(defaultSaveData);
    s.career.totalForged = 3;
    const next = selectPreparationProject(
      CANONICAL_PRESETS[1],
      DEFAULT_DESIGN,
      s.inventory,
      s.career,
      s.gallery,
    );
    assert.deepEqual(next, { ...CANONICAL_PRESETS[1].design, steel: "steel" });
    assert.equal(getPreparationBlocker(next!, s.inventory, s.career, s.gallery), null);
  });

  it("não aplica projeto bloqueado nem perde o projeto personalizado ao renomear", () => {
    const s = structuredClone(defaultSaveData);
    assert.equal(
      selectPreparationProject(CANONICAL_PRESETS[1], DEFAULT_DESIGN, s.inventory, s.career, []),
      null,
    );
    assert.equal(
      getDesignBlueprint({ ...CANONICAL_PRESETS[0].design, name: "Meu nome" })?.id,
      "guarda_medieval",
    );
    assert.equal(
      getPreparationBlocker(CANONICAL_PRESETS[2].design, s.inventory, s.career, [])?.code,
      "BLUEPRINT_LOCKED",
    );
  });

  it("distingue estoque insuficiente de bloqueio metalúrgico sem substituir metal", () => {
    const s = structuredClone(defaultSaveData);
    s.inventory.materials.steel_ingot = 0;
    assert.equal(getPreparationBlocker(DEFAULT_DESIGN, s.inventory, s.career, []), null);
    assert.equal(executeStartForgeTransaction(s, DEFAULT_DESIGN).code, "INSUFFICIENT_MATERIALS");
    assert.equal(
      getPreparationBlocker({ ...DEFAULT_DESIGN, steel: "meteor" }, s.inventory, s.career, [])
        ?.code,
      "METALLURGY_LOCKED",
    );
  });

  it("mantém a mesma decisão de desbloqueio da transação em metais, projetos e carreiras", () => {
    const steels: SteelId[] = [
      "iron",
      "steel",
      "damascus",
      "blacksteel",
      "elven_silver",
      "meteor",
      "ancient_alloy",
    ];
    for (const totalForged of [0, 3, 4, 7])
      for (const preset of CANONICAL_PRESETS)
        for (const steel of steels) {
          const s = structuredClone(defaultSaveData);
          s.career.totalForged = totalForged;
          const design = { ...preset.design, steel };
          const blocker = getPreparationBlocker(design, s.inventory, s.career, []);
          const result = executeStartForgeTransaction(s, design);
          const rejectedByUnlock = ["BLUEPRINT_LOCKED", "METALLURGY_LOCKED"].includes(
            result.code || "",
          );
          // Oracle explícito; não inferir correção apenas porque tela e transação
          // passaram a chamar o mesmo helper.
          const projectThreshold: Record<string, number> = {
            guarda_medieval: 0,
            cimitarra_damasco: 3,
            lua_silenciosa: 5,
            folha_aereth: 7,
            juramento_ferro: 4,
          };
          const metalThreshold: Partial<Record<SteelId, number>> = {
            iron: 0,
            steel: 0,
            damascus: 3,
            blacksteel: 4,
            elven_silver: 7,
          };
          const expected =
            totalForged >= (projectThreshold[preset.id] ?? Infinity) &&
            totalForged >= (metalThreshold[steel] ?? Infinity);
          assert.equal(!blocker, expected, `oráculo: ${preset.id}/${steel}/${totalForged}`);
          assert.equal(Boolean(blocker), rejectedByUnlock, `${preset.id}/${steel}/${totalForged}`);
          if (blocker) assert.equal(blocker.code, result.code);
        }
  });

  it("impede projeto incompatível com núcleo e mantém sua autorização metalúrgica", () => {
    const s = structuredClone(defaultSaveData);
    const core = {
      id: "core",
      name: "Núcleo",
      family: "royal",
      profile: "long",
      steel: "meteor",
    } as FusionCore;
    const design = { ...DEFAULT_DESIGN, steel: "meteor" as const };
    assert.equal(
      selectPreparationProject(CANONICAL_PRESETS[0], design, s.inventory, s.career, [], core),
      null,
    );
    assert.equal(getPreparationBlocker(design, s.inventory, s.career, [], core), null);
  });

  it("após liberar núcleo, aplica projeto desbloqueado antes de corrigir o metal sem no-op silencioso", () => {
    const s = structuredClone(defaultSaveData);
    const leftover = { ...DEFAULT_DESIGN, name: "Herança", steel: "meteor" as const };
    const next = selectPreparationProject(
      CANONICAL_PRESETS[0],
      leftover,
      s.inventory,
      s.career,
      [],
    );
    assert.ok(next, "Projeto inicial deve ser selecionável antes da segunda escolha de metal");
    assert.equal(next.name, CANONICAL_PRESETS[0].design.name);
    assert.equal(next.steel, "meteor", "Não substituir silenciosamente o material");
    assert.equal(getPreparationBlocker(next, s.inventory, s.career, [])?.code, "METALLURGY_LOCKED");
    assert.equal(executeStartForgeTransaction(s, next).code, "METALLURGY_LOCKED");
    assert.equal(
      getPreparationBlocker({ ...next, steel: "iron" }, s.inventory, s.career, []),
      null,
    );
  });

  it("preserva ajustes avançados no lastDesign v5 sem alterar schema nem consumir inventário", () => {
    const s = structuredClone(defaultSaveData);
    s.lastDesign = {
      ...DEFAULT_DESIGN,
      name: "Retorno",
      guard: "wings",
      wrap: "braided",
      pommel: "sphere",
      length: 1.2,
      inscription: "MEMORIA",
      runes: true,
    };
    assert.equal(writeSave(s).ok, true);
    const loaded = loadSave();
    assert.deepEqual(loaded.lastDesign, s.lastDesign);
    assert.deepEqual(loaded.inventory, s.inventory);
    assert.equal(loaded.version, s.version);
  });
});
