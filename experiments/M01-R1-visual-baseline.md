# M01-R1 — baseline visual e estrutural

Data: 2026-10-07. Base: `e588242c30c325ac823579079628e1d0cd2231be`; branch: `exp/m01-r1-visual-baseline`. **RESULT: PASS** para a coleta do baseline; isso não significa que o produto satisfaça a direção estética. Nenhuma mudança de comportamento de produção. H1 = **SUPPORTED**, com contraevidência delimitada; H2 = **SUPPORTED**; expressão de qualidade = **WEAK**.

## Método e reprodução

[capture.mjs](M01-R1/capture.mjs) abre a aplicação existente em `http://127.0.0.1:8080/`, usa os botões reais e o teclado, e importa o renderer original pelo Vite. Não há rota nova nem patch em `src/game`. Cada viewport usa um contexto isolado, `DEFAULT_DESIGN`, DPR 1 e animação normal. Ambiente registrado: Windows, Node 24.20.0, Edge headless 156.0.4314.8, Playwright instalado pelo lockfile. Cinzel disponível no navegador. Dependências e fontes continuam sendo dependências externas da reprodução.

Reproduzir na raiz do checkout, com as dependências do lockfile instaladas:

```powershell
node scripts/with-app-env.mjs node node_modules/vite/bin/vite.js dev --host 0.0.0.0 --port 8080
# Em outro terminal, mantendo o servidor acima aberto:
node experiments/M01-R1/capture.mjs
```

O primeiro comando preserva o wrapper de ambiente de `npm run dev`; a invocação direta de `vite` pelo wrapper falhou com `spawn vite ENOENT` no Windows. Não foi corrigida nesta missão. `npm ci` instalou dependências ignoradas pelo Git, sem alterar o lockfile. O gerador de rotas trocou apenas CRLF por LF em `src/routeTree.gen.ts`; depois de fechar o servidor, os finais de linha originais do checkout foram restaurados. Diff final de runtime vazio.

O harness controla o relógio do navegador e usa PRNG com seed 101 apenas no contexto experimental. Aguarda a hidratação React antes de acionar controles. Aquece por 3400 ms, retira, aplica três cargas de 570 ms com 600 ms de repouso, captura repouso e quarta carga, captura 128 ms após liberar o quarto golpe e conclui oito golpes para observar a têmpera com 650 ms de mergulho. O registro guarda HUD, transformação da câmera, comando real de desenho do sprite, métricas e hashes dos arquivos usados. O relógio controla a simulação; 25 ms reais permitem o commit assíncrono da UI antes de cada coleta. A instrumentação de Canvas apenas registra argumentos e encaminha as chamadas originais.

Cinco capturas por viewport estão reunidas em quatro WebP, preservando o tamanho original de cada tile. Ordem: calor, repouso, carga, impacto, têmpera. Não há promessa de hashes de imagem idênticos em outras versões de navegador, fonte ou encoder. A sequência, os parâmetros e a matemática são reproduzíveis. Dados completos: [measurements.json](M01-R1/evidence/measurements.json).

## H1 — enquadramento e composição

**FACT.** [ForgeCanvas.tsx](../src/game/ForgeCanvas.tsx), linhas 9–10 e 150–165, usa quadro lógico 1280×720 e escala `cover`. Para canvas CSS `w × h`:

```text
s = max(w / 1280, h / 720)
ox = (w - 1280*s) / 2; oy = (h - 720*s) / 2
visibleW = w/s; visibleH = h/s
cropX = 1280-visibleW; cropY = 720-visibleH
sceneFraction = visibleW*visibleH / (1280*720)
```

Os recortes abaixo são totais em unidades lógicas, divididos igualmente entre os dois lados do eixo. Shake desloca temporariamente a janela; os dados de cada frame incluem esse deslocamento. A tabela apresenta a composição sem shake, não pixels físicos nem área de HUD.

