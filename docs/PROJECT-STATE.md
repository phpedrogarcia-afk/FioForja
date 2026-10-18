# Estado Atual do Projeto — FioForja

**Data da Atualização:** 18 de Outubro de 2026  
**Branch de Trabalho:** `antigravity/arsenal-vivo-integrity`  
**Base Canônica de Continuidade:** `antigravity/arsenal-vivo-hardening` (`f63fad12caaf9a1707ef190fb7c6f43b30044743`)  
**Registro Histórico Antigo:** Arquivado em [`docs/historical/PROJECT-STATE-M00-R1.md`](historical/PROJECT-STATE-M00-R1.md)

---

## 1. FATOS COMPROVADOS (KNOWN & VERIFIED)

### A. Simulação Metalúrgica e Física da Forja (`src/game/sim.ts`)
- **Física Multi-Zonas:** O martelamento é distribuído entre três zonas de impacto reais (`base`, `mid`, `tip`), modificando progressivamente o perfil contínuo [`PhysicalBladeProfile`](../src/game/types.ts) (`baseWidth`, `midWidth`, `tipWidth`, `distalTaper`, `fullerDepth`, `bevelSharpness`).
- **Plasticidade e Termodinâmica:** Deformação efetiva ocorre apenas na janela térmica ideal. Golpes a frio (`heat < 0.35`) causam acúmulo de estresse interno, microtrincas (`cracks`) e eventual fratura frágil irreversível (`broken: true`, `structuralState: "broken"`).
- **Mecânica de Reaquecimento:** O ferreiro pode retornar a lâmina à fornalha quando a temperatura cai, aliviando o estresse estrutural e restaurando a plasticidade de forma segura.
- **Têmpera Realista:** O choque térmico em água ou óleo determina a dureza final e gera empenamento (`warp`) se o alinhamento de resfriamento falhar.
- **Ferramentas Ativas de Oficina:** Martelos (`precision`, `standard`, `sledge`), bigornas, fornalhas e bacias de têmpera equipadas afetam matematicamente a inércia do golpe, a perda de calor e o risco de trinca.
- **Herança de Núcleo de Fusão com Viés Físico (`activeCore` / `CoreHeritageProfile`):** Núcleos gerados no Crisol são transmitidos para a forja através de `createSim({ activeCore })`. Ao concluir a forja em `finishSword()`, a arma herda a raridade base, o bônus de qualidade (`bonusQuality`), perks ancestrais (`inheritedPerks`), o registro histórico de fusão (`fusionHistory`) e tendências físicas de combate (`attackBias`, `defenseBias`, `agilityBias`, `durabilityBias`).

### B. Cena da Forja e Renderização Gráfica (`src/game/ForgeCanvas.tsx`, `src/game/swordDraw.ts`)
- **Duas Mãos de Ferreiro:**
  - A mão esquerda empunha tenazes de forja forjadas em aço maciço com chanfros escuros, rebite de articulação e reflexo quente das brasas.
  - O braço direito executa o movimento contínuo do martelo a partir de um sprite unificado (`hand-strike.png`) com máscara de penas de gradiente suave no ombro.
- **Identidade Visual Autêntica de Componentes:**
  - `dragon_leather`: Couro escamado verde-esmeralda lapidado com reflexos orgânicos.
  - `tsukamaki`: Trançado cruzado de seda carmesim sobre pele de arraia com losangos geométricos.
  - `goldwire`: Bobinas em fio de ouro espiralado brilhante.
  - `bone`: Empunhadura de marfim/osso segmentada com anéis escuros de junção.
  - `darkwood`, `linen`, `braided`, `leather`: Texturas distintivas para cada empunhadura do catálogo.
- **Entalhe Rúnico Físico (Bíblia Estética):** Runas Elder Futhark talhadas em chanfro baixo-relevo no sangradouro (fuller) exibem glifos nórdicos autênticos (`runeSymbol` e `runeKey`). Sem neon flutuante ou runas em tarugos brutos.

### C. Estrutura da Galeria e Armas Individuais (`src/game/screens/GalleryScreen.tsx`, `RevealScreen.tsx`, `FusionStationScreen.tsx`)
- **Seis Pilares da Galeria:** Arsenal, Compêndio, Componentes, Runas, Oficina, Crisol de Fusão e Legado.
- **Oficina Equipável:** O jogador compra e equipa bigornas, fornalhas, bacias de têmpera e martelos, debitados da carteira persistente.
- **Mesa de Inspeção em Veludo e Bancada de Montagem:**
  - Exibe a lâmina terminada sobre veludo azul-púrpura real com iluminação interativa.
  - Lista atributos físicos imutáveis da forja (`baseDamage`, `baseDefense`, `baseAgility`, `baseDurability`), defeitos estruturais e perícias.
  - **Montagem & Desmontagem Reversa com Anti-Stacking:** Instalar qualquer componente (guarda, pomo, empunhadura, runa) desinstala e devolve a peça anterior para o inventário do jogador, recalculando deterministicamente os atributos finais via `recalculateSwordStats()` e eliminando 100% dos acúmulos infinitos.
- **Refino de Bancada Disciplinado:** Afiação e ajuste de empunhadura limitados a 3 níveis (`+8 ATK`, `+2 DUR` por nível). Lâminas quebradas não podem ser aprimoradas. A forja e seus defeitos metalúrgicos permanecem intactos.
- **Crisol de Fusão do Ferreiro (Opção C Canônica):** Fusão de 4 componentes gera componentes mestres; fusão de 4 espadas consome as armas atomicamente e produz um `FusionCore` com perfil genético (`heritage`) para forjar na bigorna. Inclui cálculo reativo e exibição das probabilidades canônicas em tempo real (Mesmo Tier, Salto Superior +1, Salto Excepcional +2) e suporte a Catalisador Astral.

