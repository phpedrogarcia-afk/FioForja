# Wins: Arsenal Vivo 01.2 — Item Integrity & Architectural Consolidation

## 1. Decomposição de Atributos & Desinstalação Reversa
- Substituir componentes em qualquer slot (guarda, pomo, empunhadura, runa) desinstala a peça antiga e devolve-a ao inventário do jogador (`nextInventory.components.push(previousComp)`).
- `recalculateSwordStats()` recalcula os atributos a partir de valores base imutáveis da forja (`baseDamage`, `baseDefense`, etc.), garantindo 100% de consistência matemática e impedindo cheats por repetição de interface.

## 2. Persistência Resiliente com Backups Atômicos e Fail-Closed
- `writeSave()` retorna `SaveResult` estruturado (`ok: boolean`, `code?: SaveErrorCode`, `error?: string`).
- Protege o save primário gravando cópia em `a-forja-save-backup` antes da sobrescrita.
- Detecta e trata amigavelmente `QuotaExceededError`.
- `loadSave()` detecta corrupção no save primário e recupera automaticamente o snapshot íntegro do backup.
- Operações de UI falham no modo fechado (fail-closed) sem avançar estado em memória caso a persistência falhe.

## 3. Catálogo de Loot Expandido e Garantia de Zero Duplicatas
- Adicionados mais de 10 itens autênticos da categoria "Comum" (carvão betuminoso, tiras de couro curtido, pedra de afiar de água, pó de fluxo boráx, guarda anelar, pomo disco, etc.).
- Algoritmo de amostragem por pool estritamente deduped garante 4 cartas distintas com chaves de catálogo únicas em 100% dos drops.

## 4. Identidade Visual Real para Componentes
- Texturas e renderizações específicas implementadas em `swordDraw.ts`:
  - `dragon_leather`: Couro escamado verde-esmeralda com padrão de escamas lapidadas e realces de luz.
  - `tsukamaki`: Trançado cruzado de seda sobre pele de arraia com losangos geométricos tradicionais.
  - `goldwire`: Bobinas espirais em ouro nobre com reflexo metálico brilhante.
  - `bone`: Empunhadura de marfim/osso segmentada com anéis escuros de junção.
  - Runas cinzeladas no sangradouro (fuller) exibem seus glifos nórdicos autênticos (`runeSymbol` e `runeKey`).

## 5. Herança Genética e Divergência Funcional de Núcleos
- O Crisol de Fusão analisa as 4 espadas doadoras e extrai um `CoreHeritageProfile`:
  - `attackBias`: Tendência ofensiva proporcional ao desvio do dano dos doadores.
  - `defenseBias`: Tendência defensiva proporcional à armadura das peças doadas.
  - `agilityBias`: Tendência de velocidade e flexibilidade.
  - `durabilityBias`: Tendência de têmpera e tenacidade.
  - `runicAffinity`: Herança de afinidade e escolas mágicas.
- Na forja da bigorna, o núcleo transmite esses potenciais de forma calibrada, preservando a regra de ouro: "The Weapon is the Hero. The Player Forges the Trophy."