| Viewport CSS | Escala | Largura lógica visível | Altura lógica visível | Recorte horizontal | Recorte vertical | Quadro visível |
|---|---:|---:|---:|---:|---:|---:|
| 390×844 | 1.172222 | 332.701 | 720.000 | 947.299 | 0.000 | 25.9923% |
| 412×915 | 1.270833 | 324.197 | 720.000 | 955.803 | 0.000 | 25.3279% |
| 844×390 | 0.659375 | 1280.000 | 591.469 | 0.000 | 128.531 | 82.1485% |
| 1366×768 | 1.067188 | 1280.000 | 719.649 | 0.000 | 0.351 | 99.9512% |

Evidência: [390×844](M01-R1/evidence/viewport-390x844.webp), [412×915](M01-R1/evidence/viewport-412x915.webp), [844×390](M01-R1/evidence/viewport-844x390.webp), [1366×768](M01-R1/evidence/viewport-1366x768.webp).

**FACT.** A lâmina no calor é desenhada em `(256,374.4)`, `shape=.12`, ângulo `-.4`; na bigorna, em `(512,471.6)`, ângulo `-.08`, com `sim.shape` (linhas 211–242). O ponto emissor de faíscas é `(512,475.2)`. A mão é desenhada depois da lâmina: sprite de 430 unidades e rotação `-.1-force*.42`, ou spritesheet de golpe de 450×297 unidades (linhas 270–317). A bigorna observada faz parte da imagem de fundo; `images.anvil` é carregada, mas não é usada pelo paint.

**OBSERVATION.** No calor, o mask da lâmina ocupa aproximadamente `x=258..359`, `y=320..383`. Portrait mostra apenas `x=473.649..806.351` ou `477.902..802.098`: 0% da lâmina dentro do canvas; a fornalha e o metal aquecido desaparecem. Landscape conserva 100% desse mask. Isso corresponde às quatro capturas de calor.

**OBSERVATION.** Na sequência coletada, as formas de repouso/carga (`shape=.48`), impacto (`.5185`) e têmpera (`.662`) permanecem 100% dentro dos quatro canvases. A bigorna continua reconhecível como superfície central em portrait, embora cenário lateral, fornalha e partes dos sprites sejam cortados. O alvo emissor permanece dentro das quatro janelas: sem shake, `(44.956,557.040)`, `(43.333,603.900)`, `(337.600,270.960)` e `(546.400,506.940)` em coordenadas CSS, respectivamente. Em portrait ele fica próximo da margem esquerda, não fora dela. Nas capturas de impacto, as faíscas aparecem à esquerda da base da lâmina. Não existe marcador espacial permanente de alvo; a ação atual mede timing/força, não precisão de posição do clique.

**OBSERVATION.** Sobreposição é a interseção entre o mask da lâmina produzido pelo renderer atual e o mask do comando real de desenho de mão/martelo, em resolução de captura. Um pixel conta como ocupado se alpha ≥128; porcentagem relativa aos pixels visíveis da lâmina. Mede cobertura potencial pelo sprite opaco, não compreensão humana, e exclui HUD/faíscas/vinheta. Os estados vêm do HUD bruto, sincronizado após a liberação do golpe.

| Viewport | Lâmina no calor dentro do canvas | Lâmina nas outras quatro fases dentro do canvas | Mão/martelo no repouso | Na carga | No impacto coletado |
|---|---:|---:|---:|---:|---:|
| 390×844 | 0% | 100% | 77.84% | 9.39% | 0% |
| 412×915 | 0% | 100% | 77.49% | 9.39% | 0% |
| 844×390 | 100% | 100% | 78.34% | 9.10% | 0% |
| 1366×768 | 100% | 100% | 77.59% | 9.30% | 0% |

**OBSERVATION.** Em repouso, antebraço e punho cobrem a maior parte do meio da lâmina, deixando trechos e ponta expostos. Ao carregar, a rotação desloca o braço e expõe a maior parte dela. No frame de impacto escolhido, o spritesheet não cobre o mask da lâmina. Isso não prova ausência de cobertura em todos os seis frames de golpe. Na têmpera não há desenho de mão. O HUD fica acima/abaixo da lâmina nos frames coletados; em 844×390 a barra inferior cobre parte da base da bigorna/braço e o bloco superior cobre parte alta da fornalha. Não foi demonstrada cobertura direta da lâmina pelo HUD. Desktop mantém mais cenário e distância entre esses blocos e a região de trabalho.

