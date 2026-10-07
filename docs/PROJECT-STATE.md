# Estado do projeto — auditoria M00-R1

Snapshot do código de `main` em 2026-10-06, antes desta fundação documental. **HEAD observado:** `2d06a97a9c55e65800927947d186094124936180` (`FioForja: jogo de forja medieval`). No início da auditoria, o único item local era o documento canônico `docs/canon/galeria.md`, ainda não rastreado. Os documentos desta missão também permanecem sem commit. Nenhum código de runtime foi alterado.

## KNOWN

- `src/game/GameApp.tsx` coordena as telas Título, Projeto, Forja, Revelação e Galeria. A simulação atual tem fases calor, martelamento e têmpera (`src/game/types.ts`, `sim.ts`).
- A força é carregada segurando e liberada no momento escolhido; a janela ideal se move. O aço altera janela térmica e largura do ponto ideal (`sim.ts`, `catalog.ts`).
- `FinishedSword` guarda projeto, nota, avaliações agregadas, empenamento, ID e data. Não guarda o histórico de cada golpe (`types.ts`, `GameApp.tsx`).
- O desenho da forja usa quadro lógico de 1280×720 e Canvas 2D (`ForgeCanvas.tsx`). A renderização aplica escala `cover` com o maior fator horizontal/vertical, o que corta as laterais em uma viewport vertical. A intensidade do recorte em cada aparelho não foi medida.
- A Galeria implementada é uma grade de miniaturas e rótulos de nome/nota; o save conserva no máximo 24 espadas no `localStorage` (`GalleryScreen.tsx`, `save.ts`). A estrutura de seis áreas da especificação ainda não está implementada.
- Há infraestrutura de autenticação, banco, app-data e preview fora de `src/game`. A entrada do jogo é `src/routes/index.tsx`; infraestrutura do repositório não comprova funcionalidade de gameplay.
- Não existem testes em `src/game`. Os testes encontrados estão em `scripts/`, `src/lib/auth/` e `src/lib/app-data/`; não foi encontrado relatório de cobertura do núcleo do jogo.

## OBSERVATIONS

| Observação candidata | Resultado da conferência |
|---|---|
| Composição 1280×720 | **Confirmada** por `VW`/`VH` e desenho em `ForgeCanvas.tsx`. O modo `cover` confirma recorte lateral em telas portrait; severidade prática é desconhecida. |
| Mão/martelo podem ocultar a espada | **Sobreposição confirmada:** a espada é desenhada antes da mão e do sprite de golpe. O sprite contém braço e martelo grandes. “Oculta demais” é julgamento visual ainda não medido em render da tela. |
| Execução ruim e excelente parecem pouco diferentes | **Não conclusiva:** `shape` modifica comprimento e largura/perfil da lâmina; `quality` altera também a luminosidade do metal. Não há comparação visual controlada que prove se a diferença percebida cumpre a direção estética. |
| README anuncia `R` para reaquecer | **Refutada pelo código atual:** `GameApp.tsx` trata `Space` e `Enter`, mas não `R`; o reaquecimento está ligado a botão do HUD. |
| Gatilhos de reaquecimento divergem | **Confirmada:** `sim.ts` aceita pedido abaixo de `0.55`; `ForgeHud.tsx` só exibe o botão abaixo de `0.4`. |
| Testes cobrem mais infraestrutura periférica que simulação | **Parcialmente confirmada:** arquivos de teste existem para scripts/auth/app-data e nenhum para `src/game`. Não há contagem de cobertura para quantificar “mais”. |
| Há infraestrutura de template fora do jogo | **Confirmada:** autenticação, banco, conectores e preview aparecem em `src/lib` e nas dependências. A necessidade futura de cada parte não foi auditada nesta missão. |
| Nota e acabamento seguem os mesmos limiares da Bíblia Estética | **Divergência confirmada:** `catalog.ts` usa cinco rótulos, com Obra-prima a partir de 92; a Bíblia define seis faixas visuais e Obra-prima a partir de 95. Não houve harmonização. |

## HYPOTHESES

- O recorte lateral ou a sobreposição da mão prejudicam a legibilidade da arma em celulares.
- A diferença visual atual entre resultados de baixa e alta qualidade ainda é insuficiente para a promessa estética.
- O limite de 24 armas pode apagar peças importantes para a história do jogador.

São hipóteses de experiência; o código sozinho não responde a elas.

## UNKNOWNS

- Leitura real da cena e da espada em uma matriz de telas e proporções.
- Percepção do jogador sobre a diferença entre resultados de execução e o valor dos feedbacks de áudio/efeitos.
- Baseline de desempenho, qualidade percebida e distribuição de resultados da simulação.
- Fórmula de raridade, gates de domínio, regras de desbloqueio e histórico persistido por arma.
- Cobertura e eficácia dos testes existentes sobre comportamentos de gameplay.

## DECISIONS

As decisões de produto estão em [DECISIONS.md](DECISIONS.md); os princípios invioláveis estão em [INVARIANTS.md](INVARIANTS.md). As fontes visuais são [Bíblia Estética](canon/estetica.md) e [Galeria](canon/galeria.md). Código observado não foi promovido a decisão de produto.

## FAILED / NOT_PROVEN

- Não foi executada comparação visual de espadas de baixa e alta qualidade.
- Não foi validada a cena em dispositivos móveis reais nem medido o quanto a mão tapa a lâmina.
- Não há evidência de testes de gameplay ou baseline quantitativo do core loop.
- `R` não funciona como atalho de reaquecimento no código auditado, embora o README o anuncie.

## NEXT_DECISION

Escolher um experimento de baseline que compare resultados visuais de execução em telas landscape e portrait antes de decidir alterações de câmera ou desenho. Esta missão não inicia esse trabalho.
