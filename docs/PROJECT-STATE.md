# Estado Atual do Projeto — FioForja

**Data da Atualização:** 18 de Outubro de 2026  
**Branch de Trabalho:** `antigravity/arsenal-vivo-v1`  
**Base Canônica de Continuidade:** `antigravity/grand-forge-total-refinement`  
**Último Commit Remoto Verificado:** `5835c0fcbc40d5670ba3a696f13f887185fcb64f` (`5835c0f`)  
**Registro Histórico Antigo:** Arquivado em [`docs/historical/PROJECT-STATE-M00-R1.md`](historical/PROJECT-STATE-M00-R1.md)

---

## 1. FATOS COMPROVADOS (KNOWN & VERIFIED)

### A. Simulação Metalúrgica e Física da Forja (`src/game/sim.ts`)
- **Física Multi-Zonas:** O martelamento é distribuído entre três zonas de impacto reais (`base`, `mid`, `tip`), modificando progressivamente o perfil contínuo [`PhysicalBladeProfile`](../src/game/types.ts) (`baseWidth`, `midWidth`, `tipWidth`, `distalTaper`, `fullerDepth`, `bevelSharpness`).
- **Plasticidade e Termodinâmica:** Deformação efetiva ocorre apenas na janela térmica ideal. Golpes a frio (`heat < 0.35`) causam acúmulo de estresse interno, microtrincas (`cracks`) e eventual fratura frágil irreversível (`broken: true`, `structuralState: "broken"`).
- **Mecânica de Reaquecimento:** O ferreiro pode retornar a lâmina à fornalha quando a temperatura cai, aliviando o estresse estrutural e restaurando a plasticidade de forma segura.
- **Têmpera Realista:** O choque térmico em água ou óleo determina a dureza final e gera empenamento (`warp`) se o alinhamento de resfriamento falhar.
- **Ferramentas Ativas de Oficina:** Martelos (`precision`, `standard`, `sledge`), bigornas, fornalhas e bacias de têmpera equipadas afetam matematicamente a inércia do golpe, a perda de calor e o risco de trinca.

### B. Cena da Forja e Renderização Gráfica (`src/game/ForgeCanvas.tsx`, `src/game/swordDraw.ts`)
- **Duas Mãos de Ferreiro:**
  - A mão esquerda empunha tenazes de forja forjadas em aço maciço que se estendem continuamente para fora da viewport inferior esquerda, com chanfros escuros, rebite de articulação e reflexo quente das brasas.
  - O braço direito executa o movimento contínuo do martelo a partir de um sprite unificado (`hand-strike.png`) com máscara de penas de gradiente suave no ombro, sem cortes bruscos ou cintilações entre espera e golpe.
- **Reflexo Térmico da Bigorna:** A superfície superior da bigorna projeta um brilho incandescente sob a lâmina em brasa quando `heatBoost > 0.25`.
- **Banho de Têmpera Dinâmico:** A água do tanque simula fervura ativa, turbulência e borbulhas de espuma durante a imersão da lâmina quente, liberando nuvens volumétricas de vapor.
- **Entalhe Rúnico Físico (Bíblia Estética):** Runas Elder Futhark e sangradouros utilizam entalhe chanfrado em baixo-relevo (V-groove chisel shadow offset de 0.8px). Neon flutuante foi eliminado: aço comum não emite luz; runas frias têm brilho metálico tátil fosco; runas em brasa emitem calor interno suave. Runas são bloqueadas em tarugos brutos (`shape < 0.65`).

### C. Estrutura da Galeria e Armas Individuais (`src/game/screens/GalleryScreen.tsx`, `RevealScreen.tsx`)
- **Seis Pilares da Galeria:** Arsenal, Compêndio, Componentes, Runas, Oficina e Legado.
- **Oficina Equipável:** O jogador pode comprar e equipar ativamente bigornas, fornalhas, bacias de têmpera e martelos, com custos debitados da carteira persistente.
- **Mesa de Inspeção em Veludo:** Exibe a lâmina terminada sobre veludo azul-púrpura real, listando atributos físicos calculados (`damage` / P.ATK, `defense` / DEF, `agility` / AGI, `durability` / DUR), defeitos estruturais (`flaws`) e perícias de maestria (`perks`).
- **Refino de Bancada Disciplinado:** Afiação e ajuste de empunhadura limitados a 3 níveis (`+8 ATK`, `+2 DUR` por nível). Lâminas quebradas não podem ser aprimoradas. A forja e seus defeitos metalúrgicos permanecem intactos.

