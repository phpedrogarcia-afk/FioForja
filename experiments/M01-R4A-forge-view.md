# M01-R4A — Viabilidade da vista de forja e dos assets

**RESULT: ASSET_BLOCKER. ASSET_STATUS: BLOCKED para a câmera aprovada.** Base `a0a98258c3f3a6d11523117698b8938e3eac876d`, branch `exp/m01-r4a-forge-view`. Auditoria visual dos arquivos de `public/game/` e leitura do renderer; nenhum runtime ou asset foi alterado. A hipótese de que uma composição oblíqua tornaria a bigorna e a peça legíveis **não foi testada**. Bloqueio de arte não é falha experimental da direção de produto.

## Alvo e decisão de parada

O alvo [M01-R3B](../docs/specs/ideal-forge-screen.md) exige visão em primeira pessoa oblíqua de cima, topo da bigorna claramente utilizável, peça central apoiada nele, martelo pesado à direita e fornalha espacialmente conectada. [M01-R3A](../docs/specs/forge-visual-model.md) detalha a continuidade da peça. O candidato M01-R2 já demonstrou enquadramento retrato e menor oclusão, mas a avaliação humana considerou sua câmera ainda lateral. Alterar apenas posição de sprites sobre os assets atuais não produziria a nova propriedade.

## Auditoria dos seis arquivos

Dimensões e canal alfa verificados nos arquivos originais; perspectiva e utilidade são leitura visual. `alpha bbox` é a caixa de pixels com alfa não nulo, não a área opaca exata.

| Asset | Pixels / alfa | Conteúdo e perspectiva aparente | Baked / uso atual | Viabilidade para a vista alvo; risco de transformação |
|---|---|---|---|---|
| [`bg-forge.jpg`](../public/game/bg-forge.jpg) | 1792×1008, RGB sem alfa | Oficina quente, fornalha à esquerda e **bigorna inteira integrada** no centro inferior; bigorna vista mais de frente/lado, topo estreito. | Imagem única de cenário, incluindo bigorna; `ForgeCanvas` a desenha com `drawCover`. | Atmosfera reaproveitável como referência, **não** como plano da nova câmera. Inclinar/esticar o JPG não revela topo oculto; cobrir a bigorna pintada com outro objeto deixa sombras, mesa e perspectiva inconsistentes. |
| [`anvil.png`](../public/game/anvil.png) | 768×768 RGBA, alfa 0–255; bbox `(31,141)–(737,627)` | Bigorna isolada estilizada em três quartos baixos, frente/coluna dominantes e plano superior foreshortened; motivo e fissuras laranja. | Não baked nesse arquivo; carregada por `assets.ts`, **não desenhada** em `ForgeCanvas`. É outra bigorna, distinta da pintada no JPG. | Pode ser objeto decorativo isolado, **não** superfície de trabalho oblíqua dominante. A área superior é estreita para uma lâmina longa; ampliar só amplia a vista baixa. Skew extremo falsificaria profundidade/iluminação. |
| [`hand.png`](../public/game/hand.png) | 768×768 RGBA, alfa 0–255; bbox `(31,81)–(737,686)` | Braço em primeiro plano com grande martelo, visto lateral/diagonal. | Sprite independente, desenhado sobre a lâmina no estado normal. | **Reutilização parcial:** presença e escala podem orientar experimento futuro; sua orientação não prova contato coerente com uma superfície mais vista de cima. Rotações moderadas servem; deformação perspectiva pesada do braço/cabeça não. |
| [`hand-strike.png`](../public/game/hand-strike.png) | 1152×768 RGBA, alfa 0–255; bbox `(28,45)–(1130,731)` | Seis poses de golpe em grade 3×2; braço/martelo em vista lateral/diagonal. | Spritesheet independente no impacto. | **Parcial:** movimento e peso úteis, mas ponto de contato precisa ser conferido contra nova bigorna; não inferir compatibilidade só pela pose isolada. Esticar quadros altera anatomia e martelo. |
| [`fire.png`](../public/game/fire.png) | 768×768 RGBA, alfa 0–255; bbox `(74,15)–(697,747)` | Quatro quadros 2×2 de chama frontal estilizada. | Sobreposto à fornalha do fundo. | Reutilizável como efeito local se a boca do fogo for coerente; não cria perspectiva de oficina. Escala extrema destaca a diferença de estilo. |
| [`sparks.png`](../public/game/sparks.png) | 768×768 RGBA, alfa 0–255; bbox `(16,50)–(752,750)` | Quatro quadros 2×2 de faíscas frontais. | Efeito no golpe, sobre a cena. | Reutilizável como feedback efêmero quando houver ponto de contato real; não resolve superfície/câmera. Ampliar excessivamente encobre a peça. |

**Respostas diretas:** (1) sim, a bigorna hoje visível é parte de `bg-forge.jpg`; (2) `anvil.png` contém uma **segunda** bigorna isolada com transparência, vista baixa em três quartos; (3) não serve como superfície principal independente para a vista alvo; (4) o fundo atual sustenta atmosfera e o fogo, mas não uma composição substancialmente mais voltada ao topo da bigorna; (5) forçar esse alvo com estes rasters exigiria skew/escala/cobertura perceptivelmente falsos. Código: [`assets.ts`](../src/game/assets.ts) carrega a PNG; [`ForgeCanvas.tsx`](../src/game/ForgeCanvas.tsx) usa o JPG e nunca referencia `images.anvil`.

## Por que não há placeholder nem capturas de cinco fases

Um tampo geométrico sobre o JPG continuaria diante da bigorna fotografada e da mesa/sombras em vista baixa. Uma segunda bigorna independente duplicaria o objeto; recortar o JPG para ocultá-lo retiraria a continuidade da fornalha e do espaço. O experimento estaria medindo uma colagem, não se o jogador acredita estar diante de uma bigorna vista de cima. Por isso, o caminho de placeholder foi rejeitado **para esta hipótese**. Nenhum frame HEAT/REST/CHARGE/IMPACT/QUENCH ou métrica de visibilidade foi produzido; não há candidato M01-R4A para validar. Os dados já congelados de [M01-R1](M01-R1-visual-baseline.md) e [M01-R2](M01-R2-forge-composition.md) permanecem baseline/doador e não foram regenerados.

## Arte necessária e próximo teste

O [brief de assets](M01-R4A/ASSET-BRIEF.md) especifica cenário sem bigorna embutida, bigorna independente com plano superior legível, relação de câmera/luz e camadas para apoiar a peça. Após obter **concept/prototype assets**, testar uma única composição em 390×844 e 1366×768 nas cinco fases; então medir presença/oclusão/ponto de impacto e pedir avaliação humana de perspectiva, peso e fantasia. Não gerar arte final nem alterar gameplay como atalho. **RECOMMENDATION: CREATE_NEW_ASSETS.**
