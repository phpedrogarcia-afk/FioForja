# Registro de decisões — FioForja

Este registro separa decisões de produto aprovadas de hipóteses e comportamentos técnicos em avaliação.

---

## 1. Decisões de Produto Aprovadas

- **A forja manual baseada em habilidade permanece no centro:** Maior complexidade deve recompensar domínio. O princípio inviolável é: **THE WEAPON IS THE HERO. THE PLAYER FORGES THE TROPHY.**
- **Qualidade alta produz uma arma visivelmente mais bela:** Qualidade numérica e raridade são eixos distintos. Uma espada bem executada não se torna automaticamente Lendária, e uma Lendária mal forjada exibe defeitos metalúrgicos reais.
- **Raridade é conquistada:** RNG não compensa falta de habilidade; Lendárias são difíceis e prestigiosas; Relíquias são excepcionais e ligadas a condições especiais ou descobertas.
- **Conteúdo raro é conhecido e perseguível:** O jogador deve entender o que existe para ser forjado, as metas a alcançar e ter maestria sinalizada por feedback visual, sonoro e mecânico.
- **Famílias com identidade visual pela silhueta:** Raridade não é moldura, cor arbitrária ou efeito neon; procedural requer curadoria estética física (Bíblia Estética).
- **Galeria como sistema de museu vivo:** Cada espada individual conserva sua identidade e histórico de forja. Os seis pilares canônicos são: Arsenal, Compêndio, Componentes, Runas, Oficina e Legado ([canon/galeria.md](canon/galeria.md)).
- **Direção estética física e acabamento:** Toda a direção de materiais, proporções, incisão rúnica chanfrada e acabamento de metal está descrita em [canon/estetica.md](canon/estetica.md).

---

## 2. Decisões Aprovadas — Operação Arsenal Vivo

### FIOFORJA-FUSION-001: Sistema Híbrido de Fusão (Opção C)
- **Status:** **APROVADA E CANÔNICA.** Não sujeita a substituição silenciosa.
- **Fusão de Componentes:** Quatro componentes do mesmo tipo (4 cabos, 4 guardas, 4 pomos ou 4 runas) produzem um componente novo, refinado ou de raridade superior pronto para uso.
- **Fusão de Espadas:** Quatro espadas concluídas e elegíveis do Arsenal são consumidas transacionalmente para produzir **uma oportunidade de fabricação superior** (um Núcleo de Fusão, Pré-forma Ancestral ou Projeto Especial).
- **Invariante da Forja:** A fusão de espadas **NUNCA** entrega uma espada Lendária pronta de forma instantânea. O jogador **DEVE** levar o núcleo resultante para a bigorna e executar a forja manual. A nota final, integridade e atributos continuam dependendo da execução do ferreiro.
- **Proteção contra Frustração:** Falhas em subir de tier concedem materiais de reaproveitamento e fragmentos de fusão acumuláveis (`fusion_fragment`), garantindo que tentativas repetidas construam progresso real.
- **Herança de Atributos:** Armas doadoras influenciam as tendências de perfil do núcleo (e.g. foco ofensivo eleva potencial de P.ATK), sem soma direta e sem progressão infinita descontrolada.
- **Segurança Transacional:** A fusão consome os 4 itens atomicamente; itens equipados ou bloqueados não podem ser fundidos; duplo clique ou recarga de página não duplicam itens nem reexecutam o sorteio.

### FIOFORJA-WEAPON-INDIVIDUALITY-001: Separação de Projeto, Atributos Físicos e Assinatura
- **Conceitos Distintos:**
  - **PROJETO:** O modelo planejado (família, perfil de lâmina, aço base, componentes).
  - **QUALIDADE:** A nota obtida na forja (0 a 100), refletida visualmente no acabamento, alinhamento e marcas físicas.
  - **RARIDADE:** O patamar de prestígio (Comum, Incomum, Rara, Épica, Lendária, Relíquia).
  - **ATRIBUTOS:** Estatísticas de combate (`P.ATK`, `DEF`, `AGI`, `DUR`) derivadas da massa, geometria, dureza do aço, têmpera e defeitos.
  - **ASSINATURA E PERKS:** Traços e afixos singulares concedidos por maestria ou materiais extraordinários.
  - **HISTÓRICO:** Registro dos eventos de forja, golpes desferidos e fusão geradora.
- Duas armas do mesmo projeto podem e devem diferir entre si com base no desempenho do artesão.

