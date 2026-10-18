# FioForja — Contrato de Transferência e Handoff para o Codex
## Guia Definitivo de Continuidade entre Agentes Autônomos (Operação Arsenal Vivo 01.1 Hardening)

---

### 1. ONDE ESTAMOS?
- **Repositório:** `phpedrogarcia-afk/FioForja`
- **Branch Ativa:** `antigravity/arsenal-vivo-hardening`
- **Base de Continuidade:** `antigravity/arsenal-vivo-v1` (Commit `cc6dfd517f16f2d734c56b7c994bc401f15ed968`)
- **Último Commit Remoto Confirmado:** `2f37c39212deaab22a5fec3cc2eb07a9e1edbe21` (`2f37c39`)
- **Estado Geral:** O Arsenal Vivo foi integralmente validado e blindado contra falhas estruturais, integrando a forja manual com o ecossistema de RPG, drops e fusão:
  - **Recompensas Imutáveis da Forja:** Geradas deterministicamente no término da lâmina (`finishSword`), acopladas a `sword.pendingRewards` e protegidas contra reroll exploit por `claimedForgeRewardIds`.
  - **Fusão Transacional e Conexão com a Bigorna:** Fusões de espadas e componentes são validadas de forma atômica (`validateComponentFusionTransaction` / `validateSwordFusionTransaction`). O `FusionCore` resultante é transmitido à bigorna (`createSim({ activeCore })`), concedendo herança de perks ancestrais, bônus aditivo de qualidade e piso de raridade, com consumo atômico na finalização da lâmina.
  - **Saltos Excepcionais (+2 Rarity Tiers):** Três patamares canônicos de fusão (Refinado, Superior +1 e Excepcional +2) com probabilidades alinhadas a `docs/canon/fusao-hibrida.md` e exibidas de forma reativa na interface do Crisol.
  - **Bancada de Montagem & Personalização:** Na tela de inspeção em veludo (`RevealScreen.tsx`), o jogador pode instalar guardas, pomos, empunhaduras e runas do inventário, com reflexo imediato no desenho físico do canvas e recálculo dos atributos de combate (`P.ATK`, `DEF`, `AGI`, `DUR`).
  - **Deduplicação de Ouro por Golpe:** Identificadores únicos com escopo da rodada `${forgeRunId}:${strikeIndex}` e persistência em `claimedStrikeRewardIds`.
  - **Preservação Total do Arsenal:** Remoção do truncamento em 120 armas, garantindo que toda a coleção histórica do jogador seja preservada.

---

### 2. O QUE QUEREMOS?
- Transformar o FioForja no jogo definitivo de forja e coleção de armas medievais no navegador.
- O jogador deve sentir a emoção de colecionar equipamentos raros, como em MMORPGs clássicos (estilo Lineage II), mas com o princípio sagrado: **THE PLAYER FORGES THE TROPHY**.
- A sorte concede a oportunidade (um núcleo raro, uma gema, um drop épico). A destreza do jogador na bigorna determina a qualidade física, a beleza e a glória da arma final.

---

### 3. COMO FUNCIONA A ARQUITETURA?
1. **Simulação e Física (`src/game/sim.ts`):**
   - Estado de forja (`SimState`) com calor, estresse, trincas, zonas de impacto (`base`, `mid`, `tip`), `PhysicalBladeProfile` e suporte a `activeCore`.
   - `finishSword()` herda linhagem genética do núcleo (`fusionHistory`, `inheritedPerks`, `bonusQuality`) e gera `pendingRewards` deterministicamente.
2. **Renderização Visual (`src/game/ForgeCanvas.tsx`, `src/game/swordDraw.ts`):**
   - Canvas 2D em 60 FPS com interpolação suave.
   - Deformação plástica contínua da lâmina orientada pelo perfil físico.
   - Entalhe chanfrado em baixo-relevo de runas sem neon artificial.
   - Atualização em tempo real quando componentes são instalados na bancada de inspeção.
