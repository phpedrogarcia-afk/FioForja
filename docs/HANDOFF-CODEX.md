# FioForja — Contrato de Transferência e Handoff para o Codex
## Guia Definitivo de Continuidade entre Agentes Autônomos

---

### 1. ONDE ESTAMOS?
- **Repositório:** `phpedrogarcia-afk/FioForja`
- **Branch Ativa:** `antigravity/arsenal-vivo-v1`
- **Branch de Base Comprovada:** `antigravity/grand-forge-total-refinement` (Commit `5835c0f`)
- **Estado Geral:** O jogo evoluiu de um protótipo de forja com apenas notas estáticas para uma simulação metalúrgica profunda, com cena artesanal em primeira pessoa (duas mãos: tenaz forjada e martelo contínuo), 9 famílias canônicas com geometrias distintas, incisão rúnica física chanfrada, atributos de combate derivados (`P.ATK`, `DEF`, `AGI`, `DUR`), galeria com 6 pilares e agora:
  - Sistema de economia em tempo real na bigorna (+3/+8/+12 ouro por golpe certeiro).
  - Motor real de drops dinâmicos por tabelas de raridade e performance (substituindo as 4 cartas fixas antigas).
  - Sistema Híbrido de Fusão (Opção C): fusão de componentes gera componentes prontos; fusão de espadas gera Núcleos de Fusão superiores que exigem forjamento manual na bigorna.
  - Save v5 com prevenção de colisão de IDs e transações idempotentes de recompensas.

---

### 2. O QUE QUEREMOS?
- Transformar o FioForja no jogo definitivo de forja e coleção de armas medievais no navegador.
- O jogador deve sentir a emoção de colecionar equipamentos raros, como em MMORPGs clássicos (estilo Lineage II), mas com o princípio sagrado: **THE PLAYER FORGES THE TROPHY**.
- A sorte concede a oportunidade (um núcleo raro, uma gema, um drop épico). A destreza do jogador na bigorna determina a qualidade física, a beleza e a glória da arma final.

---

### 3. COMO FUNCIONA A ARQUITETURA?
1. **Simulação e Física (`src/game/sim.ts`):**
   - Estado de forja (`SimState`) com calor, estresse, trincas, zonas de impacto (`base`, `mid`, `tip`) e `PhysicalBladeProfile`.
   - `stepSim()` calcula física a 60 FPS, gerando eventos de strike que disparam ganhos de ouro e áudio.
2. **Renderização Visual (`src/game/ForgeCanvas.tsx`, `src/game/swordDraw.ts`):**
   - Canvas 2D em 60 FPS com interpolação suave.
   - Deformação plástica contínua da lâmina orientada pelo perfil físico.
   - Rastreamento cinemático do martelo com impacto real na coordenada da lâmina.
   - Entalhe chanfrado em baixo-relevo de runas sem neon artificial.
3. **Economia e Drops (`src/game/loot.ts`, `src/game/catalog.ts`):**
   - Tabelas de loot com pesos calibrados por Rank de forja.
   - Sorteio determinístico com suporte a seed para testes.
   - Idempotência transacional via `claimedForgeRewardIds` para impedir recolhe duplicado.
4. **Crisol de Fusão (`src/game/fusion.ts`, `src/game/screens/FusionStationScreen.tsx`):**
   - Valida 4 itens elegíveis.
   - Aplica taxas e calcula probabilidades de transmutação com bad-luck protection (fragmentos de fusão).
   - Espadas geram `FusionCore` com herança de afixos e bônus de pureza.
5. **Persistência (`src/game/save.ts`):**
   - Save v5 em `localStorage` (`a-forja-save`).
   - Migrador automático e seguro a partir de qualquer versão prévia (v1 a v4).

---

### 4. O QUE ESTÁ ERRADO OU INCOMPLETO? (Dívidas Técnicas Conhecidas)
- **Telas Mobile Estreitas:** Em aparelhos ultra-estreitos (< 360px), inspecionar se a barra superior de recursos mantém legibilidade confortável.
- **Sistema de Combate Futuro:** Os atributos `P.ATK`, `DEF`, `AGI` e `DUR` estão completamente modelados e persistidos, mas o jogo atualmente é focado no ciclo da forja e coleção na Galeria. Um sistema de testes de corte/alvo ou arena é candidato para expansão posterior.
- **Áudio no Safari/iOS:** A Web Audio API requer toque inicial do usuário para destravar o contexto (`unlockAudio`). Já implementado, mas exige manutenção de boas práticas em novos botões.

---

### 5. O QUE DEVE SER FEITO DEPOIS? (Próximos Passos para o Codex)
1. **Entregas desta Missão (CONCLUÍDAS E VERIFICADAS):**
   - [x] Motor de Loot Dinâmico [`src/game/loot.ts`](../src/game/loot.ts) com suporte a seeds determinísticas e 4 cartas de loot ricas.
   - [x] Economia de Golpes em Tempo Real com floating popups e jingle Web Audio procedural na bigorna.
   - [x] Crisol de Fusão Híbrida (Opção C) com interface completa [`src/game/screens/FusionStationScreen.tsx`](../src/game/screens/FusionStationScreen.tsx) e catalisadores.
   - [x] Schema Save v5 com idempotência e migração sem perdas [`src/game/save.ts`](../src/game/save.ts).
   - [x] Simulação Monte Carlo completa: 10.000 drops, 5.000 fusões, 20.000 golpes [`docs/historical/monte-carlo-economy-report.md`](historical/monte-carlo-economy-report.md).
   - [x] 281 testes no total (274 pass, 0 fail, 7 symlink skips) e 0 erros de TypeScript.
   - [x] Capturas de evidência visual salvas em `public/game/evidence/` e pasta de artefatos.

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
