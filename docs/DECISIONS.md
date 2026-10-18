# Registro de Decisões Canônicas & Governança — FioForja

Este documento é a fonte de autoridade para decisões arquiteturais, de produto e regras econômicas do projeto FioForja.
Todas as decisões contêm taxonomia estrita de governança:
- `[USER-APPROVED]`: Diretiva explícita ou mandato aprovado pelo usuário.
- `[AGENT-IMPLEMENTED]`: Decisão técnica estruturada pelo agente para cumprir as diretivas canônicas.
- `[VERIFIED]`: Validada por testes unitários adversariais e evidências reais em runtime.
- `[PROPOSED]`: Hipótese ou melhoria em avaliação para próximas ofensivas.
- `[UNKNOWN]`: Estado legado pendente de triagem.

---

## 1. Princípios Fundamentais de Produto

- **THE WEAPON IS THE HERO. THE PLAYER FORGES THE TROPHY.** `[USER-APPROVED]` `[VERIFIED]`
  A forja manual na bigorna baseada em física e habilidade do jogador é o centro absoluto da experiência. Sistemas econômicos, coleções, componentes e fusões existem para valorizar e coroar a fabricação manual, e nunca para substituí-la por catálogos automáticos ou cliques passivos.
- **Raridade é Conquistada, Não Gerada Arbitrariamente:** `[USER-APPROVED]` `[VERIFIED]`
  Lendárias e Relíquias exigem materiais nobres, maestria técnica e dedicação. A qualidade numérica e a raridade são eixos distintos: uma lâmina mal forjada em aço sideral exibirá defeitos metalúrgicos reais (empenamento, trincas, acabamento fosco).
- **Fidelidade e Estética Medieval Autêntica:** `[USER-APPROVED]` `[VERIFIED]`
  Proibição absoluta de neon fluorescente ou brilho artificial desmotivado nas cruzetas e pomos. A iluminação de runas é física, incisa e condicional à têmpera e gravação rúnica.

---

## 2. Decisões Canônicas — Operação 01 & 01.2: Arsenal Vivo

### FIOFORJA-FUSION-001: Sistema Híbrido de Fusão `[USER-APPROVED]` `[VERIFIED]`
- **Fusão de Componentes:** 4 componentes da mesma categoria (4 cabos, 4 guardas, 4 pomos ou 4 runas) produzem 1 componente de tier superior.
- **Fusão de Espadas:** 4 espadas concluídas do Arsenal são consumidas transacionalmente para produzir **um Núcleo de Fusão (`FusionCore`)**.
- **Invariante de Ouro:** A fusão de espadas **NUNCA** entrega uma espada Lendária pronta de forma instantânea. O jogador deve obrigatoriamente levar o núcleo para a bigorna e executar a forja manual.
- **Herança Funcional:** Armas doadoras transmitem seus perfis físicos (ataque, defesa, agilidade, afinidade rúnica) ao núcleo, influenciando a arma forjada sem gerar acúmulo infinito de bônus.

### FIOFORJA-INTEGRITY-001: Anti-Stacking e Decomposição de Atributos `[USER-APPROVED]` `[VERIFIED]`
- Separação estrita entre atributos intrínsecos imutáveis da têmpera (`baseDamage`, `baseDefense`, `baseAgility`, `baseDurability`), qualidade de fabricação, montagem de componentes (1 por slot, com devolução da peça antiga) e refinos.
- Função determinística pura `recalculateSwordStats()` recalcula atributos a partir da base física sem efeitos colaterais de React setters.

### FIOFORJA-LOOT-001: Motor Real de Drops Ponderados sem Duplicatas `[AGENT-IMPLEMENTED]` `[VERIFIED]`
- Sorteio de 4 cartas com garantia matemática de 4 itens sempre distintos por rodada de forja (`catalogKey` deduplication), abrangendo de Comum a Relíquia.

---

## 3. Decisões Canônicas — Operação 02: A Forja do Prestígio

### FIOFORJA-TRANSACTIONS-001: Arquitetura Fail-Closed Transacional Pura `[USER-APPROVED]` `[VERIFIED]`
- Todas as mutações de jogo (fusões, montagens, compras no bazar, refinos, entregas) são puras e atômicas em `src/game/transactions.ts`.
- Qualquer falha de I/O de armazenamento aborta imediatamente a operação sem alterar a carteira, inventário ou arsenal do jogador.