3. **Economia e Drops (`src/game/loot.ts`, `src/game/catalog.ts`):**
   - Tabelas de loot com pesos calibrados por Rank de forja e semente Mulberry32 determinística gerada por hash de `forgeRunId`.
   - Idempotência transacional via `claimedForgeRewardIds` para impedir recolhe duplicado.
4. **Crisol de Fusão (`src/game/fusion.ts`, `src/game/screens/FusionStationScreen.tsx`):**
   - Valida 4 itens elegíveis sem repetições, mesma categoria e sem lâminas quebradas.
   - Três tiers de resultado: Refinado, Superior (+1 rank) e Excepcional (+2 ranks).
   - Espadas geram `FusionCore` para forjamento manual na bigorna.
5. **Persistência (`src/game/save.ts`):**
   - Save v5 em `localStorage` (`a-forja-save`).
   - Migração segura e sem perdas para saves legados (v1 a v4), sem truncamento da galeria.

---

### 4. O QUE ESTÁ ERRADO OU INCOMPLETO? (Dívidas Técnicas Conhecidas)
- **Telas Mobile Estreitas:** Em aparelhos ultra-estreitos (< 360px), inspecionar se a barra superior de recursos mantém legibilidade confortável.
- **Sistema de Combate Futuro:** Os atributos `P.ATK`, `DEF`, `AGI` e `DUR` estão completamente modelados e persistidos, mas o jogo atualmente é focado no ciclo da forja e coleção na Galeria. Um sistema de testes de corte/alvo ou arena é candidato para expansão posterior.
- **Áudio no Safari/iOS:** A Web Audio API requer toque inicial do usuário para destravar o contexto (`unlockAudio`). Já implementado, mas exige manutenção de boas práticas em novos botões.

---

### 5. O QUE DEVE SER FEITO DEPOIS? (Próximos Passos para o Codex)
1. **Entregas Desta Missão (CONCLUÍDAS, VERIFICADAS E PUBLICADAS):**
   - [x] Correção P0 de recompensas instáveis com determinismo e idempotência em `pendingRewards`.
   - [x] Correção P0 de conexão do FusionCore à bigorna via `activeCore` e consumo atômico.
   - [x] Correção P0 de validações transacionais atômicas em fusões de espadas e componentes.
   - [x] Implementação P1 de salto excepcional (+2 ranks) e probabilidades canônicas reativas.
   - [x] Implementação P1 de ouro por golpe com chave única de execução `${forgeRunId}:${strikeIndex}`.
   - [x] Remoção P1 de truncamento silencioso no Arsenal.
   - [x] Implementação de bancada interativa de montagem e personalização de componentes em `RevealScreen.tsx`.
   - [x] Suíte de 90 testes automatizados com 100% de aprovação (0 falhas) e TypeScript estrito (0 erros).
   - [x] 4 evidências visuais capturadas em `public/game/evidence/` e pasta de artefatos.
   - [x] Branch `antigravity/arsenal-vivo-hardening` commitada (`2f37c39`) e publicada no remote via fast-forward.

2. **Oportunidades Recomendadas para a Próxima Missão do Codex:**
   - [ ] Implementar minigame de teste de corte no tatame / porco de madeira na Galeria para colocar os atributos `P.ATK`, `DEF`, `AGI` e `DUR` à prova interativamente.
   - [ ] Sistema de contratos e encomendas de nobres / guilda com prazo e requisitos específicos de aço, formato e runas.
   - [ ] Efeitos visuais adicionais de transmutação com partículas de brasas orbitais no Crisol de Fusão.

---

### 6. O QUE NÃO PODE SER VIOLADO? (Invariantes Sagrados)
1. **NÃO altere `main`** sem autorização explícita e validação total.
2. **NUNCA entregue uma espada pronta a partir de fusão de espadas.** Fusão de espadas gera Núcleo de Fusão que DEVE ser forjado na bigorna pelo jogador.
3. **NUNCA substitua habilidade por sorte pura.**
4. **NUNCA execute force push.**
5. **NUNCA descarte dados de save dos jogadores.** Migrações devem ser 100% preservativas.
