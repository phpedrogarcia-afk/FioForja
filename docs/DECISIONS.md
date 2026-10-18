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
- **Ganhos Durante a Forja:** Golpes executados na bigorna concedem ouro em tempo real:
  - Golpe fraco / desalinhado: 0 ouro.
  - Golpe bom: +3 ouro.
  - Golpe perfeito (janela térmica e força ideal): +8 ouro.
  - Golpe magistral (sob dificuldade elevada / zona crítica): +12 ouro.
- **Integridade da Recompensa:** Cada golpe possui identificador de evento único por rodada de forja (`strikeIndex`), impedindo ouro duplicado por re-render ou retenção contínua de botão.
- **Rebalanceamento dos Prêmios Finais:** Valores astronômicos anteriores (e.g. 4.850 ouro por forja) são ajustados para escalas sustentáveis (Rank S: 450–650 ouro, Rank A: 280–380 ouro, Rank B: 150–220 ouro, Rank C: 50–90 ouro), em harmonia com os custos de ferramentas, materiais e taxas da oficina.

### FIOFORJA-LOOT-001: Motor Real de Drops Dinâmicos
- As 4 cartas estáticas de recompensa são substituídas por um motor de drops dinâmico baseado em tabelas de pesos por categoria (Materiais, Componentes, Runas, Fragmentos, Núcleos de Fusão).
- As chances de raridade respeitam a performance (Rank S, A, B, C); lâminas quebradas (`broken: true`) rendem apenas sucata e ferro bruto, impossibilitando estratégias exploratórias de quebra intencional.
- Sorteios possuem suporte a semente determinística para testes e validação reproduzível, persistindo o ID de coleta da sessão para barrar recolhe duplicado após reload.

### FIOFORJA-SAVE-001: Persistência v5 e Armazenamento do Arsenal
- Save migrado para a versão 5 (`VERSION = 5`).
- Identificadores de armas migrados para geração universal resistente a colisões (`crypto.randomUUID()` ou gerador não-colidente `sword_${timestamp}_${nanoId}`).
- Capacidade do Arsenal expandida para além de 48 slots sem descarte silencioso de armas forjadas (remoção de truncamento em 120 e garantia de preservação íntegra de toda a coleção do jogador).

### FIOFORJA-HARDENING-001: Integridade Transacional, Pedigree de Fusão e Bancada de Montagem
- **Recompensas Imutáveis na Forja:** As recompensas da celebração são geradas deterministicamente uma única vez dentro de `finishSword()`, atreladas a `sword.pendingRewards` e validadas por `SaveData.claimedForgeRewardIds`. Reroll exploit via reload ou reabertura de modal eliminado.
- **Herança Ativa do FusionCore:** O núcleo de fusão selecionado no inventário é transmitido ativamente para a simulação na bigorna (`activeCore` em `createSim()`), aplicando piso de raridade, bônus aditivo de qualidade (`bonusQuality`), herança de perks ancestrais (`inheritedPerks`) e linhagem histórica (`FusionHistory`), sendo consumido atomicamente na conclusão.
- **Transações Atômicas de Fusão:** Implementadas `validateComponentFusionTransaction` e `validateSwordFusionTransaction`, exigindo 4 itens únicos, mesma categoria, integridade física (recusa estrita de lâminas quebradas) e saldo suficiente de catalisadores e moedas antes de qualquer alteração de estado.
- **Salto Excepcional de 2 Tiers:** Implementados 3 patamares canônicos de fusão (Refinado, Superior +1 e Excepcional +2, e.g. 4 Raras -> Lendária) com probabilidades alinhadas a `docs/canon/fusao-hibrida.md` e exibição reativa em tempo real na interface do Crisol.
- **Deduplicação de Ouro por Golpe:** Identificadores únicos com escopo da rodada `${forgeRunId}:${strikeIndex}` e persistência em `claimedStrikeRewardIds`.
- **Bancada de Montagem e Personalização:** Integração direta na tela de inspeção em veludo (`RevealScreen.tsx`), permitindo instalar componentes e runas avulsas com atualização em tempo real da geometria renderizada no canvas e recálculo dos atributos de combate.

---

## 3. Hipóteses em Avaliação Técnica (Provisórias)

- **Fórmulas exatas de herança de afixos na fusão:** Percentual de transferência entre 15% e 35% por traço compartilhado.
- **Preços dinâmicos na loja da oficina:** Custos de materiais raros atrelados a conquistas do Legado.
- **Taxa de drop de Relíquias:** Fixada provisoriamente em 0.2% a 0.5% em forjas Rank S com aço especial.
