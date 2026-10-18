# Estado Atual do Projeto — FioForja

**Data da Atualização:** 18 de Outubro de 2026  
**Branch de Trabalho:** `antigravity/forge-lifecycle-proof-v1`  
**Base Canônica de Continuidade:** `antigravity/blacksmith-progression-v1` (`6e3920d4a8a92bca0b4d6f238d6232d3645a6b6c`)  
**Missão Concluída:** Operação 04: A Prova da Forja — Recuperação do Ciclo de Vida, Progressão Econômica Real e Handoff para o Codex  
**Registros Históricos:** Arquivados em [`docs/historical/`](historical/)

---

## 1. FATOS COMPROVADOS (KNOWN & VERIFIED)

### A. Ciclo de Vida da Tentativa de Forja & Política Justa de Cancelamento (`src/game/transactions.ts`, `src/game/types.ts`)
- **Máquina de Estados de 4 Fases:** `ForgeAttemptStatus = "PREPARED" | "ACTIVE" | "COMPLETED" | "CANCELLED"`.
- **Prevenção Fail-Closed de Tentativas Simultâneas:** `executeStartForgeTransaction` rejeita categoricamente o início de uma nova forja caso `activeAttempt` já exista e esteja ativa (`ATTEMPT_ALREADY_ACTIVE`).
- **Identidade Estrita de Execução (`forgeRunId`):** O ID da tentativa é emitido na largada, passado ao simulador, ao canvas e impresso indelevelmente em `FinishedSword.forgeRunId`.
- **Política Justa de Cancelamento (`executeCancelForgeTransaction`):**
  - Fase `PREPARED` (0 golpes): Desistência limpa — 100% de devolução do lingote de metal consumido.
  - Fase `ACTIVE` (≥1 golpe): Metal deformado — 0 devolução do lingote, mas +1x sucata (`scrap`) de salvamento para reciclagem.
  - Tentativas canceladas ou completadas são imutáveis e rejeitam novo cancelamento (`ATTEMPT_NOT_ACTIVE`).
- **Modal de Recuperação de Tentativa Ativa:** Ao recarregar com uma tentativa pendente em disco, `GameApp.tsx` apresenta um modal contextual permitindo `[🔨 Continuar Forja]` ou `[❌ Cancelar / Abandonar]`.

### B. Isolamento Estrito do Modo Treino & Galeria Segregada
- **Economia e Carreira 100% Blindadas:**
  - Golpes em modo treino rejeitam qualquer crédito de ouro (`TRAINING_MODE_NO_GOLD`).
  - Término da forja em treino zera o objeto de recompensa (0 cartas, 0 ouro, 0 rubis, 0 diamantes).
  - Estatísticas de carreira, maestria e contadores de raridade não sofrem qualquer incremento.
- **Galeria Segregada (`trainingGallery`):** Lâminas de treino são gravadas estritamente em `trainingGallery` do save, mantendo o Arsenal canônico livre de artefatos de teste.
- **Rejeição Categórica no Crisol e Encomendas:**
  - `validateSwordFusionTransaction` e `fuseSwords` impedem o consumo de armas de treino (`isTraining`) e armas entregues à guilda (`commissionDelivered`).
  - `isSwordEligibleForCommission` invalida qualquer espada com `isTraining: true`.

### C. Recuperação de Limalha Anti-Softlock por Mérito Técnico
- Ao completar uma sessão de treino com qualidade $\ge 50$, o ferreiro recolhe +1x sucata (`scrap`) de limalhas da bigorna.
- 2 sessões de treino bem-sucedidas = 2x sucata $\rightarrow$ 1x lingote de ferro na bancada da Oficina via `executeRecycleScrapTransaction`.
- O jogador novato ou falido possui caminho de ascensão econômica puramente baseado em habilidade manual, sem risco de exploração monetária rápida.

### D. Bloqueio Metalúrgico de Projetos Customizados (`src/game/screens/DesignScreen.tsx`)
- O construtor livre de design impede a forja de aços nobres (`damascus`, `blacksteel`, `elven_silver`, `meteor`, `ancient_alloy`) se o jogador não tiver o tier de maestria correspondente em `career.unlockedTiers`.
- O botão de forja real é desabilitado com aviso claro `🔒 Metalurgia Bloqueada: requer maestria em X para forjar`. O treino de oficina permanece disponível para aprendizado da temperatura.

### E. Atribuição Legítima de Papel Defensivo & Encomenda do Capitão Valerius
- `calculateSwordAttributes` confere organicamente `combatRole: "Defensiva"` a espadas de ferro com cruzeta (`guard: "cross"`) ou perfil curto/longo, atingindo DEF $\ge 50$.
- A primeira encomenda da guilda (`comm_guard_captain`) pode ser concluída com materiais da largada sem injeção de mocks ou cheats.

### F. Gating Real de Insumos e Consumo Atômico de Metais (`src/game/materials.ts`)
- 7 chaves canônicas de metais (`iron_ingot`, `steel_ingot`, `damascus_billet`, `blacksteel_chunk`, `elven_silver_ingot`, `starmetal_ore`, `ancient_relic_shard`).
- Forja regular debita 1x metal base correspondente (`executeStartForgeTransaction`); falta de material bloqueia a forja (`INSUFFICIENT_MATERIALS`).

### G. Compêndio de Projetos & Encomendas da Guilda
- 6 estados canônicos de blueprints (`locked`, `known`, `discovered`, `ready`, `crafted`, `mastered`).
- Encomendas de Capitão Valerius, Comandante Kael e Lord Alistair com validação matemática e etiquetagem permanente.

### H. Métricas Técnicas e Verificação
- **TypeScript:** 0 erros (`npm run typecheck` código 0).
- **Testes Automatizados:** 126 testes em 27 suites, 0 falhas (`npm test`), incluindo os 9 testes de integração e invariantes de ciclo de vida em `src/game/lifecycle-proof.test.ts`.
- **Linter:** 0 erros (`npm run lint` código 0).
- **Build de Produção:** Concluído com sucesso (`npm run build`).
- **Evidências Visuais Capturadas via Playwright:**
  - `proof-01-recovery-modal-active-attempt.png`: Modal de recuperação de tentativa ativa ao recarregar a tela com opções de continuar ou cancelar.
  - `proof-02-cancel-fair-scrap-salvage.png`: Política justa de cancelamento após golpes desferidos concedendo +1x sucata de salvamento.
  - `proof-03-metallurgy-gating-custom.png`: Banner de metalurgia bloqueada na tela de Design impedindo forja de aço nobre sem maestria.
  - `proof-04-valerius-commission-defensive.png`: Encomenda do Capitão Valerius com espada de ferro Defensiva legítima pronta para entrega.
  - `proof-05-commission-delivered-rewards.png`: Conclusão da entrega da encomenda com payout de 350 ouro, 5 rubis e 2x lingotes de aço.

---

## 2. INVARIANTES ATIVOS
1. **The Weapon is the Hero. The Player Forges the Trophy.**
2. **Fail-Closed Persistence:** Nenhuma alteração de estado avança na UI sem confirmação de persistência em disco.
3. **Materials Matter:** Metais são necessários para forjas regulares; o estoque é debitado atomicamente.
4. **Anti-Softlock:** O jogador iniciante ou falido nunca fica impossibilitado de forjar.
5. **Isolamento de Branches:** Todo o trabalho foi realizado na branch `antigravity/blacksmith-progression-v1`. A branch `main` nunca é modificada diretamente.
