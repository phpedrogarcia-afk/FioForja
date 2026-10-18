# Scar: Falhas Estruturais e Lições da Operação Arsenal Vivo 01.1

**Data:** 18 de Outubro de 2026  
**Contexto:** Revisão adversarial e hardening pós-Arsenal Vivo v1  
**Módulos Afetados:** `src/game/GameApp.tsx`, `src/game/loot.ts`, `src/game/fusion.ts`, `src/game/sim.ts`, `src/game/save.ts`

---

## 1. Recompensas de Forja Voláteis e Reroll em Re-render
- **Falha:** Em versões anteriores, `generateForgeRewards(finishedSword)` era invocado durante a renderização do modal ou no clique de coleta sem associar as recompensas de forma imutável à espada forjada. Recarregar a página ou reabrir o modal gerava novas cartas e valores, quebrando o determinismo do drop e incentivando reroll exploit.
- **Causa Raiz:** O motor de loot gerava IDs de itens com `crypto.randomUUID()` dentro de um loop de drop, ignorando o determinismo da semente gerada a partir do `forgeRunId`.
- **Correção:** Recompensas são geradas deterministicamente uma única vez dentro de `finishSword()`, atreladas a `sword.pendingRewards` com IDs baseados em `${forgeRunId}_slot_${i}_${catalogKey}`. O resgate marca o ID em `SaveData.claimedForgeRewardIds` e impede qualquer recolhe secundário.

---

## 2. Desconexão do Núcleo de Fusão da Bigorna ("The Player Forges the Trophy" Breach)
- **Falha:** O Crisol de Fusão produzia um `FusionCore` no inventário, mas a tela de forja não recebia o núcleo como entrada ativa (`activeCore`). Ao forjar uma nova arma, nenhum bônus de qualidade, raridade ou perk ancestral era transmitido, tornando a fusão de espadas um "sumidouro de itens inútil".
- **Causa Raiz:** O fluxo de navegação do Crisol para a bigorna não conectava o núcleo selecionado ao inicializador da simulação `createSim()`.
- **Correção:** Campo `activeCore?: FusionCore | null` integrado em `SimState` e em `createSim()`. Ao concluir a lâmina em `finishSword()`, as propriedades (`inheritedPerks`, `bonusQuality`, raridade base mínima e `fusionHistory`) são transferidas de forma canônica para a espada, e o núcleo é consumido atomicamente do inventário.

---

## 3. Fusões sem Validação Transacional Rígida
- **Falha:** Itens podiam ser selecionados repetidamente, categorias de componentes podiam ser misturadas, lâminas quebradas (`broken: true`) podiam ser fundidas e transações podiam ser acionadas sem saldo suficiente de moedas ou catalisadores.
- **Causa Raiz:** Ausência de funções de pré-validação atômicas isoladas antes do consumo de recursos no estado.
- **Correção:** Criação de `validateComponentFusionTransaction()` e `validateSwordFusionTransaction()`, que verificam a existência de exatamente 4 IDs distintos, ausência de duplicatas, integridade física (rejeição categórica de lâminas quebradas), compatibilidade de categoria e disponibilidade de catalisador e carteira antes de qualquer mutação.

---

## 4. Amputação Silenciosa da Coleção com `.slice(0, 120)`
- **Falha:** No salvamento de dados, o array de espadas era truncado arbitrariamente em 120 itens (`saveData.gallery.slice(0, 120)`), deletando silenciosamente as espadas mais antigas do jogador quando a oficina ficava cheia.
- **Causa Raiz:** Suposição errônea de que limitar o array preservava performance sem considerar o valor sentimental e histórico do arsenal.
- **Correção:** Remoção completa de limites artificiais de array no salvamento (`gallery: data.gallery`). O Arsenal agora preserva integralmente todas as obras forjadas pelo jogador.