### FIOFORJA-PRESTIGE-001: 5 Lâminas de Referência e Bazar da Ferraria `[USER-APPROVED]` `[VERIFIED]`
- Implementação e curadoria visual de 5 armas de referência no catálogo canônico (`guarda_medieval`, `cimitarra_damasco`, `lua_silenciosa`, `folha_aereth`, `queda_asterion`).
- Criação do Bazar Medieval com abas de ferramentas, insumos, componentes e runas Elder Futhark.

---

## 4. Decisões Canônicas — Operação 03: O Ciclo do Ferreiro

### FIOFORJA-PROGRESSION-001: Gating Real por Insumos e Consumo de Metais `[USER-APPROVED]` `[VERIFIED]`
- Unificação das chaves primárias canônicas de metais em `src/game/materials.ts` (`iron_ingot`, `steel_ingot`, `damascus_billet`, `blacksteel_chunk`, `elven_silver_ingot`, `starmetal_ore`, `ancient_relic_shard`).
- Toda forja regular exige e consome atomicamente 1x metal correspondente ao aço escolhido (`executeStartForgeTransaction`). Se o estoque for 0, a forja é bloqueada (`INSUFFICIENT_MATERIALS`).
- Cancelar ou sair antes do primeiro golpe estorna 100% do metal consumido via `executeCancelForgeTransaction`.

### FIOFORJA-PROGRESSION-002: Garantia Anti-Softlock e Treino de Oficina `[USER-APPROVED]` `[VERIFIED]`
- Todo save inicial ou legado migrado recebe 8x ferro, 4x aço e 850 moedas.
- Se o jogador quebrar uma lâmina na forja, recebe +2x sucata (`scrap`).
- 2x sucata podem ser refundidas na Oficina em 1x lingote de ferro (`iron_ingot`) via `executeRecycleScrapTransaction`.
- Caso esteja com zero metais e zero moedas, o jogador dispõe do modo "Treino Básico de Oficina" (`isTraining: true`), que permite forjar livremente sem materiais, porém com valor monetário e drops zerados para impedir exploração econômica.

### FIOFORJA-PROGRESSION-003: Estados Explícitos de Blueprints no Compêndio `[USER-APPROVED]` `[VERIFIED]`
- Presets canônicos possuem 6 estados estritos (`locked`, `known`, `discovered`, `ready`, `crafted`, `mastered`) avaliados dinamicamente por `evaluateBlueprintStatus`.
- A simples posse de metal meteórico **NÃO** autoriza o forjamento de armas Lendárias. Armas de alto escalão exigem marcos reais de carreira (Rank S, contagem de forjas concluídas) ou autorização específica via Núcleo de Fusão.
- Núcleos de fusão são consumidos atomicamente na conclusão da forja e não podem ser reutilizados (`CORE_NOT_FOUND`).

### FIOFORJA-PROGRESSION-004: Encomendas da Guilda dos Ferreiros `[AGENT-IMPLEMENTED]` `[VERIFIED]`
- 3 encomendas canônicas iniciais (Capitão Valerius, Comandante Kael, Lord Alistair) adicionadas como 8º pilar da Galeria.
- Validação estrita de critérios (`isSwordEligibleForCommission`): metal, família, qualidade mínima e papel de combate.
- Recompensas substanciais de ouro, rubis e metais superiores, com etiquetagem indelével da arma entregue (`commissionDelivered: true`).

### FIOFORJA-PROGRESSION-005: Recuperação de Persistência com Tentativa Segura `[AGENT-IMPLEMENTED]` `[VERIFIED]`
- Em caso de falha de gravação no término da forja (`QuotaExceededError`), a arma não é descartada nem forçada na interface de revelação.
- O payload é retido em `uncommittedSave` e uma interface modal permite ao usuário tentar gravar novamente (`retryPersistSave`) sem sortear novos atributos ou regenerar RNG.

---

## 5. Hipóteses em Avaliação Técnica (Provisórias)

- **[PROPOSED] Fórmulas Dinâmicas de Encomendas:** Geração procedural de encomendas semanais da guilda de acordo com o renome do artesão.
- **[PROPOSED] Afiação em Pedra d'Água:** Mini-jogo opcional no acabamento para extrair gume supremo (+3% a +5% P.ATK).
