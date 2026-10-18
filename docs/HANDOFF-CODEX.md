# FioForja — Contrato de Transferência e Handoff para o Codex
## Guia Definitivo de Continuidade entre Agentes Autônomos (Operação 04: A Prova da Forja)

---

### 1. ONDE ESTAMOS?
- **Repositório:** `phpedrogarcia-afk/FioForja`
- **Branch Ativa:** `antigravity/forge-lifecycle-proof-v1`
- **Base de Continuidade:** `antigravity/blacksmith-progression-v1` (Commit `6e3920d4a8a92bca0b4d6f238d6232d3645a6b6c`)
- **Estado Geral:** A Operação 04 consolidou a integridade de ciclo de vida das tentativas de forja, isolou hermeticamente o modo treino e garantiu uma rota anti-softlock justa baseada em mérito técnico:
  - **Ciclo de Vida da Tentativa & Política Justa de Cancelamento (`src/game/transactions.ts`):** 4 estados estritos (`PREPARED`, `ACTIVE`, `COMPLETED`, `CANCELLED`). `executeStartForgeTransaction` rejeita tentativas simultâneas (`ATTEMPT_ALREADY_ACTIVE`). O cancelamento em `PREPARED` (0 golpes) devolve 100% do lingote; em `ACTIVE` (≥1 golpe), não devolve o metal nobre, mas concede +1x sucata (`scrap`) de salvamento. Tentativas canceladas ou completadas são imutáveis.
  - **Identidade Estrita da Forja (`forgeRunId`):** O ID da tentativa é emitido na largada, passado ao simulador, ao canvas e impresso na lâmina `FinishedSword.forgeRunId`.
  - **Modal de Recuperação de Tentativa Ativa:** Ao recarregar com tentativa pendente em disco, `GameApp.tsx` apresenta um modal contextual permitindo `[🔨 Continuar Forja]` ou `[❌ Cancelar / Abandonar]`.
  - **Isolamento Hermético do Modo Treino:** O modo treino (`isTraining: true`) não gera ouro por golpe na bigorna (`TRAINING_MODE_NO_GOLD`), não gera drops de cartas, não pontua estatísticas de carreira/maestria e armazena espadas exclusivamente em `trainingGallery` no `SaveData`.
  - **Rejeição Categórica no Crisol e Encomendas:** `validateSwordFusionTransaction` e `isSwordEligibleForCommission` rejeitam expressamente armas de treino e armas já entregues em encomendas (`commissionDelivered`).
  - **Anti-Softlock por Mérito Técnico (Limalha de Oficina):** Concluir treino com qualidade $\ge 50$ concede +1x sucata (`scrap`). Duas sessões dedicadas de treino conferem 2 sucatas, recicláveis em 1 lingote de ferro (`executeRecycleScrapTransaction`), permitindo recuperação mesmo com 0 ouro e 0 materiais.
  - **Bloqueio Metalúrgico de Projetos Customizados (`src/game/screens/DesignScreen.tsx`):** A seleção de aços nobres no construtor livre exige o respectivo tier de metalurgia na carreira (`career.unlockedTiers`), impedindo bypass da progressão.
  - **Atribuição Legítima de Papel Defensivo & Encomenda do Capitão Valerius:** `calculateSwordAttributes` confere organicamente `combatRole: "Defensiva"` a espadas de ferro com cruzeta (`guard: "cross"`) ou perfil curto/longo, permitindo que a primeira encomenda da guilda (`comm_guard_captain`) seja concluída legitimamente desde a primeira forja do jogo.

---

### 2. O QUE QUEREMOS?
- Consolidar o FioForja como o melhor jogo de forja e coleção de armas medievais no navegador.
- O princípio sagrado é: **THE WEAPON IS THE HERO. THE PLAYER FORGES THE TROPHY**.
- O ciclo central agora é auditável e hermético: o ferreiro inicia a forja consumindo metal, martela a lâmina em tempo real, pode cancelar com regras justas ou recuperar a sessão em reload, conclui encomendas legítimas, adquire receitas e funde armas antigas no Crisol sem quebras de integridade.

---

### 3. COMO AUDITAR E EXECUTAR O PROJETO (Checklist do Codex)
Para auditoria completa e sem intervenção manual, execute em ordem:
```bash
# 1. Verificar tipagem estrita (TypeScript)
npm run typecheck

# 2. Executar linter
npm run lint

# 3. Executar suíte completa de testes automatizados (126 testes, 27 suites)
npm test

# 4. Executar build de produção do Vite / Nitro
npm run build
```

---

### 4. O QUE ESTÁ COMPROVADO POR TESTES E EVIDÊNCIAS?
- **TypeScript:** 0 erros (`npm run typecheck` código 0).
- **Testes Automatizados:** 126 testes em 27 suites 100% aprovados (`npm test`), incluindo 9 testes adversariais e de ciclo de vida em `src/game/lifecycle-proof.test.ts`.
- **Linter:** 0 erros (`npm run lint` código 0).
- **Build de Produção:** Concluído com sucesso (`npm run build`).
- **Evidências Visuais Reais em `public/game/evidence/`:**
  - `proof-01-recovery-modal-active-attempt.png`: Modal de recuperação de tentativa ativa ao recarregar a tela com opções de continuar ou cancelar.
  - `proof-02-cancel-fair-scrap-salvage.png`: Política justa de cancelamento após golpes desferidos concedendo +1x sucata de salvamento.
  - `proof-03-metallurgy-gating-custom.png`: Banner de metalurgia bloqueada na tela de Design impedindo forja de aço nobre sem maestria.
  - `proof-04-valerius-commission-defensive.png`: Encomenda do Capitão Valerius com espada de ferro Defensiva legítima pronta para entrega.
  - `proof-05-commission-delivered-rewards.png`: Conclusão da entrega da encomenda com payout de 350 ouro, 5 rubis e 2x lingotes de aço.

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
4. **NUNCA permita iniciar nova forja se já houver tentativa ativa (`ATTEMPT_ALREADY_ACTIVE`).**
5. **NUNCA permita que modo treino gere ouro por golpes, recompensas monetárias, drops ou pontuação de carreira.**
6. **NUNCA permita softlock de novato:** Treino de oficina com limalha (Q ≥ 50) e reciclagem de sucata devem sempre permitir ascensão econômica.
7. **NUNCA execute force push.**
8. **NUNCA descarte dados de save dos jogadores.** Migrações devem ser 100% preservativas.

