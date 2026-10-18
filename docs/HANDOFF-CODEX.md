# FioForja — Contrato de Transferência e Handoff para o Codex
## Guia Definitivo de Continuidade entre Agentes Autônomos (Operação 03: O Ciclo do Ferreiro)

---

### 1. ONDE ESTAMOS?
- **Repositório:** `phpedrogarcia-afk/FioForja`
- **Branch Ativa:** `antigravity/blacksmith-progression-v1`
- **Base de Continuidade:** `antigravity/forge-of-prestige-v1` (Commit `6674640aac8ff474db8e21cce357b24936b66713`)
- **Estado Geral:** A Operação 03 fechou a lacuna entre a economia e a fabricação manual, conectando insumos, desbloqueios de projetos, encomendas da guilda e garantias anti-softlock em um ciclo jogável e virtuoso:
  - **Gating de Insumos & Consumo Atômico de Metais (`src/game/materials.ts`):** 7 chaves primárias canônicas (`iron_ingot`, `steel_ingot`, `damascus_billet`, `blacksteel_chunk`, `elven_silver_ingot`, `starmetal_ore`, `ancient_relic_shard`). A forja regular consome atomicamente 1x metal base correspondente; cancelar a forja estorna 100% do insumo.
  - **Garantia Anti-Softlock & Reciclagem de Sucata:** Saves iniciam com 8x ferro, 4x aço e 850 moedas. Quebrar lâminas na bigorna gera +2x sucata (`scrap`), e a Oficina possui ferramenta de bancada para refundir 2x sucata em 1x ferro utilizável.
  - **Modo "Treino Básico de Oficina":** A qualquer momento (e automaticamente se o ferreiro estiver sem metais), o jogador pode iniciar forja de treino livre (`isTraining: true`), isolada com recompensas e drops zerados para impedir exploração econômica.
  - **Compêndio com 6 Estados Explícitos de Blueprints (`src/game/blueprints.ts`):** `locked`, `known`, `discovered`, `ready`, `crafted`, `mastered`. A simples posse de metal raro **não** autoriza forjar Lendárias sem marcos reais de carreira ou Núcleos de Fusão.
  - **Encomendas da Guilda dos Ferreiros (`src/game/commissions.ts`):** 8º pilar na Galeria com pedidos de Capitão Valerius, Comandante Kael e Lord Alistair, exigindo papéis de combate, qualidade e metais específicos, com etiquetagem de entrega na arma.
  - **Recuperação de Persistência com Retry Seguro:** Se o storage estourar (`QuotaExceededError`), a arma não é perdida; o payload fica seguro em `uncommittedSave` com modal `[🔄 Tentar Gravar Novamente]` sem sortear novos atributos.

---

### 2. O QUE QUEREMOS?
- Consolidar o FioForja como o melhor jogo de forja e coleção de armas medievais no navegador.
- O princípio sagrado é: **THE WEAPON IS THE HERO. THE PLAYER FORGES THE TROPHY**.
- O ciclo central agora é completo: o jogador forja armas básicas, entrega encomendas da guilda, ganha ouro e metais superiores, compra receitas e lingotes no bazar, funde armas antigas em núcleos poderosos e forja troféus Lendários na bigorna.

---

### 3. COMO FUNCIONA A ARQUITETURA?
1. **Transações Puras Fail-Closed (`src/game/transactions.ts`):**
   - Mutações de estado executadas deterministicamente: `executeStartForgeTransaction`, `executeCancelForgeTransaction`, `executeFinishSwordTransaction`, `executeDeliverCommissionTransaction`, `executeRecycleScrapTransaction`, `retryPersistSave`, além das transações prévias de bazar, fusão e refino.
   - Retorno unificado `TransactionExecutionResult<T>`. Se `writeSave()` falhar, o estado em memória não avança.
2. **Sistema de Materiais e Insumos (`src/game/materials.ts`):**
   - Mapeamento universal de metais e insumos com suporte a chaves primárias e aliases legados (`getMaterialStock`, `deductMaterialStock`, `addMaterialStock`, `recycleScrapToIron`).
3. **Avaliação de Projetos (`src/game/blueprints.ts`):**
   - Função pura `evaluateBlueprintStatus(preset, inventory, career, gallery, activeCore)` retorna o estado (`state`) e requisitos detalhados de desbloqueio.
4. **Galeria com 8 Pilares (`src/game/screens/GalleryScreen.tsx`):**
   - Arsenal, Compêndio, Componentes, Runas, Oficina, Crisol de Fusão, Legado e **Encomendas**.

---

### 4. O QUE ESTÁ COMPROVADO POR TESTES E EVIDÊNCIAS?
- **TypeScript:** 0 erros (`npm run typecheck`).
- **Testes Automatizados:** 117 testes em 26 suites 100% aprovados (`npm test`), incluindo os 15 testes adversariais em `src/game/progression.test.ts`.
- **Linter:** 0 erros (`npm run lint`).
- **Build de Produção:** Concluído com sucesso (`npm run build`).
- **Simulação Econômica Monte Carlo:** 60 partidas por perfil (Iniciante, Intermediário, Experiente) comprovam sustentabilidade, progressão de materiais e ausência de softlocks (`scripts/simulate-economy-progression.mjs`).
- **Evidências Visuais Capturadas via Playwright:**
  - `progression-01-design-screen-gating.png`: Tela de Design com selos do Compêndio e estoque de metal.
  - `progression-02-gallery-commissions-tab.png`: 8º Pilar da Galeria com a lista de encomendas da guilda.
  - `progression-03-commission-delivered.png`: Entrega de encomenda com ouro/rubis/aço creditados.
  - `progression-04-workshop-scrap-recycle.png`: Refundição de sucata na Oficina.
  - `progression-05-practice-forge-live.png`: Modo de treino de oficina ao vivo.

---

### 5. PRÓXIMOS PASSOS SUGERIDOS PARA O CODEX
1. **Minigame de Corte (Pátio de Treino / Tameshigiri):** Teste jogável de corte em esteiras de palha ou postes de carvalho para colocar à prova os atributos `P.ATK`, `DEF`, `AGI` e `DUR` das armas do Arsenal.
2. **Geração Procedural de Encomendas Adicionais:** Rotação periódica de pedidos da nobreza e ordens de cavalaria com base no renome do ferreiro.
3. **Efeitos Visuais de Fornalha Viva:** Partículas dinâmicas adicionais na animação de têmpera e aquecimento da lâmina.

---

### 6. O QUE NÃO PODE SER VIOLADO? (Invariantes Sagrados)
1. **NÃO altere `main`** sem autorização explícita e validação total.
2. **NUNCA entregue uma espada pronta a partir de fusão de espadas.** Fusão gera Núcleo de Fusão que DEVE ser forjado na bigorna pelo jogador.
3. **NUNCA permita iniciar forja regular sem possuir o insumo de metal.**
4. **NUNCA permita softlock de novato:** Treino de oficina e reciclagem de sucata devem sempre permanecer disponíveis.
5. **NUNCA execute force push.**
6. **NUNCA descarte dados de save dos jogadores.** Migrações devem ser 100% preservativas.