**INTERPRETATION / H1_RESULT: SUPPORTED.** A composição não conserva informação equivalente entre as classes: portrait perde a lâmina durante o aquecimento, e o repouso oculta cerca de três quartos da peça em todas as classes. A contraevidência enfraquece a generalização de que portrait sempre corta a região de martelamento, ou de que o martelo sempre impede vê-la: as quatro fases posteriores conservam a peça testada no canvas; carga e impacto mostram bem mais pixels. A cobertura no repouso não é um problema exclusivo de celular. Compreensão e conforto do jogador permanecem UNKNOWN.

## H2 — qualidade no renderer final

Um único projeto: perfil `long`, aço `damascus`, cabo `leather`, guarda `cross`, pomo `disc`, comprimento `1`, inscrição `FORJA`, runas `true`. Nome `Lâmina sem nome`. Quatro valores: 20, 50, 75, 95. Canvas transparente 512×480; origem `(256,340)`, comprimento de desenho 304, ângulo padrão `-π/2.15`, `heat=0`, `shape=1`, `assembled=true`. Só `quality` varia. A prancha acrescenta o mesmo fundo `#1e1610` a todos os painéis. São invocações diretas do código existente, não screenshots de uma rota artificial.

Imagens individuais: [20](M01-R1/evidence/quality-20.png), [50](M01-R1/evidence/quality-50.png), [75](M01-R1/evidence/quality-75.png), [95](M01-R1/evidence/quality-95.png). [Comparação sem rótulos](M01-R1/evidence/quality-comparison.png), da esquerda para a direita: 20 / 50 / 75 / 95.

**FACT.** [swordDraw.ts](../src/game/swordDraw.ts), linhas 17–40, encaminha `opts.quality` (default 72) para `drawSwordBody` e `steelFill` (default local 70). `steelFill` calcula `clamp(st.light*(1-heat*.35)+heat*28+(quality-60)*.08,12,78)`. Hue e saturação vêm do aço escolhido. `shade` multiplica a luminosidade para os stops do gradiente (1.25, .55, .9) e linhas de Damasco (1.35), com clamp 6..90. Nenhuma dessas cores muda a geometria.

**FACT.** A única decisão discreta baseada em qualidade é a cor da inscrição: `quality >= 80` usa `rgba(176,137,58,.85)`; abaixo, `rgba(30,22,16,.7)`. Ela só aparece se há texto, `shape > .72` e `heat < .35` (linhas 146–156). Conteúdo, conversão para runas, fonte, tamanho, posição e alinhamento são iguais. Não há ramo de qualidade para guarda/cabo/pomo, empenamento, defeitos, gume, polimento ou riqueza do padrão.

| Quality | Luminosidade HSL base do Damasco frio | Pixels RGBA diferentes de q20 | Pixels diferentes no mask de silhueta |
|---|---:|---:|---:|
| 20 | 34.8% | 0 | 0 |
| 50 | 37.2% | 5811 | 0 |
| 75 | 39.2% | 5815 | 0 |
| 95 | 40.8% | 5816 | 0 |

**OBSERVATION.** Os quatro traces de operações de desenho têm o mesmo hash SHA-256 `1439103ea7b9d0d5ddbf4b2022bc7ef6aefb679f3421b93e7eed392a60746828`. O trace inclui caminhos, transforms, textos e coordenadas, mas exclui atribuições de estilo. Os masks alpha≥128 são idênticos. Pixels RGBA mudam por cor/luminosidade; sua contagem não mede intensidade perceptiva. A inspeção das imagens mostra o mesmo perfil, ponta, guarda, cabo, pomo, ondas e texto; q95 usa runas douradas. A diferença base q20→q95 é de 6 pontos de luminosidade HSL, não uma medida de percepção.

| Mecanismo visual condicionado a quality | Implementação atual |
|---|---|
| Silhueta/geometria/alinhamento/simetria | Nenhum |
| Defeitos de execução, queimaduras persistentes, marcas de martelo | Nenhum |
| Tratamento de superfície/polimento estrutural | Nenhum; gradiente de cor fixo |
| Padrão de material | Mesma geometria; cor das ondas depende da cor base |
| Luz/cor | Ajuste contínuo de luminosidade do metal |
| Detalhes | Cor da inscrição muda em 80; desenho do detalhe permanece igual |

