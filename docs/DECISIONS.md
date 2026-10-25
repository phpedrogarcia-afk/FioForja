# Registro de Decisões Canônicas & Governança — FioForja

Este documento é a fonte de autoridade para decisões arquiteturais, de produto e regras econômicas do projeto FioForja.
Os registros distinguem origem da decisão e alcance da evidência. Tags das Operações 01–04 são históricas; não provam o estado atual. A auditoria Codex 05 encontrou contraexemplos de golpe, núcleo, finalização, recuperação e treino. Evidência vigente: [relatório](../experiments/M03-cross-agent-integration/README.md).

Taxonomia:
- `[USER-APPROVED]`: Diretiva explícita ou mandato aprovado pelo usuário.
- `[AGENT-IMPLEMENTED]`: Decisão técnica estruturada pelo agente para cumprir as diretivas canônicas.
- `[VERIFIED]`: Validada no envelope de evidência indicado; teste de função, fixture e navegador têm escopos separados.
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
- As transações em `src/game/transactions.ts` constroem o próximo estado e tentam persistir antes de retorná-lo à interface. Executam I/O; não são funções puras.
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

## 5. Decisões Canônicas — Operação 04: A Prova da Forja

### FIOFORJA-LIFECYCLE-001: Ciclo de Vida da Tentativa de Forja & Política Justa de Cancelamento `[USER-APPROVED]` `[VERIFIED]`
- **Máquina de Estados Explícita da Tentativa:**
  - `PREPARED`: Tentativa inicializada, insumo debitado, 0 golpes desferidos.
  - `ACTIVE`: Primeiro golpe desferido (`strikesCount > 0`), peça sob deformação plástica e aquecimento real.
  - `COMPLETED`: Lâmina finalizada, atributos calculados e arquivada no Arsenal.
  - `CANCELLED`: Tentativa abortada pelo ferreiro antes da têmpera final.
- **Fail-Closed em Tentativas Duplicadas:**
  - `executeStartForgeTransaction` rejeita categoricamente o início de uma nova forja caso `save.activeAttempt` já exista e esteja em andamento (`ATTEMPT_ALREADY_ACTIVE`).
  - Tentativas canceladas ou completadas não podem ser canceladas novamente (`ATTEMPT_NOT_ACTIVE`).
- **Identidade Estrita de Execução (`forgeRunId`):**
  - O `forgeRunId` gerado em `executeStartForgeTransaction` é propagado pelo Canvas, associado ao simulador `createSim`, e impresso na lâmina final `FinishedSword.forgeRunId`, fornecendo identidade de correlação. O vínculo transacional e a rejeição de duplicatas foram reforçados na Operação Codex 05; o ID isolado não prova integridade.
- **Política Justa de Cancelamento (`executeCancelForgeTransaction`):**
  - **Em `PREPARED` (0 golpes):** O artesão desiste antes de bater no metal; 100% do lingote de metal consumido é estornado ao inventário (`refundedMaterial: true`).
  - **Em `ACTIVE` (≥1 golpe):** O lingote já foi deformado pelo martelo. Não há devolução do lingote de metal nobre, mas o ferreiro recolhe +1x sucata (`scrap`) de salvamento para reciclagem (`salvageScrap: 1`).
- **Recuperação de Tentativa Ativa ao Recarregar a UI:**
  - Ao recarregar a página com uma tentativa não finalizada em disco, `GameApp.tsx` apresenta um modal proeminente de recuperação informando o status, aço e golpes efetuados, com botões claros de `[🔨 Continuar Forja]` (retomando a cena com o mesmo `forgeRunId`) ou `[❌ Cancelar / Abandonar]` (aplicando a política justa de salvamento).

### FIOFORJA-TRAINING-001: Isolamento Estrito do Treino & Recuperação de Limalha Anti-Softlock `[USER-APPROVED]` `[VERIFIED]`
- **Isolamento Econômico e de Carreira Total:**
  - Forjas com `isTraining: true` não geram ouro por golpe na bigorna (`TRAINING_MODE_NO_GOLD`).
  - Ao finalizar a lâmina em modo treino, `executeFinishSwordTransaction` zera o objeto de recompensa (0 cartas, 0 ouro, 0 rubis, 0 diamantes).
  - Nenhuma estatística de carreira é incrementada (zero espadas forjadas, zero contadores de raridade, zero pontos de maestria de aço).
- **Galeria Segregada (`trainingGallery`):**
  - As espadas de treino são salvas exclusivamente em `trainingGallery` no `SaveData`, mantendo o `gallery` (Arsenal principal de troféus) 100% puro e imaculado.
- **Rejeição Categórica no Crisol e Encomendas:**
  - `validateSwordFusionTransaction` e `fuseSwords` lançam erro fatal se qualquer espada consumida tiver `isTraining === true` ou `commissionDelivered`.
  - `isSwordEligibleForCommission` rejeita sumariamente qualquer espada de treino para cumprimento de encomendas da guilda.
