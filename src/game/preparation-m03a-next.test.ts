import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { CANONICAL_PRESETS, FAMILIES } from "./catalog.ts";
import { defaultSaveData } from "./save.ts";
import * as preparation from "./preparation.ts";
import type { FamilyId, FinishedSword, FusionCore, SwordDesign } from "./types.ts";
import { evaluateBlueprintStatus } from "./blueprints.ts";

// Saves anteriores não registravam intenção. A versão atual marca escolhas explícitas;
// sem essa marca, a comparação com o projeto anterior preserva diferenças reais.
const prior = CANONICAL_PRESETS[0];
const next = CANONICAL_PRESETS[1];
const fresh = () => structuredClone(defaultSaveData);
const careerWithDamascus = () => {
  const save = fresh();
  save.career.totalForged = 3;
  return save;
};
const customized = (): SwordDesign => ({
  ...prior.design,
  name: "Minha lâmina",
  profile: "saber",
  steel: "steel",
  guard: "wings",
  wrap: "goldwire",
  pommel: "sphere",
  length: 1.14,
  inscription: "MEMORIA",
  runes: true,
});
const selectFamily = (family: FamilyId, current: SwordDesign): SwordDesign =>
  (
    preparation as typeof preparation & {
      selectPreparationFamily: (family: FamilyId, current: SwordDesign) => SwordDesign;
    }
  ).selectPreparationFamily(family, current);

describe("M03A — preservar escolhas ao trocar projeto e família", () => {
  it("credita arma personalizada ao projeto selecionado, sem confundir nome de outro projeto", () => {
    const save = careerWithDamascus();
    const design = {
      ...next.design,
      id: next.id,
      name: prior.design.name,
      profile: "saber" as const,
    };
    const gallery = [{ id: "sword", design, quality: 80 }] as FinishedSword[];
    assert.equal(
      evaluateBlueprintStatus(next, save.inventory, save.career, gallery).isCrafted,
      true,
    );
    assert.equal(
      evaluateBlueprintStatus(prior, save.inventory, save.career, gallery).isCrafted,
      false,
    );
    const legacyGallery = [
      { id: "legacy", design: { ...prior.design }, quality: 80 },
    ] as FinishedSword[];
    assert.equal(
      evaluateBlueprintStatus(prior, save.inventory, save.career, legacyGallery).isCrafted,
      true,
    );
  });
  it("mantém cada ajuste manual válido e o metal ao trocar projeto", () => {
    const save = careerWithDamascus();
    const original = customized();
    const result = preparation.selectPreparationProject(
      next,
      original,
      save.inventory,
      save.career,
      save.gallery,
    );
    assert.ok(result);
    assert.equal(result.family, next.design.family);
    const fields = [
      "name",
      "profile",
      "steel",
      "guard",
      "wrap",
      "pommel",
      "length",
      "inscription",
      "runes",
    ] as const;
    assert.deepEqual(
      Object.fromEntries(fields.map((field) => [field, result[field]])),
      Object.fromEntries(fields.map((field) => [field, original[field]])),
    );
  });

  it("preserva identidade do projeto para que customização não contorne seu desbloqueio", () => {
    const save = careerWithDamascus();
    const result = preparation.selectPreparationProject(
      next,
      customized(),
      save.inventory,
      save.career,
      save.gallery,
    );
    assert.ok(result);
    assert.equal(result.name, customized().name);
    assert.equal(result.profile, customized().profile);
    assert.equal(preparation.getDesignBlueprint(result)?.id, next.id);
    const locked = fresh();
    assert.equal(
      preparation.getPreparationBlocker(result, locked.inventory, locked.career, locked.gallery)
        ?.code,
      "BLUEPRINT_LOCKED",
    );
  });

  it("não confunde nome manual igual ao nome de outro projeto com a identidade selecionada", () => {
    const save = careerWithDamascus();
    const original = { ...customized(), name: CANONICAL_PRESETS[2].design.name };
    const result = preparation.selectPreparationProject(
      next,
      original,
      save.inventory,
      save.career,
      save.gallery,
    );
    assert.ok(result);
    assert.equal(result.name, original.name);
    assert.equal(preparation.getDesignBlueprint(result)?.id, next.id);
    const locked = fresh();
    assert.equal(
      preparation.getPreparationBlocker(result, locked.inventory, locked.career, locked.gallery)
        ?.code,
      "BLUEPRINT_LOCKED",
    );
  });

  it("usa os padrões do novo projeto quando não houve personalização, mantendo o metal", () => {
    const save = careerWithDamascus();
    const result = preparation.selectPreparationProject(
      next,
      { ...prior.design, steel: "steel" },
      save.inventory,
      save.career,
      save.gallery,
    );
    assert.ok(result);
    for (const field of [
      "name",
      "family",
      "profile",
      "guard",
      "wrap",
      "pommel",
      "length",
      "inscription",
      "runes",
    ] as const) {
      assert.equal(result[field], next.design[field], `padrão ${field} divergente`);
    }
    assert.equal(result.steel, "steel");
  });

  it("preserva uma escolha manual igual ao padrão quando a tela registra a intenção", () => {
    const save = careerWithDamascus();
    const original = { ...prior.design, steel: "steel" as const };
    const result = preparation.selectPreparationProject(
      next,
      original,
      save.inventory,
      save.career,
      [],
      null,
      new Set(["guard"]),
    );
    assert.equal(result?.guard, original.guard);
    assert.equal(result?.wrap, next.design.wrap);
  });

  it("não seleciona projeto bloqueado ou projeto diferente quando há núcleo armado", () => {
    const locked = fresh();
    assert.equal(
      preparation.selectPreparationProject(
        next,
        prior.design,
        locked.inventory,
        locked.career,
        locked.gallery,
      ),
      null,
    );
    const unlocked = careerWithDamascus();
    const core = {
      id: "core",
      name: "Núcleo",
      family: "iron",
      profile: "long",
      steel: "iron",
    } as FusionCore;
    assert.equal(
      preparation.selectPreparationProject(
        prior,
        prior.design,
        unlocked.inventory,
        unlocked.career,
        unlocked.gallery,
        core,
      ),
      null,
    );
  });

  it("ao trocar família mantém ajustes manuais de perfil e acabamento", () => {
    const original = customized();
    const result = selectFamily("oriental", original);
    assert.equal(result.family, "oriental");
    for (const field of [
      "name",
      "profile",
      "steel",
      "guard",
      "wrap",
      "pommel",
      "length",
      "inscription",
      "runes",
    ] as const) {
      assert.equal(result[field], original[field], `ajuste ${field} perdido`);
    }
  });

  it("ao trocar família aplica padrões da nova família em campos não modificados", () => {
    const original = { ...prior.design, steel: "steel" as const };
    const result = selectFamily("oriental", original);
    assert.equal(result.family, "oriental");
    assert.equal(result.profile, FAMILIES.oriental.defaultProfile);
    assert.equal(result.guard, FAMILIES.oriental.defaultGuard);
    assert.equal(result.wrap, FAMILIES.oriental.defaultWrap);
    assert.equal(result.pommel, FAMILIES.oriental.defaultPommel);
    assert.equal(result.steel, "steel");
  });
});