### FIOFORJA-ECONOMY-001: Economia em Tempo Real por Golpes e Rebalanceamento
- **Ganhos Durante a Forja:** Golpes executados na bigorna concedem ouro em tempo real (+3, +8, +12).
- **Integridade da Recompensa:** Cada golpe possui identificador de evento único por rodada de forja (`${forgeRunId}:${strikeIndex}`), com transação pura fora dos callbacks de render (`applyStrikeRewardTransaction`) e histórico compactado para impedir estouro de memória.

### FIOFORJA-LOOT-001: Motor Real de Drops Dinâmicos
- As 4 cartas de recompensa são sorteadas por tabelas ponderadas de raridade e pool sem repetição de chave (`catalogKey`), garantindo 4 itens sempre distintos.
- Catálogo expandido com itens autênticos desde a categoria Comum até Relíquia.

### FIOFORJA-INTEGRITY-001: Decomposição de Atributos, Anti-Stacking e Backups Atômicos
- **Anti-Stacking:** Atributos intrínsecos (`baseDamage`, `baseDefense`, `baseAgility`, `baseDurability`) são imutáveis após a têmpera. Montagem de componentes aloca exclusivamente 1 slot por categoria (guarda, pomo, empunhadura, runa), recalculando deterministicamente via `recalculateSwordStats()` e devolvendo peças anteriores ao inventário.
- **Backups Atômicos:** `writeSave()` cria e atualiza um snapshot íntegro em `a-forja-save-backup` antes da sobrescrita e retorna `SaveResult`. `loadSave()` detecta corrupção no save primário e recupera o estado de backup automaticamente.
- **Fail-Closed:** Se a persistência local falhar (e.g. quota excedida), o estado da UI não avança para dados não-persistidos.

---

## 3. Decisões Aprovadas — Operação 02: A Forja do Prestígio

### FIOFORJA-TRANSACTIONS-001: Arquitetura Pura de Transações Fail-Closed
- **Status:** **APROVADA E CANÔNICA.**
- **Isolamento de Mutação:** Todas as 9 operações de modificação de estado do jogo (fusão de espadas, fusão de componentes, montagem de peças, refino, compras de ferramentas e artigos no bazar, claim de recompensas, acabamento de forja e recompensas por golpe) são executadas por funções puras em `src/game/transactions.ts`.
- **Invariante de Persistência:** A memória e a interface só são atualizadas após confirmação de gravação física em `writeSave(nextSave).ok === true`.
- **Comportamento em Falha de Armazenamento:** Em caso de `QuotaExceededError` ou erro de disco, a transação aborta sem perda de dados, o backup permanece preservado e o usuário recebe feedback visual via toast contextual.

### FIOFORJA-ROLES-001: Especialização Tática e Funções de Combate (CombatRole)
- **Status:** **APROVADA E CANÔNICA.**
- Cada espada recebe uma das 5 funções de combate (`Ofensiva`, `Defensiva`, `Ágil`, `Equilibrada`, `Excepcional`) com base em sua silhueta, aço, proporção geométrica e linhagem.
- As funções de combate aplicam multiplicadores físicos calculados deterministicamente em `calculateSwordAttributes` sem apagar os atributos metalúrgicos intrínsecos.

### FIOFORJA-PRESTIGE-001: 5 Lâminas de Referência e Bazar da Ferraria
- **Status:** **APROVADA E CANÔNICA.**
- **Armas Canônicas:** `guarda_medieval`, `cimitarra_damasco`, `lua_silenciosa`, `folha_aereth` e `queda_asterion` servem como padrões de teste de fidelidade estética, sem neon nas cruzetas e com incisões rúnicas autênticas.
- **Bazar Medieval:** O jogador adquire ativamente ferramentas, lingotes, peças e runas Futhark no mercado da ferraria, expandindo as opções de forja além do RNG de drops.
- **Comparador Tático:** Comparação lado a lado com deltas matemáticos em modal dedicado na Galeria.

---

## 4. Hipóteses em Avaliação Técnica (Provisórias)
- **Fórmulas exatas de herança de afixos na fusão:** Percentual de transferência entre 15% e 35% por traço compartilhado.
- **Preços dinâmicos na loja da oficina:** Custos de materiais raros atrelados a conquistas do Legado.
- **Taxa de drop de Relíquias:** Fixada provisoriamente em 0.2% a 0.5% em forjas Rank S com aço especial.

