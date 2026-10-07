# Conceito do FioForja

## Promessa

O jogador projeta uma espada, domina calor, força e tempo, e guarda uma peça cuja aparência registra como foi forjada. O troféu é fabricado, não simplesmente recebido.

## Protótipo observado no código

O fluxo atual é `title → design → forge → reveal → gallery` (`src/game/GameApp.tsx`). Na tela de projeto há cinco perfis, quatro aços, quatro cabos, quatro guardas e quatro pomos (`src/game/catalog.ts`). A inscrição aceita texto e uma opção chamada “runas”.

Na forja, a simulação passa por calor, martelamento e têmpera (`src/game/sim.ts`). O jogador segura e solta para controlar a força, tenta acertar uma janela móvel e conclui até oito golpes. A avaliação combina calor, forma/empenamento, têmpera e uma contribuição do aço. O código chama as categorias de qualidade “Falha”, “Medíocre”, “Boa”, “Excelente” e “Obra-prima”; isso é o estado do protótipo, não uma definição de raridade.

`src/game/ForgeCanvas.tsx` desenha a oficina em Canvas 2D; `src/game/swordDraw.ts` desenha a lâmina e os componentes. A tela atual da Galeria lista instâncias forjadas com miniatura, nome, nota e qualidade. `src/game/save.ts` grava projeto, preferências e até 24 espadas em `localStorage`.

## Direção futura, ainda não implementada

O core deve continuar baseado em habilidade. Progressão pode tornar a forja mais exigente, e execução excepcional deve gerar armas visivelmente melhores. Qualidade e raridade são separadas; raridade precisa de gates de execução e condições especiais para Relíquias. Famílias devem ter silhuetas próprias e combinações procedurais curadas.

A Galeria é planejada como arsenal de peças individuais, compêndio, componentes, runas, ferramentas e legado. A especificação completa está em [canon/galeria.md](canon/galeria.md); a direção visual está em [canon/estetica.md](canon/estetica.md). Esses documentos são intenção de design. Consulte [PROJECT-STATE.md](PROJECT-STATE.md) antes de alegar que uma parte futura já existe.
