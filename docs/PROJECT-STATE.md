# Estado Atual do Projeto — FioForja

**Data da Atualização:** 18 de Outubro de 2026  
**Branch de Trabalho:** `antigravity/arsenal-vivo-hardening`  
**Base Canônica de Continuidade:** `antigravity/arsenal-vivo-v1` (`cc6dfd517f16f2d734c56b7c994bc401f15ed968`)  
**Registro Histórico Antigo:** Arquivado em [`docs/historical/PROJECT-STATE-M00-R1.md`](historical/PROJECT-STATE-M00-R1.md)

---

## 1. FATOS COMPROVADOS (KNOWN & VERIFIED)

### A. Simulação Metalúrgica e Física da Forja (`src/game/sim.ts`)
- **Física Multi-Zonas:** O martelamento é distribuído entre três zonas de impacto reais (`base`, `mid`, `tip`), modificando progressivamente o perfil contínuo [`PhysicalBladeProfile`](../src/game/types.ts) (`baseWidth`, `midWidth`, `tipWidth`, `distalTaper`, `fullerDepth`, `bevelSharpness`).
- **Plasticidade e Termodinâmica:** Deformação efetiva ocorre apenas na janela térmica ideal. Golpes a frio (`heat < 0.35`) causam acúmulo de estresse interno, microtrincas (`cracks`) e eventual fratura frágil irreversível (`broken: true`, `structuralState: "broken"`).
- **Mecânica de Reaquecimento:** O ferreiro pode retornar a lâmina à fornalha quando a temperatura cai, aliviando o estresse estrutural e restaurando a plasticidade de forma segura.
- **Têmpera Realista:** O choque térmico em água ou óleo determina a dureza final e gera empenamento (`warp`) se o alinhamento de resfriamento falhar.
- **Ferramentas Ativas de Oficina:** Martelos (`precision`, `standard`, `sledge`), bigornas, fornalhas e bacias de têmpera equipadas afetam matematicamente a inércia do golpe, a perda de calor e o risco de trinca.
- **Herança de Núcleo de Fusão (`activeCore`):** Núcleos gerados no Crisol são transmitidos para a forja através de `createSim({ activeCore })`. Ao concluir a forja em `finishSword()`, a arma herda a raridade base, o bônus de qualidade (`bonusQuality`), perks ancestrais (`inheritedPerks`) e o registro histórico completo de fusão (`fusionHistory`).

### B. Cena da Forja e Renderização Gráfica (`src/game/ForgeCanvas.tsx`, `src/game/swordDraw.ts`)
- **Duas Mãos de Ferreiro:**
  - A mão esquerda empunha tenazes de forja forjadas em aço maciço que se estendem continuamente para fora da viewport inferior esquerda, com chanfros escuros, rebite de articulação e reflexo quente das brasas.
  - O braço direito executa o movimento contínuo do martelo a partir de um sprite unificado (`hand-strike.png`) com máscara de penas de gradiente suave no ombro, sem cortes bruscos ou cintilações entre espera e golpe.
- **Reflexo Térmico da Bigorna:** A superfície superior da bigorna projeta um brilho incandescente sob a lâmina em brasa quando `heatBoost > 0.25`.
- **Banho de Têmpera Dinâmico:** A água do tanque simula fervura ativa, turbulência e borbulhas de espuma durante a imersão da lâmina quente, liberando nuvens volumétricas de vapor.
- **Entalhe Rúnico Físico (Bíblia Estética):** Runas Elder Futhark e sangradouros utilizam entalhe chanfrado em baixo-relevo (V-groove chisel shadow offset de 0.8px). Neon flutuante foi eliminado: aço comum não emite luz; runas frias têm brilho metálico tátil fosco; runas em brasa emitem calor interno suave. Runas são bloqueadas em tarugos brutos (`shape < 0.65`).

### C. Estrutura da Galeria e Armas Individuais (`src/game/screens/GalleryScreen.tsx`, `RevealScreen.tsx`, `FusionStationScreen.tsx`)
- **Seis Pilares da Galeria:** Arsenal, Compêndio, Componentes, Runas, Oficina e Legado.
- **Oficina Equipável:** O jogador pode comprar e equipar ativamente bigornas, fornalhas, bacias de têmpera e martelos, com custos debitados da carteira persistente.
- **Mesa de Inspeção em Veludo e Bancada de Montagem:** Exibe a lâmina terminada sobre veludo azul-púrpura real, listando atributos físicos calculados (`damage` / P.ATK, `defense` / DEF, `agility` / AGI, `durability` / DUR), defeitos estruturais (`flaws`) e perícias de maestria (`perks`). Inclui a **Bancada de Montagem & Personalização**, permitindo instalar guardas, pomos, empunhaduras e runas avulsas, modificando em tempo real a geometria visual no canvas e recalculando os atributos de combate sem descaracterizar a forja.
- **Refino de Bancada Disciplinado:** Afiação e ajuste de empunhadura limitados a 3 níveis (`+8 ATK`, `+2 DUR` por nível). Lâminas quebradas não podem ser aprimoradas. A forja e seus defeitos metalúrgicos permanecem intactos.
- **Crisol de Fusão do Ferreiro (Opção C Canônica):** Fusão de 4 componentes gera componentes mestres; fusão de 4 espadas consome as armas atomicamente e produz um `FusionCore` com herança genética para forjar na bigorna. Inclui cálculo reativo e exibição das probabilidades canônicas em tempo real (Mesmo Tier, Salto Superior +1, Salto Excepcional +2) e suporte a Catalisador Astral.

