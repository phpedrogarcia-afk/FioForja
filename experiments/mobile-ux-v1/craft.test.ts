import { test } from "node:test";
import assert from "node:assert/strict";
import { craftDonors, selectionIssue } from "./craft.ts";

const donors = craftDonors.slice(0, 4);
const ids = donors.map(d => d.sword.id);

test("quatro Raras de qualidades diferentes são compatíveis", () => {
  assert.ok(new Set(donors.map(d => d.sword.quality)).size > 1);
  assert.equal(selectionIssue(craftDonors, ids), null);
});

test("seleção exige quatro IDs únicos, existentes e de mesma raridade", () => {
  assert.ok(selectionIssue(craftDonors, ids.slice(0, 3)));
  assert.ok(selectionIssue(craftDonors, [ids[0], ids[1], ids[2], ids[0]]));
  assert.ok(selectionIssue(craftDonors, [ids[0], ids[1], ids[2], "missing"]));
  assert.ok(selectionIssue(craftDonors, [ids[0], ids[1], ids[2], craftDonors[4].sword.id]));
});

test("protegidas e indisponíveis não participam da demonstração", () => {
  for (const change of [{ protected: true }, { sword: { ...donors[3].sword, broken: true } }, { sword: { ...donors[3].sword, isTraining: true } }, { sword: { ...donors[3].sword, commissionDelivered: "delivered-demo" } }]) {
    const modified = donors.map((d, i) => i === 3 ? { ...d, ...change } : d);
    assert.ok(selectionIssue(modified, ids));
  }
});
