# M01-R3A — Modelo visual da forja

**Status:** direção de design para experimento futuro; não descreve uma implementação aprovada. Regem este alvo a [Constituição](../CONSTITUTION.md), os [invariantes](../INVARIANTS.md) e a [Bíblia Estética](../canon/estetica.md).

## Ponto de partida

- **Implementação observada no HEAD experimental:** [ForgeCanvas](../../src/game/ForgeCanvas.tsx) desenha um fundo lateral num quadro 1280×720 com escala `cover`, peça separada no fogo e na bigorna, e mão/martelo em primeiro plano. Na fase `forge`, [sim.ts](../../src/game/sim.ts) pode elevar `heat` por `reheating` sem deslocar a peça de volta ao fogo; na têmpera há uma faixa translúcida sobre a cena. O workpiece em `heat` recebe `shape=.12`, qualquer que seja a maturidade real da peça.
- **Evidência:** [M01-R1](../../experiments/M01-R1-visual-baseline.md) encontrou 0% da peça visível no calor em retrato e cerca de 77–78% de cobertura pela mão no repouso. [M01-R2](../../experiments/M01-R2-forge-composition.md) trouxe o calor retrato a 100% de visibilidade e o repouso a cerca de 31%, dentro da amostra medida. Isso mede presença e oclusão, não compreensão da cena.
- **Avaliação humana fornecida:** mão e atmosfera aceitáveis; peça no fogo é uma boa ideia, porém pouco reconhecível; câmera ainda lateral, colocação da peça fraca e fluxo de forja pouco convincente. É input de direção, não uma medição adicional.

## Fantasia e composição alvo

O jogador está **em frente à própria bigorna**, com olhar em primeira pessoa a aproximadamente 40–55° acima do plano de trabalho e até 20° fora do eixo longitudinal da bigorna. Vê o topo útil da bigorna e as duas bordas da peça, não apenas seu perfil lateral. A peça ocupa o centro da superfície de trabalho, levemente diagonal: base/espiga no terço inferior esquerdo e ponta rumo ao terço superior direito. O eixo e a base permanecem rastreáveis entre golpes. A mão dominante e o martelo entram do primeiro plano inferior direito; são grandes e pesados, mas em repouso deixam livres o contorno, o gume e a ponta. O martelo cruza a peça na carga e no impacto sem escondê-la persistentemente.

Hierarquia: **1 peça e contato com a bigorna → 2 martelo/gesto → 3 fogo e banho de têmpera → 4 atmosfera**. Fogo à esquerda/ao fundo e banho à direita/ao fundo definem destinos físicos reconhecíveis. Ao aquecer, a peça atravessa para a boca do fogo; ao retirar, reaparece no mesmo eixo de trabalho, sustentada por tenaz ou suporte coerente. A câmera pode acompanhar essa transferência, mas a peça nunca vira um objeto desconectado no canto. A mão aceitável do candidato pode ser aproveitada; o peso do martelo vem de escala, arco, contato, hitstop e som, não de cobrir a peça em repouso.

O ângulo atual parece lateral porque o fundo privilegia a frente da bigorna e a lâmina é quase horizontal sobre ele. Mesmo com os masks visíveis em M01-R2, falta uma leitura clara de **superfície, profundidade, eixo da lâmina e ponto de contato**. “Mais alinhada com a bigorna” significa olhar ao longo da área onde se trabalha, com o topo e a espessura da peça simultaneamente legíveis; não uma câmera vertical pura, nem perder a mão em primeira pessoa.

## Estados visuais e continuidade

| Fase | Peça, ambiente e gesto que devem ser vistos |
|---|---|
| No fogo | Tarugo alongado ou lâmina em progresso, com espiga/base e direção da futura ponta identificáveis. Uma parte entra na boca luminosa; contorno escuro e suporte continuam visíveis. O calor progride no metal, sem transformá-lo em uma elipse clara. |
| Retirada | A mesma peça sai do fogo para a bigorna em um deslocamento legível. Cor térmica e comprimento permanecem contínuos; não há troca súbita por uma forma mais pronta. |
| Martelamento | Peça apoiada no topo, vista obliquamente. Golpes alteram gradualmente bordas, ponta e superfície; faíscas confirmam contato sem encobrir o contorno. Repouso permite inspecionar o próximo ponto de trabalho. |
| Reaquecimento necessário | A peça volta visualmente ao fogo e retorna ao mesmo lugar/eixo. O jogador percebe que voltou por temperatura e posição, não apenas por um texto ou barra. Quantas vezes e com qual custo são decisões futuras de gameplay. |
| Pronta para têmpera | Lâmina refinada ainda quente, com gume e ponta reconhecíveis, antes do acabamento/montagem final. O deslocamento até o banho e a imersão são visíveis; vapor/chiado seguem o contato e não substituem a peça. |
| Revelação | Metal frio, detalhes de execução persistentes, guarda/cabo/pomo montados conforme projeto. A [peça individual](finished-weapon-state.md) produzida na forja é a que aparece na Revelação e na Galeria. |

Maturidade visual: **tarugo** (massa alongada, direção de espiga e ponta sugerida) → **esboço de lâmina** (comprimento e ponta emergem) → **lâmina bruta** (perfil da família e gume irregular) → **lâmina refinada** (perfil definido, marcas reais de execução) → **espada acabada** (montagem e polimento). São marcos de leitura, não cinco classes ou cortes numéricos aprovados. Um projeto de família curva deve sugerir essa curva ao longo da evolução; os componentes finais não precisam estar presos ao metal durante o martelamento.

“Real o bastante” significa conservar **lugar, forma, temperatura e gesto** no ciclo calor → bigorna → reaquecimento se preciso → banho. Não exige simulação metalúrgica exata. Não aceitar troca instantânea de posição/forma, glow sem objeto, reaquecimento apenas por HUD ou têmpera como filtro azul imóvel.

## Câmera e classes de tela

Uma âncora estável na bigorna orienta a fase de golpes. O enquadramento pode ser **sensível à fase** para seguir fogo, transferência e banho; movimentos têm ponto de partida e chegada rastreáveis e não devem saltar no instante do clique. Ajustes breves de impacto podem preservar a força já existente. Em retrato, usar enquadramento próprio para manter juntos peça, bigorna e origem/destino imediato; em desktop, ampliar o contexto sem reduzir a peça a miniatura. Não basta recortar o quadro desktop. A relação espacial fogo ↔ bigorna ↔ banho e a escala relativa da peça/martelo devem ser as mesmas nos dois formatos.

**Faça:** mostrar o topo da bigorna, a ponta e a espiga; manter a peça estável entre golpes; distinguir cor térmica de forma; deixar a transferência visível; preservar um martelo pesado em primeiro plano.

**Evite:** visão de perfil quase paralela à lâmina; tarugo oval branco sem direção; martelo estacionado sobre o gume; câmera que salta entre o fogo e a bigorna; acabamento completo antes da têmpera; glow/faíscas usados para esconder falta de forma.

**Critério para o próximo experimento:** em retrato e desktop, observadores devem conseguir apontar onde está a peça e dizer se ela está no fogo, na bigorna ou no banho, identificar base e ponta desde o início, e acompanhar uma ida e volta ao fogo sem descontinuidade. Comparar com M01-R1/M01-R2 sem tratar os percentuais de mask como prova de legibilidade humana.