### D. Métricas Técnicas e Verificação
- **TypeScript:** 0 erros (`npm run typecheck` código 0).
- **Testes Automatizados:** 100% aprovados (90/90 testes no runner de desenvolvimento `arsenal-vivo.test.ts` e suíte completa, 0 falhas).
- **Simulação Monte Carlo:** 10.000 drops dinâmicos, 5.000 fusões de Crisol (com distribuição Refinado / Superior / Excepcional rigorosamente alinhada à tabela canônica), 20.000 golpes simulados (`scripts/simulate-economy-and-drops.mjs`). Relatório persistido em [`docs/historical/monte-carlo-economy-report.md`](historical/monte-carlo-economy-report.md).
- **Build de Produção:** Concluído com sucesso em 365ms (`npm run build`).
- **Evidências Visuais Capturadas:**
  - [`arsenal-vivo-01-arsenal-cards.png`](../public/game/evidence/arsenal-vivo-01-arsenal-cards.png): Arsenal com cards de armas, atributos P.ATK/DEF/AGI/DUR e raridades.
  - [`arsenal-vivo-02-crisol-fusao.png`](../public/game/evidence/arsenal-vivo-02-crisol-fusao.png): Crisol de Fusão do Ferreiro com 4 slots povoados, probabilidades canônicas reativas (70% Mesmo Tier / 30% Salto Superior), Catalisador Astral ativo e botão de transmutação habilitado.
  - [`arsenal-vivo-03-loot-drops-rank-s.png`](../public/game/evidence/arsenal-vivo-03-loot-drops-rank-s.png): Tela de celebração com 4 cartas dinâmicas, moedas proporcionais e fanfare de áudio.
  - [`arsenal-vivo-04-workbench-mounting.png`](../public/game/evidence/arsenal-vivo-04-workbench-mounting.png): Mesa de inspeção em veludo com espada Lendária ("LÂMINA DAS ESTRELAS"), atributos de combate, refino de bancada e a Bancada de Montagem de Componentes interativa.

---

## 2. SISTEMAS HARDENED NA MISSÃO ARSENAL VIVO 01.1

| Defeito Diagnosticado (P0/P1) | Causa Raiz | Solução Implementada e Comprovada |
|---|---|---|
| **P0: Recompensas Instáveis / Reroll Exploit** | `generateForgeRewards` gerava cartas com IDs aleatórios via `crypto.randomUUID()` durante renderização ou resgate. | **CORRIGIDO:** Recompensas geradas deterministicamente uma única vez no término da forja (`sim.ts` / `finishSword`), acopladas a `sword.pendingRewards` com IDs baseados em `${forgeRunId}_slot_${i}_${catalogKey}`. Coleta persistida em `claimedForgeRewardIds`. |
| **P0: Núcleo de Fusão Inerte na Forja** | O `FusionCore` era armazenado no inventário, mas a forja na bigorna não recebia o núcleo como entrada ativa. | **CORRIGIDO:** Propriedade `activeCore` transmitida a `createSim()`. Ao forjar, a lâmina herda piso de raridade, bônus aditivo de qualidade (`bonusQuality`), perks ancestrais e histórico de linhagem (`FusionHistory`), consumindo o núcleo do inventário na conclusão. |
| **P0: Fusão sem Validação Transacional** | Falta de pré-checagem rigorosa antes da mutação de estado permitia duplicatas, fusão de lâminas quebradas e bypass de custos. | **CORRIGIDO:** Funções `validateComponentFusionTransaction` e `validateSwordFusionTransaction` implementadas em `fusion.ts`, bloqueando qualquer transação inválida, recusando armas quebradas e checando saldo de ouro, rubis e catalisadores. |
| **P1: Ausência de Salto Excepcional (+2 Ranks)** | O motor de fusão suportava apenas salto de +1 rank de raridade. | **CORRIGIDO:** 3 tiers canônicos implementados (Refinado, Superior +1, Excepcional +2, e.g. 4 Raras -> Lendária) com probabilidades alinhadas a `docs/canon/fusao-hibrida.md` e exibição reativa em `FusionStationScreen.tsx`. |
| **P1: Ouro por Golpe Exploitável** | Golpes na bigorna não tinham identificadores únicos com escopo de rodada. | **CORRIGIDO:** Identificadores únicos `${forgeRunId}:${strikeIndex}` e array `claimedStrikeRewardIds` persistido no schema Save v5. |
| **P1: Truncamento Indevido do Arsenal** | O save truncava a galeria em 120 espadas (`.slice(0, 120)`), apagando armas antigas. | **CORRIGIDO:** Truncamento removido de `save.ts` e `GameApp.tsx`. Preservação integral do histórico e coleção do jogador. |
| **P1: Componentes Avulsos sem Utilidade Física** | Componentes dropados ficavam estáticos no inventário sem poder ser instalados. | **CORRIGIDO:** Bancada de Montagem & Personalização na tela de inspeção (`RevealScreen.tsx`), com instalação interativa que atualiza a malha visual da lâmina e recalcula os atributos de combate em tempo real. |

---

## 3. INVARIANTES ATIVOS DESTA MISSÃO
1. **The Player Forges the Trophy:** RNG e drops ampliam oportunidades; maestria na bigorna determina o resultado da arma.
2. **Separação entre Qualidade e Raridade:** Uma espada Rank S de Ferro continua sendo Ferro; uma espada Lendária mal forjada reflete suas falhas estruturais.
3. **Fusão Híbrida (Opção C):** Fusão de 4 espadas produz núcleo que exige forjamento manual real na bigorna; nunca uma espada pronta instantânea.
4. **Preservação de Save e Integridade Transacional:** Transações financeiras, de inventário e de galeria são validadas atomicamente sem perda de dados.
5. **Branch Isolada:** Todo o trabalho desta missão ocorre em `antigravity/arsenal-vivo-hardening`. A branch `main` nunca é modificada diretamente.