- **Recuperação de Limalha Anti-Softlock (Mérito Técnico):**
  - Para evitar que um jogador sem ouro e sem materiais fique preso para sempre, ao concluir uma sessão de treino com qualidade $\ge 50$, o artesão recolhe exatamente +1x sucata (`scrap`) decorrente da limalha e escórias recolhidas na bigorna.
  - 2 sessões bem executadas de treino rendem 2 sucatas, que são refundidas na Oficina em 1 lingote de ferro (`executeRecycleScrapTransaction`), permitindo ao aprendiz ascender de volta à economia real através de sua própria técnica.

### FIOFORJA-PROTECTION-001: Bloqueio Metalúrgico de Projetos Customizados no Construtor Livre `[USER-APPROVED]` `[VERIFIED]`
- A seleção livre de aços nobres no menu de Design (`damascus`, `blacksteel`, `elven_silver`, `meteor`, `ancient_alloy`) verifica o tier de maestria metalúrgica na carreira (`career.unlockedTiers`).
- Se o jogador não possuir a maestria necessária, o botão de início de forja real é desabilitado e um aviso explícito é renderizado: `🔒 Metalurgia Bloqueada: requer maestria em X para forjar`. O modo treino de oficina permanece liberado para estudo da têmpera.

### FIOFORJA-COMMISSIONS-001: Atribuição Legítima de Papel Defensivo e Integração do Capitão Valerius `[AGENT-IMPLEMENTED]` `[VERIFIED]`
- A função de atributos do catálogo (`calculateSwordAttributes`) confere organicamente `combatRole: "Defensiva"` a espadas de ferro com cruzeta (`guard: "cross"`) ou perfil curto (`profile: "short"`), atingindo naturalmente DEF $\ge 50$.
- A primeira encomenda da guilda (Capitão Valerius, `comm_guard_captain`) pode ser concluída legitimamente desde a primeira forja do jogo com os materiais iniciais, sem necessidade de mocks, bypasses ou trapaças de estado.

---

## 6. Integração Codex 05

### FIOFORJA-CHECKPOINT-001 `[AGENT-IMPLEMENTED]`

Uma ocorrência física usa uma transação única: checkpoint validado, sequência, contador e prêmio calculado pelo estado. A conclusão deriva do snapshot final confirmado e verifica tentativa/run/projeto/núcleo. Retomada é do último checkpoint, com até 1 s de recuo térmico/carga. Tentativas legadas sem snapshot são canceláveis; não recebem progresso inventado. Testes e provas: [rastreabilidade](../experiments/M03-cross-agent-integration/README.md).

### FIOFORJA-TRAINING-002 `[AGENT-IMPLEMENTED]`

Refina a exceção de limalha de TRAINING-001, preservando sua intenção humana de recuperação: treino íntegro Q≥50 concede 1 sucata somente enquanto `needsTrainingRecovery` for verdadeiro (ouro abaixo do lingote básico, sem ferro/aço utilizável, sucata<2). Cancelar treino não concede sucata. Escolha técnica desta integração, não novo balanceamento aprovado pelo usuário. Nova insolvência pode habilitar ajuda novamente.

### FIOFORJA-DNA-001 `[AGENT-IMPLEMENTED]`

Integração seletiva, legado padrão, URL válida com precedência, cache completo e miniaturas rasterizadas limitadas. Refinamentos Damasco/Oriental/Meteórica são **AGENT-DESIGNED** e aguardam aceitação humana. Contrato atual na [especificação visual](specs/weapon-visual-dna.md); a forja física não foi migrada.

## 7. Hipóteses em Avaliação Técnica (Provisórias)

- **[PROPOSED] Fórmulas Dinâmicas de Encomendas:** Geração procedural de encomendas semanais da guilda de acordo com o renome do artesão.
- **[PROPOSED] Afiação em Pedra d'Água:** Mini-jogo opcional no acabamento para extrair gume supremo (+3% a +5% P.ATK).

---

## 8. Navegação mobile e composição — decisão humana de 24/10/2026

<a id="fioforja-mobile-ux-001"></a>

### FIOFORJA-MOBILE-UX-001 — Navegação por seções e protagonismo da espada `[USER-APPROVED]`

**Origem:** decisão explícita do proprietário nesta data, após o vídeo de 23 segundos do APK no Poco. **Estado:** direção de produto aprovada; [protótipo experimental construído](../experiments/mobile-ux-v1/README.md), sem integração ao jogo nem validação humana do layout. Não atribuir aprovação visual ou prontidão de produção com base apenas na implementação do protótipo.

#### Arquitetura aprovada

Barra inferior fixa com **cinco seções**, em ordem estável:

| Seção | Responsabilidade |
|---|---|
| **Início** | Espada em destaque, progresso e próximo objetivo; acesso claro à próxima criação. |
| **Coleção** | Arsenal, Compêndio, componentes, runas e comparação. |
| **Forja** | Escolha e preparação do projeto e materiais, mantendo a prévia visível; início da fabricação imersiva. |
| **Loja** | Materiais, ferramentas, componentes e itens de fusão. |
| **Craft** | Crisol híbrido: fusão de espadas em núcleos e acesso à fusão de componentes. |