### D. Métricas Técnicas e Verificação
- **TypeScript:** 0 erros (`npm run typecheck` código 0).
- **Testes Automatizados:** 281 testes totais (190 scripts + 84 simulator/arsenal-vivo, 274 APROVADOS, 0 falhas, 7 ignorados por symlinks Windows).
- **Simulação Monte Carlo:** 10.000 drops dinâmicos, 5.000 fusões de Crisol, 20.000 golpes simulados (`scripts/simulate-economy-and-drops.mjs`). Relatório persistido em [`docs/historical/monte-carlo-economy-report.md`](historical/monte-carlo-economy-report.md).
- **Build de Produção:** Concluído com sucesso em 360ms (`npm run build`).
- **Evidências Visuais Capturadas:**
  - [`arsenal-vivo-01-arsenal-cards.png`](../public/game/evidence/arsenal-vivo-01-arsenal-cards.png): Arsenal com cards de armas, atributos P.ATK/DEF/AGI/DUR e raridades.
  - [`arsenal-vivo-02-crisol-fusao.png`](../public/game/evidence/arsenal-vivo-02-crisol-fusao.png): Crisol de Fusão do Ferreiro (Opção C) com 4 slots, live odds, catalisadores e seleção de espadas/componentes.
  - [`arsenal-vivo-03-loot-drops-rank-s.png`](../public/game/evidence/arsenal-vivo-03-loot-drops-rank-s.png): Tela de celebração com 4 cartas dinâmicas, moedas proporcionais e fanfare de áudio.

---

## 2. SISTEMAS IMPLEMENTADOS E VERIFICADOS NA MISSÃO ARSENAL VIVO

| Ponto Auditado | Diagnóstico Anterior | Estado Implementado e Comprovado |
|---|---|---|
| `generateForgeRewards()` | 4 cartas predefinidas com dados estáticos. | **CONCLUÍDO:** Motor dinâmico [`src/game/loot.ts`](../src/game/loot.ts) com catálogo completo (materiais, componentes, runas, itens de fusão), probabilidades ponderadas por Rank (S, A, B, C, Quebra) e suporte a sementes determinísticas Mulberry32. |
| Economia de Moedas | Recompensas inflacionadas (4.850 ouro e 165 gemas). | **CONCLUÍDO:** Balanço canônico [`docs/canon/economia.md`](canon/economia.md) com teto proporcional por Rank (S: ~550 ouro, 21 rubis, 14 diamantes; A: ~330 ouro; B: ~190 ouro; C: ~70 ouro; Quebra: ~22 ouro). |
| Ganho de Ouro na Forja | Ouro concedido apenas na conclusão da forja. | **CONCLUÍDO:** Moedas em tempo real por golpe na bigorna (+3 bom, +8 perfeito, +12 mestre) com popups flutuantes dourados, síntese Web Audio procedural `playCoinJingle()`, deduplicação estrita de eventos e callback `onStrikeReward`. |
| Idempotência de Recompensas | Protegia coleta apenas em estado local. | **CONCLUÍDO:** Schema Save v5 com array persistente `claimedForgeRewardIds` que rejeita transações duplicadas em reload, re-render ou cliques múltiplos. |
| Sistema de Fusão | Inexistente no runtime. | **CONCLUÍDO:** **FIOFORJA-FUSION-001 (Opção C Híbrida)** em [`src/game/fusion.ts`](../src/game/fusion.ts) e [`src/game/screens/FusionStationScreen.tsx`](../src/game/screens/FusionStationScreen.tsx): fusão de 4 componentes gera componente mestre; fusão de 4 espadas gera `FusionCore` que DEVE ser forjado manualmente na bigorna pelo jogador ("The Player Forges the Trophy"). Lâminas quebradas são expressamente recusadas. Proteção contra azar com pagamento de `fragmentsOfOrigin`. |
| Identificadores de Espadas | `Date.now()` sujeito a colisões teóricas. | **CONCLUÍDO:** `generateUniqueId(prefix)` com `crypto.randomUUID()` e fallback de alta entropia. |
| Limite do Arsenal | Cap fixo em 48 espadas em `save.ts`. | **CONCLUÍDO:** Expandido com segurança para 120 armas com migração automática sem perda de dados. |

---

## 3. INVARIANTES ATIVOS DESTA MISSÃO
1. **The Player Forges the Trophy:** RNG e drops ampliam oportunidades; maestria na bigorna determina o resultado da arma.
2. **Separação entre Qualidade e Raridade:** Uma espada Rank S de Ferro continua sendo Ferro; uma espada Lendária mal forjada reflete suas falhas estruturais.
3. **Fusão Híbrida (Opção C):** Fusão de 4 espadas produz núcleo/pré-forma/projeto que exige forjamento manual real na bigorna; nunca uma espada pronta instantânea.
4. **Preservação de Save e Migração Segura:** Atualizações de schema (Save v5) migram saves antigos (v1 a v4) sem perda de espadas, ferramentas ou moedas.
5. **Branch Isolada:** Todo o trabalho desta missão ocorre em `antigravity/arsenal-vivo-v1`. A branch `main` nunca é modificada diretamente.
