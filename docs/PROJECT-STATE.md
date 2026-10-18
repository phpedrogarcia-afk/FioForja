# Estado Atual do Projeto — FioForja

**Data da Atualização:** 18 de Outubro de 2026  
**Branch de Trabalho:** `antigravity/blacksmith-progression-v1`  
**Base Canônica de Continuidade:** `antigravity/forge-of-prestige-v1` (`6674640aac8ff474db8e21cce357b24936b66713`)  
**Missão Concluída:** Operação 03: O Ciclo do Ferreiro — Progressão Real, Crafting Integrado, Economia Significativa e Experiência Jogável  
**Registros Históricos:** Arquivados em [`docs/historical/`](historical/)

---

## 1. FATOS COMPROVADOS (KNOWN & VERIFIED)

### A. Gating Real de Insumos e Consumo Atômico de Metais (`src/game/materials.ts` & `src/game/transactions.ts`)
- **Unificação Metalúrgica Canônica:** Chaves primárias consolidadas para os 7 aços do jogo (`iron_ingot`, `steel_ingot`, `damascus_billet`, `blacksteel_chunk`, `elven_silver_ingot`, `starmetal_ore`, `ancient_relic_shard`), com resolução transparente de aliases legados (`iron`, `damascus`, `blacksteel`).
- **Transação de Início de Forja (`executeStartForgeTransaction`):** Toda forja regular verifica o estoque de insumos e debita atomicamente 1x metal correspondente. Se o jogador tiver 0 unidades, a forja é bloqueada (`INSUFFICIENT_MATERIALS`).
- **Garantia de Estorno no Cancelamento (`executeCancelForgeTransaction`):** Cancelar ou sair antes do primeiro golpe devolve 100% do insumo consumido de volta ao inventário do ferreiro.

### B. Proteção Anti-Softlock, Reciclagem de Sucata e Modo de Treino
- **Estoque Inicial de Resguardo:** Novos jogadores e saves legados migrados recebem estoque inicial digno (8x lingote de ferro, 4x lingote de aço e 850 moedas de ouro).
- **Recuperação de Falhas (Sucata):** Se uma lâmina quebrar por abuso térmico ou estresse físico, o ferreiro recolhe +2x sucata (`scrap`).
- **Refundição de Sucata (`executeRecycleScrapTransaction`):** Ferramenta na bancada da Oficina permite transformar 2x sucata em 1x lingote de ferro utilizável.
- **Treino Básico de Oficina (`isTraining: true`):** A qualquer momento — e especialmente se estiver sem metais e sem ouro — o artesão pode executar forja livre de treino. O modo é visualmente sinalizado com marca d'água na bigorna e isolado economicamente (valor de venda = 0, ouro de golpes = 0, drops de forja = 0), impedindo exploração.

### C. Estados Explícitos de Blueprints no Compêndio (`src/game/blueprints.ts`)
- Os projetos canônicos são classificados dinamicamente em 6 estados estritos:
  - `locked`: Requisitos de carreira não atingidos (exibe texto claro de como desbloquear).
  - `known`: Conhecido na literatura da forja, mas requer descoberta ativa.
  - `discovered`: Projeto desbloqueado por conquista ou compra de receita, aguardando metal no estoque.
  - `ready`: Desbloqueado e com estoque de metal disponível para forja imediata.
  - `crafted`: Já forjado com sucesso ao menos uma vez e presente no Arsenal.
  - `mastered`: Dominado com perfeição (Rank S, qualidade ≥ 95%).
- **Proteção de Armas Lendárias:** A simples posse de metal meteórico **NÃO** autoriza forjar a Queda de Asterion ou Cinzas Ancestrais. É obrigatório atingir marcos de carreira (ex.: 2 Obras-primas Rank S) ou portar um Núcleo de Fusão compatível.