**Atualização humana de 24/10/2026:** Craft substitui Jogador; perfil, carreira, encomendas, equipamentos e configurações continuam previstos no Início/perfil. O [primeiro recorte de Craft](specs/craft-mobile-prototype.md) define seleção 2×2 e revisão antes do sacrifício; mesma raridade não exige mesma qualidade. A saída continua sendo núcleo. A integração transacional depende de aprovação visual e deve preservar núcleos antigos.

A barra **desaparece durante a fabricação da espada**. A forja ativa ocupa a tela disponível, respeita as áreas seguras do aparelho e mantém uma saída explícita com os contratos atuais de tentativa, cancelamento e recuperação. A visibilidade da barra na Revelação será definida no protótipo; sua ausência durante a fabricação não é opcional.

O acesso às funções se dá por seções e telas próprias, sem depender de uma página global longa. Preparação usa etapas curtas; a disposição e paginação exatas da coleção serão experimentadas. Detalhes extensos podem exigir rolagem local, sem deslocar a navegação ou esconder a prévia de preparação.

O saldo de **850 ouro** no esboço humano é um exemplo de apresentação, não saldo fixo nem nova regra econômica. Usar os dados reais do jogador. O esboço é conceitual, não captura ou implementação.

#### Composição obrigatória

- **Preparação:** espada grande e inteira na parte superior, em uma área estável. Escolhas abaixo, em etapas curtas, sem perder a prévia. Ponta, guarda e pomo devem caber no enquadramento.
- **Fabricação:** perspectiva elevada e oblíqua; peça centralizada sobre a bigorna; martelo fora do centro quando em repouso; HUD compacto. A superfície de trabalho domina a tela e permite ler a peça e o ponto de contato.
- **Orientação térmica:** quando o metal estiver frio, comunicar claramente a necessidade de reaquecer antes de um golpe perigoso. O jogador continua responsável por aprender e decidir. Não alterar silenciosamente thresholds, física, custos ou regras de quebra.
- **Revelação:** espada protagonista; atributos e raridade complementam sua apresentação. Preservar forma, marcas e danos reais da fabricação.
- **Coleção:** apresentar a imagem inteira da espada, nome, raridade e atributos reais. Qualidade de fabricação e raridade continuam eixos distintos. Reutilizar os renderizadores e dados existentes; não inventar valores ou um novo nível de arma.

#### Limite de execução e próxima validação

A aprovação desta arquitetura **não autoriza a reconstrução imediata de todas as telas**. O próximo recorte é um **protótipo visual navegável de três experiências**:

1. Preparação da espada com prévia persistente.
2. Fabricação em tela cheia, sem barra inferior.
3. Coleção com imagem, identidade, raridade e atributos.

As cinco seções devem ser reconhecíveis no protótipo, mas Início, Loja e perfil não precisam ser reconstruídos integralmente para validar esse recorte. A atualização humana posterior acrescentou o recorte navegável de Craft. Eventuais acessos demonstrativos devem ser identificados como tal, sem parecer compras ou mudanças de save reais.

Validar essas três experiências na **resolução e área útil reais do Poco**, incluindo densidade e barras do sistema, e obter avaliação humana antes de aplicar o padrão ao restante do jogo. O vídeo recebido é comprimido em 480×1072 e não estabelece sozinho o viewport de implementação. Não assumir as medidas do emulador como medidas do aparelho.

Critérios de validação: arma inteira na prévia; peça e contato legíveis na fabricação; mão em repouso sem oclusão desnecessária; barra ausente durante fabricação; troca de seções previsível; coleção com imagem e dados legíveis; necessidade de reaquecer compreensível. Aparência final, quantidade de itens por página, distribuição exata do HUD e entrada final do Crisol de Fusão permanecem **OPEN** até o recorte pertinente.

#### Relação com o cânone e o estado atual

Esta decisão atualiza o **agrupamento e a apresentação mobile** das funções descritas na [Galeria](canon/galeria.md) e complementa a [tela ideal da forja](specs/ideal-forge-screen.md). Preserva o Arsenal individual, Compêndio, runas, componentes, ferramentas, Legado, encomendas e o [sistema híbrido de fusão](canon/fusao-hibrida.md); reorganizar acessos não elimina esses mecanismos. A compra de itens de fusão na Loja não substitui o Crisol nem a forja manual com núcleo.

**CURRENT:** o APK em `41d7222` ainda usa a preparação extensa, composição R4B e abas da Galeria. Sua instalação e prova funcional não aprovam a nova experiência visual. O enquadramento anterior e os testes do emulador não são evidência de aceitação desta decisão.

**TARGET:** cinco seções com barra fixa, fabricação imersiva e espada protagonista. **OBSERVED:** o protótipo separado tem navegação e capturas físicas no Poco, conforme o [relatório do recorte](../experiments/mobile-ux-v1/README.md). **NOT_PROVEN:** aceitação visual e de uso pelo proprietário, integração final, solução final de câmera e adequação definitiva dos assets. Codex e Antigravity devem consultar este registro antes de reorganizar a interface, preservando código funcional, saves, branches e experimentos durante a validação.

