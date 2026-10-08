# M01-R4A — Brief mínimo de assets para testar a vista oblíqua

**Uso:** arte de conceito/protótipo para experimento em branch, não assets finais aprovados. Necessária porque o [fundo atual](../../public/game/bg-forge.jpg) inclui uma bigorna de vista baixa, enquanto a [bigorna separada](../../public/game/anvil.png) também mostra sobretudo a frente. Ver [auditoria](../M01-R4A-forge-view.md).

## 1. Cenário sem bigorna embutida

- **Câmera compartilhada:** ferreiro em frente à área de trabalho, levemente elevado, olhando obliquamente para baixo; chão, bancada e fornalha seguem a mesma linha de horizonte e direção de profundidade da bigorna independente. Não usar fotografia lateral com uma bigorna simplesmente apagada.
- **Composição:** fornalha ativa reconhecível à esquerda/ao fundo; banho de têmpera reconhecível à direita/ao fundo; centro e primeiro plano reservados para bigorna e martelo. Deixar espaço vazio real, com piso/bancada e sombra de contato previstos, sem outra bigorna ou lâmina pintadas. Retrato deve poder reenquadrar fogo e trabalho sem inventar outra geografia.
- **Luz e estilo:** luz quente dominante da fornalha vindo da esquerda, luz ambiente fria e discreta; textura e contraste compatíveis com o martelo atual ou com uma proposta coerente de substituição. Fundo não precisa exibir minúcias que competem com a peça.
- **Entrega para ensaio:** camada de cenário limpa, dimensão suficiente para recortes 390×844 e 1366×768 sem esticar; registrar ponto de vista, direção de luz e área reservada da bigorna. A resolução final é decisão de produção posterior.

## 2. Bigorna independente com topo utilizável

- **Vista:** mesma câmera oblíqua elevada do cenário; a superfície superior deve ser uma área larga e claramente plana, não uma tira estreita acima de uma frente monumental. Horn, borda frontal, corpo e apoio coerentes com essa perspectiva. Aproximação de proporção do **plano de trabalho**: comprimento cerca de 2–2,5 vezes a profundidade aparente, ajustável pela composição; deve comportar a maior parte de uma lâmina de teste com margem para ponta e ponto de impacto.
- **Entrega:** PNG/WebP com alfa verdadeiro, sem fundo, sem sombra pintada que contradiga o cenário. Idealmente corpo/base, superfície superior e borda dianteira em camadas ou com máscara do topo: isso permite pôr lâmina e sombra de contato **sobre** o metal e o martelo **à frente**, sem parecer que a espada flutua. Referência de pivô/área de impacto e contato com bancada.
- **Luz e forma:** luz quente da esquerda e reflexo frio secundário; detalhes de superfície não escondem a lâmina aquecida. Mesma escala/perspectiva nas versões retrato e desktop, com reenquadramento, não com deformação do asset.

## 3. Critério de suficiência antes de codificar

Montagem estática simples, sem skew de perspectiva: topo da bigorna visível, lâmina existente apoiada com sombra de contato, martelo atual vindo da direita com trajetória plausível, fornalha claramente localizada. Se a mão/spritesheet atuais não puderem encontrar o plano de contato sem anatomia deformada, registrar essa incompatibilidade e criar poses de protótipo no **mesmo ponto de vista** antes de medir gameplay. Fire/sparks atuais podem permanecer como efeitos provisórios se não ocultarem a peça.

O conceito visual anexado pelo usuário é **referência de intenção**, não arquivo de produção nem exigência de cópia pixel a pixel. Não introduzir HUD, falha, stats ou novas famílias neste ensaio.