### D. Métricas Técnicas e Verificação
- **TypeScript:** 0 erros (`npm run typecheck` código 0).
- **Testes Automatizados:** 100% aprovados (96/96 testes automatizados, 0 falhas).
- **Simulação Monte Carlo:** 10.000 drops dinâmicos, 5.000 fusões de Crisol alinhadas rigorosamente à tabela canônica.
- **Build de Produção:** Concluído com sucesso em 328ms (`npm run build`).
- **Evidências Visuais Capturadas:**
  - [`arsenal-vivo-01-arsenal-cards.png`](../public/game/evidence/arsenal-vivo-01-arsenal-cards.png): Arsenal com cards de armas, atributos P.ATK/DEF/AGI/DUR e raridades.
  - [`arsenal-vivo-02-crisol-fusao.png`](../public/game/evidence/arsenal-vivo-02-crisol-fusao.png): Crisol de Fusão do Ferreiro com 4 slots povoados, probabilidades canônicas reativas (70% Mesmo Tier / 30% Salto Superior), Catalisador Astral ativo e botão de transmutação habilitado.
  - [`arsenal-vivo-03-loot-drops-rank-s.png`](../public/game/evidence/arsenal-vivo-03-loot-drops-rank-s.png): Tela de celebração com 4 cartas dinâmicas, moedas proporcionais e fanfare de áudio.
  - [`arsenal-vivo-04-workbench-mounting.png`](../public/game/evidence/arsenal-vivo-04-workbench-mounting.png): Mesa de inspeção em veludo com espada Lendária ("LÂMINA DAS ESTRELAS"), refino de bancada, montagem de componente e empunhadura em fio dourado (`goldwire`).
  - [`arsenal-vivo-05-wrap-textures-comparison.png`](../public/game/evidence/arsenal-vivo-05-wrap-textures-comparison.png): Mesa de inspeção com a espada Lendária ("DRACOFORJA IMPLACÁVEL"), exibindo empunhadura em couro de dragão escamado (`dragon_leather`) e runa Elder Futhark cinzelada no sangradouro.

---

## 2. SISTEMAS HARDENED NA MISSÃO ARSENAL VIVO 01.2

| Defeito Diagnosticado (P0/P1) | Causa Raiz | Solução Implementada e Comprovada |
|---|---|---|
| **P0: Acúmulo Infinito de Atributos** | `handleInstallComponent` somava modificadores diretamente aos atributos atuais da arma (`sword.damage += bonus`). | **CORRIGIDO:** Separação das camadas metalúrgicas (`baseDamage`, `baseDefense`, etc.). Atributos calculados deterministicamente via `recalculateSwordStats()`. A substituição de uma peça desinstala e devolve a anterior ao inventário. |
| **P0: Persistência Resiliente e Backups Atômicos** | Falhas de gravação (quota, corrupção de JSON) podiam silenciar erros e corromper o estado do jogo. | **CORRIGIDO:** `writeSave()` agora retorna `SaveResult` estruturado, cria cópia em `a-forja-save-backup` antes da sobrescrita e trata `QuotaExceededError`. `loadSave()` recupera automaticamente a partir do backup íntegro. |
| **P1: Catálogo de Loot Incompleto e Risco de Duplicatas** | Catálogo possuía poucos itens Comuns e o algoritmo de amostragem podia repetir cartas no mesmo drop. | **CORRIGIDO:** Catálogo expandido com mais de 10 itens Comuns autênticos. Algoritmo com seleção e pool garantem 4 itens com chaves de catálogo estritamente distintas em 100% dos drops. |
| **P1: Falta de Identidade Visual para Componentes** | Componentes como `dragon_leather`, `tsukamaki` e `goldwire` usavam preenchimentos genéricos de cor lisa. | **CORRIGIDO:** Renderizador `drawWrapGrip()` em `swordDraw.ts` com texturas procedurais para cada empunhadura (escamas, trançado ito, bobinas de ouro, marfim segmentado) e runas cinzeladas no sangradouro. |
| **P1: Núcleo Sem Herança Física** | O `FusionCore` transmitia apenas bônus aditivo geral, sem refletir a especialização das armas doadoras. | **CORRIGIDO:** `fuseSwords()` calcula `CoreHeritageProfile` (`attackBias`, `defenseBias`, `agilityBias`, `durabilityBias`). Na forja, o núcleo transmite essas tendências de combate sob controle estrito. |
| **P1: Efeitos Colaterais em Setters do React** | `handleStrikeReward` chamava `persist()` dentro do callback de `setWallet`, arriscando race conditions. | **CORRIGIDO:** `applyStrikeRewardTransaction()` extraída como função pura executada fora dos setters, com checagem de idempotência e compactação automática do histórico (máximo 200 IDs) para evitar vazamento de memória. |

---

## 3. INVARIANTES ATIVOS DESTA MISSÃO
1. **The Player Forges the Trophy:** RNG e drops ampliam oportunidades; maestria na bigorna determina o resultado da arma.
2. **Separação entre Qualidade e Raridade:** Uma espada Rank S de Ferro continua sendo Ferro; uma espada Lendária mal forjada reflete suas falhas estruturais.
3. **Fusão Híbrida (Opção C):** Fusão de 4 espadas produz núcleo que exige forjamento manual real na bigorna; nunca uma espada pronta instantânea.
4. **Preservação de Save e Integridade Transacional:** Transações financeiras, de inventário e de galeria são validadas atomicamente com backups atômicos e comportamento fail-closed.
5. **Branch Isolada:** Todo o trabalho desta missão ocorre em `antigravity/arsenal-vivo-integrity`. A branch `main` nunca é modificada diretamente.
