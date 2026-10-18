# FioForja — Contrato de Transferência e Handoff para o Codex
## Guia Definitivo de Continuidade entre Agentes Autônomos (Operação Arsenal Vivo 01.2 Integrity)

---

### 1. ONDE ESTAMOS?
- **Repositório:** `phpedrogarcia-afk/FioForja`
- **Branch Ativa:** `antigravity/arsenal-vivo-integrity`
- **Base de Continuidade:** `antigravity/arsenal-vivo-hardening` (Commit `f63fad12caaf9a1707ef190fb7c6f43b30044743`)
- **Estado Geral:** O Arsenal Vivo foi consolidado com integridade total de itens, anti-stacking de atributos, persistência com backups atômicos, herança física de núcleos e identidade visual expandida:
  - **Eliminação de Acúmulo Infinito de Atributos:** Decomposição em camadas (`baseDamage`, `baseDefense`, etc.) e recálculo determinístico via `recalculateSwordStats()`. A substituição de uma peça desinstala e devolve a anterior ao inventário.
  - **Persistência Segura com Backups Atômicos:** `writeSave()` cria e atualiza um snapshot íntegro em `a-forja-save-backup` antes da sobrescrita e retorna `SaveResult`. `loadSave()` detecta corrupção no save primário e recupera o estado de backup automaticamente.
  - **Catálogo de Loot Expandido & Zero Duplicatas:** Mais de 10 itens Comuns autênticos adicionados; algoritmo garante 4 itens com chaves de catálogo estritamente distintas em 100% dos drops.
  - **Identidade Visual Real de Componentes:** Texturas e desenhos procedurais para empunhaduras em `swordDraw.ts` (`dragon_leather`, `tsukamaki`, `goldwire`, `bone`, etc.) e runas nórdicas cinzeladas no sangradouro.
  - **Herança Física de Núcleos de Fusão:** O Crisol de Fusão extrai `CoreHeritageProfile` (`attackBias`, `defenseBias`, `agilityBias`, `durabilityBias`), transmitindo tendências de combate calibradas para a lâmina forjada na bigorna.
  - **Economia por Golpes Desacoplada de Setters:** Transação atômica pura `applyStrikeRewardTransaction()` fora dos callbacks de render, com deduplicação e compactação automática do histórico (máximo 200 IDs) para evitar vazamento de memória.

---

### 2. O QUE QUEREMOS?
- Consolidar o FioForja como o melhor jogo de forja e coleção de armas medievais no navegador.
- O princípio sagrado é: **THE WEAPON IS THE HERO. THE PLAYER FORGES THE TROPHY**.
- A sorte concede materiais e oportunidades; a destreza do jogador na bigorna determina a qualidade física, a beleza e a glória da arma final.

---

### 3. COMO FUNCIONA A ARQUITETURA?
1. **Simulação e Física (`src/game/sim.ts`):**
   - Estado de forja (`SimState`) com calor, estresse, trincas, zonas de impacto (`base`, `mid`, `tip`), `PhysicalBladeProfile` e suporte a `activeCore`.
   - `finishSword()` herda linhagem genética do núcleo (`fusionHistory`, `inheritedPerks`, `bonusQuality`, `heritage`), gera `pendingRewards` deterministicamente e executa `recalculateSwordStats()`.
2. **Renderização Visual (`src/game/ForgeCanvas.tsx`, `src/game/swordDraw.ts`):**
   - Canvas 2D em 60 FPS com interpolação suave.
   - Deformação plástica contínua da lâmina orientada pelo perfil físico.
   - Entalhe chanfrado em baixo-relevo de runas sem neon artificial.
   - `drawWrapGrip()` renderiza texturas procedurais táteis para cada material de empunhadura.
3. **Economia e Drops (`src/game/loot.ts`, `src/game/catalog.ts`):**
   - Tabelas de loot com pesos calibrados por Rank de forja e semente Mulberry32 determinística gerada por hash de `forgeRunId`.
   - Idempotência transacional via `claimedForgeRewardIds` para impedir recolhe duplicado.
4. **Crisol de Fusão (`src/game/fusion.ts`, `src/game/screens/FusionStationScreen.tsx`):**
   - Valida 4 itens elegíveis sem repetições, mesma categoria e sem lâminas quebradas.
   - Três tiers de resultado: Refinado, Superior (+1 rank) e Excepcional (+2 ranks).
   - Espadas geram `FusionCore` com perfil de herança para forjamento manual na bigorna.
5. **Persistência (`src/game/save.ts`):**
   - Save v5 em `localStorage` (`a-forja-save`) com backup atômico em `a-forja-save-backup`.
   - Tratamento de `QuotaExceededError` e recuperação automática em caso de corrupção.

---

### 4. O QUE ESTÁ ERRADO OU INCOMPLETO? (Dívidas Técnicas Conhecidas)
- **Telas Mobile Estreitas:** Em aparelhos ultra-estreitos (< 360px), inspecionar se a barra superior de recursos mantém legibilidade confortável.
- **Sistema de Combate Futuro:** Os atributos `P.ATK`, `DEF`, `AGI` e `DUR` estão completamente modelados e persistidos, mas o jogo atualmente é focado no ciclo da forja e coleção na Galeria. Um sistema de testes de corte/alvo ou arena é candidato para expansão posterior.
- **Áudio no Safari/iOS:** A Web Audio API requer toque inicial do usuário para destravar o contexto (`unlockAudio`). Já implementado, mas exige manutenção de boas práticas em novos botões.

---

### 5. O QUE DEVE SER FEITO DEPOIS? (Próximos Passos para o Codex)
1. **Entregas Desta Missão (CONCLUÍDAS, VERIFICADAS E PUBLICADAS):**
   - [x] Correção P0 de acúmulo infinito de atributos com `recalculateSwordStats()` e devolução de peças anteriores ao inventário.
   - [x] Correção P0 de persistência com `SaveResult`, backup atômico em `a-forja-save-backup`, tratamento de quota e recuperação automática em `loadSave()`.
   - [x] Expansão P1 de catálogo com >= 10 itens Comuns e garantia de 4 itens estritamente sem duplicatas.
   - [x] Implementação P1 de identidade visual procedural de empunhaduras (`dragon_leather`, `tsukamaki`, `goldwire`, etc.) e runas no sangradouro.
   - [x] Implementação P1 de herança física em `FusionCore` com divergência de combate na forja.
   - [x] Desacoplamento P1 da economia de golpes via `applyStrikeRewardTransaction` puro com compactação a 200 IDs.
   - [x] Suíte de 96 testes automatizados com 100% de aprovação (0 falhas) e TypeScript estrito (0 erros).
   - [x] 5 evidências visuais capturadas em `public/game/evidence/` e pasta de artefatos.

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
