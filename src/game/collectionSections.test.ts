import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  COLLECTION_SECTIONS,
  collectionCountLabel,
  getArsenalEmptyState,
} from "./collectionSections.ts";

describe("Coleção — seis seções canônicas", () => {
  it("expõe as seis seções na ordem esperada, sem duplicatas", () => {
    assert.deepEqual(
      COLLECTION_SECTIONS.map((section) => section.label),
      ["Arsenal", "Compêndio", "Peças", "Runas", "Núcleos", "Comparar"],
    );
    assert.equal(new Set(COLLECTION_SECTIONS.map((section) => section.id)).size, 6);
  });
});

describe("Coleção — vazio real versus filtro sem resultados", () => {
  it("coleção sem armas pede a primeira forja", () => {
    assert.deepEqual(getArsenalEmptyState(0, 0, "Todas"), { kind: "collection-empty" });
    assert.deepEqual(getArsenalEmptyState(0, 0, "Lendária"), { kind: "collection-empty" });
  });

  it("armas existentes com filtro sem resultado não fingem coleção vazia", () => {
    assert.deepEqual(getArsenalEmptyState(6, 0, "Relíquia"), {
      kind: "filter-empty",
      filter: "Relíquia",
    });
    assert.equal(getArsenalEmptyState(6, 2, "Lendária").kind, "none");
    assert.equal(getArsenalEmptyState(6, 6, "Todas").kind, "none");
  });

  it("o resumo diferencia o total do resultado filtrado", () => {
    assert.equal(collectionCountLabel(6, 0, "Relíquia"), "0 de 6 armas · Relíquia");
    assert.equal(collectionCountLabel(1, 0, "Épica"), "0 de 1 arma · Épica");
    assert.equal(collectionCountLabel(6, 6, "Todas"), "6 armas no Arsenal");
    assert.equal(collectionCountLabel(1, 1, "Todas"), "1 arma no Arsenal");
    assert.equal(collectionCountLabel(0, 0, "Todas"), "0 armas no Arsenal");
  });
});
