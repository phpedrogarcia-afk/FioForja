# FioForja — Contrato de Transferência e Handoff para o Codex
## Guia Definitivo de Continuidade entre Agentes Autônomos (Operação 02: A Forja do Prestígio)

---

### 1. ONDE ESTAMOS?
- **Repositório:** `phpedrogarcia-afk/FioForja`
- **Branch Ativa:** `antigravity/forge-of-prestige-v1`
- **Base de Continuidade:** `antigravity/arsenal-vivo-integrity` (Commit `cd59d6bddc6c729d95fae80cd1430bc6d2047295`)
- **Estado Geral:** A Operação 02 consolidou o FioForja com foco total no prestígio, armas extraordinárias, transações puras fail-closed e mercado medieval autêntico:
  - **Consolidação Transacional Fail-Closed (`src/game/transactions.ts`):** 9 mutações de estado isoladas em funções puras testadas com falha de storage induzida (`QuotaExceededError`). Nenhuma alteração é refletida em memória ou interface sem confirmação de escrita persistente.
  - **5 Lâminas de Referência Canônicas com Identidade Real:** Padrões em `CANONICAL_PRESETS` cobrindo Medieval Comum (`guarda_medieval`), Damasco (`cimitarra_damasco`), Oriental (`lua_silenciosa`), Élfica (`folha_aereth`) e Meteórica (`queda_asterion`), com zero neon em cruzetas e respeito integral a `docs/canon/estetica.md`.
  - **Funções de Combate & Especialização (`CombatRole`):** Papéis `Ofensiva`, `Defensiva`, `Ágil`, `Equilibrada` e `Excepcional` com multiplicadores físicos sobre P.ATK, DEF, AGI e DUR.
  - **Comparador Tático de Lâminas (`WeaponComparisonModal`):** Modal de alta fidelidade para comparação lado a lado de qualquer par de lâminas do Arsenal com visualização das peças instaladas e cálculo de vantagens (+X / +Y).
  - **Bazar Medieval da Oficina Expandido:** 5 abas ativas para compra com ouro e rubis (Ferramentas, Lingotes, Guarnições, Runas Futhark e Catalisadores).
  - **Sensorial de Áudio Aprimorado:** Micro-jitter harmônico em `playCoinJingle` (+/- 2.5% de pitch) e fanfares de conclusão de forja.

---

### 2. O QUE QUEREMOS?
- Consolidar o FioForja como o melhor jogo de forja e coleção de armas medievais no navegador.
- O princípio sagrado é: **THE WEAPON IS THE HERO. THE PLAYER FORGES THE TROPHY**.
- A sorte concede materiais e oportunidades; a destreza do jogador na bigorna determina a qualidade física, a beleza e a glória da arma final.

---

### 3. COMO FUNCIONA A ARQUITETURA?
1. **Transações Puras Fail-Closed (`src/game/transactions.ts`):**
   - Todas as modificações de Save são executadas deterministicamente: `executeSwordFusionTransaction`, `executeComponentFusionTransaction`, `executeComponentInstallTransaction`, `executeUpgradeSwordTransaction`, `executeShopPurchaseTransaction`, `executeClaimRewardsTransaction`, `executeFinishSwordTransaction` e `executeStrikeRewardTransaction`.
   - Se `writeSave()` falhar, o estado em memória é descartado e o backup em `a-forja-save-backup` permanece intacto.
2. **Simulação e Física (`src/game/sim.ts`, `src/game/catalog.ts`):**
   - Estado de forja (`SimState`) com calor, estresse, trincas, zonas de impacto (`base`, `mid`, `tip`), `PhysicalBladeProfile` e suporte a `activeCore`.
   - `finishSword()` herda linhagem genética do núcleo (`fusionHistory`, `inheritedPerks`, `bonusQuality`, `heritage`), determina `combatRole` e executa `recalculateSwordStats()`.
3. **Renderização Visual (`src/game/ForgeCanvas.tsx`, `src/game/swordDraw.ts`):**
   - Canvas 2D em 60 FPS com interpolação suave.
   - Texturas táteis para empunhaduras e runas Elder Futhark talhadas em baixo-relevo chanfrado no sangradouro.
   - Restrição estrita de neon cyan: lâminas físicas usam cabochões de granada e latão na cruzeta; apenas armas ativamente rúnicas exibem ressonância estelar sutil.
4. **Bazar e Galeria (`src/game/screens/GalleryScreen.tsx`):**
   - 7 pilares navegáveis: Arsenal, Compêndio, Componentes, Runas, Oficina, Crisol de Fusão e Legado.
   - Modo de seleção comparativa na Galeria com dock inferior e modal dedicado `WeaponComparisonModal`.

---

### 4. O QUE ESTÁ COMPROVADO POR TESTES E EVIDÊNCIAS?
- **TypeScript:** 0 erros (`npm run typecheck`).
- **Testes Automatizados:** 102 testes em 25 suites 100% aprovados (`npm test`).
- **Build de Produção:** Concluído com sucesso (`npm run build`).
- **Evidências Visuais Capturadas:**
  - `prestige-01-canonical-5-weapons-gallery.png`: Galeria com as 5 armas canônicas e botões de inspeção e comparação.
  - `prestige-02-velvet-inspection-damascus.png`: Inspeção em veludo da Cimitarra de Damasco (ondas moiré e granada).
  - `prestige-03-velvet-inspection-asterion.png`: Inspeção em veludo da Queda de Asterion (aço meteórico e asas).
  - `prestige-04-weapon-comparison-modal.png`: Comparador Tático lado a lado com deltas matemáticos de ATK/DEF/AGI/DUR.
  - `prestige-05-medieval-bazaar-expanded.png`: Bazar medieval na Oficina com peças e guarnições.
  - `prestige-06-bazaar-runes-futhark.png`: Bazar medieval exibindo as Runas Futhark disponíveis.

---

### 5. PRÓXIMOS PASSOS SUGERIDOS PARA O CODEX
1. **Minigame de Corte na Galeria / Pátio de Treino:** Teste de corte em tatame (tameshigiri) ou poste de madeira para colocar à prova de forma jogável os atributos `P.ATK`, `DEF`, `AGI` e `DUR`.
2. **Sistema de Encomendas da Guilda / Nobreza:** Pedidos com requisitos específicos de aço, formato e tempo limite, recompensando com títulos e moedas.
3. **Efeitos Adicionais de Transmutações no Crisol:** Partículas orbitais de brasas quentes durante a animação de fusão.

---

### 6. O QUE NÃO PODE SER VIOLADO? (Invariantes Sagrados)
1. **NÃO altere `main`** sem autorização explícita e validação total.
2. **NUNCA entregue uma espada pronta a partir de fusão de espadas.** Fusão de espadas gera Núcleo de Fusão que DEVE ser forjado na bigorna pelo jogador.
3. **NUNCA substitua habilidade por sorte pura.**
4. **NUNCA execute force push.**
5. **NUNCA descarte dados de save dos jogadores.** Migrações devem ser 100% preservativas.