### Shape é um parâmetro diferente

Em `drawSwordBody` (linhas 55–80), `L` depende de comprimento/perfil do projeto; `W=(18+profile.width*16)*(.55+shape*.45)`, `curve=profile.curve*L*.28*shape`, `bladeLen=L*(.35+shape*.65)`. Abaixo de `.25`, a lâmina é uma elipse; acima, caminhos quadráticos com `edge=W*(.42+shape*.2)`. Shape altera dimensão e perfil suave da peça; `W` também afeta dimensões da guarda/cabo/pomo quando montados. Não há parâmetro de empenamento no renderer.

Shape ainda controla revelação de elementos: ondas de Damasco `>.4`, estrelas de meteorito `>.5`, canal central `>.55`, inscrição `>.72` com metal frio. Material/projeto escolhem padrões, componentes, curva e runas; calor controla brilho térmico e pode esconder inscrições. Esses mecanismos não são limiares de qualidade.

Na forja, `ForgeCanvas` passa `sim.shape`. Em [sim.ts](../src/game/sim.ts), linhas 51–60 e 205–223, execução influencia shape/warp e a nota; essa correlação não transforma quality em controle geométrico. [GameApp.tsx](../src/game/GameApp.tsx), linhas 82–94, armazena nota e warp, mas não shape final. [RevealScreen.tsx](../src/game/screens/RevealScreen.tsx), linhas 33–37, força `shape=1`; [GalleryScreen.tsx](../src/game/screens/GalleryScreen.tsx), linhas 65–69, omite shape, cujo default é 1. Warp não é passado para desenhar a arma. Logo a geometria da peça final não preserva esses resultados da execução. Os limiares atuais de `gradeFor` não são usados para desenhar a arma, e não foram reconciliados com a Bíblia Estética.

**INTERPRETATION / H2_RESULT: SUPPORTED; QUALITY_EXPRESSION_CLASS: WEAK.** Existem dois canais de expressão (luminosidade e cor opcional da inscrição), portanto não é NONE. Não existem diferenças de forma, defeito ou acabamento de execução na peça final para sustentar STRONG; os canais restantes são limitados. A constituição pede marcas em forma/alinhamento/superfície. Esta é uma classificação dos mecanismos disponíveis; não demonstra que humanos conseguem ou não discriminar as quatro notas sem rótulos. Não houve estudo humano.

## Surpresas, scars e limites

- A posição exata usada pelo código da Revelação num canvas 512×320 corta a ponta da arma deste projeto: origem y=179.2, comprimento 304 e ângulo padrão levam a ponta para y≈-123. Foi preservada uma [referência de renderer com esses argumentos](M01-R1/evidence/reveal-placement-512x320.png), não uma captura da tela completa da Revelação. O comparativo isolado usa origem/dimensões fixas que contêm a peça inteira; não houve correção do produto.
- Na coleta inicial, 400 ms de repouso ainda incluíam o fim do golpe devido ao hitstop, e o HUD assíncrono estava atrasado no impacto. Esses quadros foram descartados; o método final usa 600 ms de repouso, 128 ms pós-liberação, espera de commit e verificação do contador. Evita chamar spritesheet de golpe de “mão em repouso”.
- UNKNOWN: percepção humana, legibilidade sob toque real, DPR/safe areas/browser chrome dos aparelhos, todas as variantes de projeto, estados máximos de shape, todos os frames do golpe e desempenho. O baseline cobre exatamente as classes CSS e sequência registradas, não todo o espaço de estados nem uma avaliação de balanceamento.
- Não houve redesign, alteração de fórmula/limiar, implementação de raridade ou correção de controles. A dependência de Cinzel e a versão do navegador delimitam a reprodução visual.

## Próxima decisão

Escolher um experimento de composição que compare a conservação da lâmina no calor e a cobertura pelo sprite contra este baseline, preservando a contraevidência de que o enquadramento já conserva a região de martelamento testada. Para uma missão separada de expressão de qualidade, decidir como a execução deve chegar à geometria/superfície da peça final antes de implementar qualquer mecanismo. Nenhum desses experimentos foi iniciado.
