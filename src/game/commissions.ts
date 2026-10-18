import type { BlacksmithCommission, FinishedSword } from "./types.ts";

export const DEFAULT_COMMISSIONS: BlacksmithCommission[] = [
  {
    id: "comm_guard_captain",
    clientName: "Capitão Valerius",
    clientTitle: "Sentinela da Muralha Norte",
    icon: "🛡️",
    description: "A guarnição do portão norte necessita de lâminas sólidas com têmpera defensiva para conter invasores nas paliçadas.",
    family: "iron",
    steel: "iron",
    minQuality: 60,
    requiredRole: "Defensiva",
    rewardGold: 350,
    rewardMaterial: { key: "steel_ingot", name: "Lingote de Aço Forjado", quantity: 2 },
    rewardRubies: 5,
    completed: false,
  },
  {
    id: "comm_mercenary_leader",
    clientName: "Comandante Kael",
    clientTitle: "Líder dos Falcões Cinzentos",
    icon: "🦅",
    description: "Minhas tropas de cavalaria ligeira precisam de alfanges ou sabres rápidos com boa manobrabilidade para corte a cavalo.",
    minQuality: 75,
    minStat: { stat: "agility", minValue: 22 },
    rewardGold: 600,
    rewardMaterial: { key: "damascus_billet", name: "Tarugo Dobrado de Damasco", quantity: 1 },
    rewardRubies: 10,
    completed: false,
  },
  {
    id: "comm_noble_duel",
    clientName: "Lord Alistair",
    clientTitle: "Campeão da Alta Nobreza",
    icon: "👑",
    description: "Um duelo de honra foi marcado perante a corte imperial. Preciso de uma obra de alta lâmina com potencial ofensivo temível.",
    minQuality: 88,
    minStat: { stat: "damage", minValue: 32 },
    rewardGold: 1200,
    rewardMaterial: { key: "starmetal_ore", name: "Fragmento de Minério Estelar", quantity: 1 },
    rewardRubies: 20,
    completed: false,
  },
];

/**
 * Checks whether a finished sword in the gallery satisfies all delivery requirements of a commission.
 */
export function isSwordEligibleForCommission(
  commission: BlacksmithCommission,
  sword: FinishedSword,
): { eligible: boolean; reasons: string[] } {
  const reasons: string[] = [];

  if (sword.broken || (sword.structuralState && sword.structuralState === "broken")) {
    reasons.push("Lâminas quebradas não podem ser entregues em encomendas.");
    return { eligible: false, reasons };
  }

  if (sword.isTraining) {
    reasons.push("Armas de treino básico não são aceitas em encomendas da guilda.");
    return { eligible: false, reasons };
  }

  if (sword.commissionDelivered) {
    reasons.push("Esta arma já foi entregue em outra encomenda da guilda.");
    return { eligible: false, reasons };
  }

  if (commission.family && sword.design.family !== commission.family) {
    reasons.push(`Família incompatível (exige ${commission.family}, arma é ${sword.design.family || "livre"}).`);
  }

  if (commission.steel && sword.design.steel !== commission.steel) {
    reasons.push(`Metal incompatível (exige ${commission.steel}, arma é ${sword.design.steel}).`);
  }

  if (sword.quality < commission.minQuality) {
    reasons.push(`Qualidade insuficiente (${sword.quality}% de ${commission.minQuality}% exigidos).`);
  }

  if (commission.requiredRole && sword.combatRole !== commission.requiredRole) {
    reasons.push(`Especialização divergente (exige ${commission.requiredRole}, arma é ${sword.combatRole || "Equilibrada"}).`);
  }

  if (commission.minStat) {
    const val = sword[commission.minStat.stat] ?? 0;
    if (val < commission.minStat.minValue) {
      reasons.push(`Atributo ${commission.minStat.stat.toUpperCase()} insuficiente (${val} de ${commission.minStat.minValue} exigidos).`);
    }
  }

  return {
    eligible: reasons.length === 0,
    reasons,
  };
}
