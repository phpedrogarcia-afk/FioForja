# Estado do projeto — auditoria M00-R1 (Histórico Arquivado)

Snapshot do código de `main` em 2026-10-06, antes da fundação documental e das grandes etapas de engenharia da forja.
**HEAD histórico:** `2d06a97a9c55e65800927947d186094124936180` (`FioForja: jogo de forja medieval`).

---

## KNOWN (Auditoria de 2026-10-06)

- `src/game/GameApp.tsx` coordenava as telas Título, Projeto, Forja, Revelação e Galeria. A simulação inicial tinha fases calor, martelamento e têmpera (`src/game/types.ts`, `sim.ts`).
- A força era carregada segurando e liberada no momento escolhido; a janela ideal se movia. O aço alterava janela térmica e largura do ponto ideal (`sim.ts`, `catalog.ts`).
- `FinishedSword` guardava projeto, nota, avaliações agregadas, empenamento, ID e data. Não guardava o histórico de cada golpe (`types.ts`, `GameApp.tsx`).
- O desenho da forja usava quadro lógico de 1280×720 e Canvas 2D (`ForgeCanvas.tsx`). A renderização aplicava escala `cover` com o maior fator horizontal/vertical, o que cortava as laterais em uma viewport vertical.
- A Galeria implementada era apenas uma grade de miniaturas e rótulos de nome/nota; o save conservava no máximo 24 espadas no `localStorage` (`GalleryScreen.tsx`, `save.ts`). As seis áreas da especificação canônica não estavam implementadas.
- Não existiam testes em `src/game`. Os testes encontrados estavam apenas em `scripts/`, `src/lib/auth/` e `src/lib/app-data/`.

---

## OBSERVATIONS (Auditoria de 2026-10-06)

| Observação candidata | Resultado da conferência |
|---|---|
| Composição 1280×720 | Confirmada por `VW`/`VH` e desenho em `ForgeCanvas.tsx`. O modo `cover` confirmava recorte lateral em telas portrait. |
| Mão/martelo podem ocultar a espada | Sobreposição confirmada no sprite inicial. |
| Execução ruim e excelente pareciam pouco diferentes | Não conclusiva na época; faltava comparação visual controlada. |
| README anunciava `R` para reaquecer | Refutada pelo código da época: `GameApp.tsx` tratava `Space` e `Enter`, mas não `R`. |
| Gatilhos de reaquecimento divergiam | Confirmada na época: `sim.ts` aceitava pedido abaixo de `0.55`; `ForgeHud.tsx` só exibia abaixo de `0.4`. |
| Nota e acabamento divergiam da Bíblia Estética | Divergência confirmada na época: `catalog.ts` usava cinco rótulos; a Bíblia definia seis faixas visuais e Obra-prima a partir de 95. |

---

*Nota: Este documento foi arquivado durante a Operação Arsenal Vivo para preservar o registro histórico da auditoria original de 06/10/2026. O estado atual ativo e comprovado do projeto encontra-se em `docs/PROJECT-STATE.md`.*