### D. Encomendas da Guilda dos Ferreiros (`src/game/commissions.ts`)
- Oitavo pilar integrado na Galeria (`currentTab === "commissions"`):
  - **Capitão Valerius (Sentinela da Muralha Norte):** Exige lâmina de ferro com papel Defensivo e qualidade ≥ 60%. Paga 350 ouro, 5 rubis e 2x lingotes de aço nobre.
  - **Comandante Kael (Falcões Cinzentos):** Exige lâmina ágil (AGI ≥ 22) com qualidade ≥ 75%. Paga 600 ouro, 10 rubis e 1x tarugo de Damasco.
  - **Lord Alistair (Alta Nobreza):** Exige lâmina de duelo ofensiva (ATK ≥ 32) com qualidade ≥ 88%. Paga 1.200 ouro, 20 rubis e 1x minério de meteorito.
- A entrega (`executeDeliverCommissionTransaction`) valida os requisitos matematicamente, impede entregas duplicadas e grava indelévelmente a encomenda na arma (`commissionDelivered`).

### E. Resiliência de Persistência Fail-Closed (`retryPersistSave` em `GameApp.tsx`)
- Caso a persistência em disco falhe durante o término da forja (`QuotaExceededError`), a arma forjada não é descartada nem empurrada para a tela de revelação em estado desincronizado.
- O payload é preservado em `uncommittedSave`, e um modal contextual surge oferecendo a ação `[🔄 Tentar Gravar Novamente]`. A gravação reexecuta sem sortear novos atributos nem regenerar sementes de RNG.

### F. Simulação Econômica Multi-Perfil (`scripts/simulate-economy-progression.mjs`)
- Simulação Monte Carlo validada em 60 partidas por perfil:
  - **Iniciante:** 49 armas concluídas, 11 quebras (22% de taxa de falha), 52 treinos livres, 2 encomendas da muralha entregues, ouro final de 2.650 🪙. Zero softlocks.
  - **Intermediário:** 56 armas concluídas, 4 quebras, 3 Obras-primas Rank S, compra ativa de 10x lingotes de Damasco no Bazar, 1ª arma Épica na rodada #4 e 1ª Lendária na #7.
  - **Experiente:** 60 armas concluídas, 0 quebras, 26 Obras-primas Rank S (43% de taxa de maestria), compra de 6x lingotes de aço negro, 1ª Lendária na rodada #6.

### G. Métricas Técnicas e Verificação
- **TypeScript:** 0 erros (`npm run typecheck` código 0).
- **Testes Automatizados:** 117 testes em 26 suites, 0 falhas (`npm test`), incluindo 15 testes adversariais específicos da Operação 03 (`src/game/progression.test.ts`).
- **Linter:** 0 erros (`npm run lint` código 0).
- **Build de Produção:** Concluído com sucesso em 410ms (`npm run build`).
- **Evidências Visuais Capturadas via Playwright:**
  - `progression-01-design-screen-gating.png`: Tela de Design com selos de estado do Compêndio, indicadores de estoque de metal e botão de treino.
  - `progression-02-gallery-commissions-tab.png`: 8º Pilar da Galeria com a lista de patronos da guilda e requisitos.
  - `progression-03-commission-delivered.png`: Encomenda do Capitão Valerius entregue com sucesso, payout de ouro/rubis/aço creditado e arma etiquetada.
  - `progression-04-workshop-scrap-recycle.png`: Ferramenta de reciclagem de sucata em ferro comum e garantias anti-softlock.
  - `progression-05-practice-forge-live.png`: Sessão de forja ativa em modo de treino de oficina.

---

## 2. INVARIANTES ATIVOS
1. **The Weapon is the Hero. The Player Forges the Trophy.**
2. **Fail-Closed Persistence:** Nenhuma alteração de estado avança na UI sem confirmação de persistência em disco.
3. **Materials Matter:** Metais são necessários para forjas regulares; o estoque é debitado atomicamente.
4. **Anti-Softlock:** O jogador iniciante ou falido nunca fica impossibilitado de forjar.
5. **Isolamento de Branches:** Todo o trabalho foi realizado na branch `antigravity/blacksmith-progression-v1`. A branch `main` nunca é modificada diretamente.
