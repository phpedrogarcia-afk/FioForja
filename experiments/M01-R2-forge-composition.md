# M01-R2 — Experimento de composição da forja

Data: 2026-10-07. Base: dd43842926ff109dee8df7ddb2731f1eb3afce43, branch exp/m01-r2-forge-composition. **RESULT: PASS para consideração do candidato; não é promoção automática.** HYPOTHESIS_RESULT: SUPPORTED dentro dos quatro viewports, cinco estados e sequência registrados.

## Base e método

O baseline é o resultado M01-R1 já registrado, sem nova renderização. O harness M01-R2 recorta os cinco frames existentes de cada prancha M01-R1 e os compara com novas capturas do candidato. O SHA-256 do registro de medições M01-R1, browser, seed, desenho padrão, DPR e estados estão em [measurements.json](M01-R2/evidence/measurements.json). Foram preservados os quatro viewports e a ordem heat, forge-rest, forge-charge, impact, quench.

Para reproduzir na raiz do checkout, com dependências já instaladas:

    node scripts/with-app-env.mjs node node_modules/vite/bin/vite.js dev --host 0.0.0.0 --port 8080
    node experiments/M01-R2/capture.mjs

O segundo comando roda em outro terminal. A instrumentação observa a UI e o renderer existentes; não adiciona rota, asset ou dependência.

## Candidato

1. Só em retrato durante heat, o enquadramento horizontal passa a focalizar x lógico 310. Isso desloca a janela para incluir o mask aquecido (x≈258–359) e a fornalha. As janelas lógicas medidas são x≈143,65–476,35 em 390×844 e x≈147,90–472,10 em 412×915. A área lógica visível continua igual: 25,99% e 25,33%, respectivamente. Nenhuma fase posterior ou viewport paisagem muda de câmera.
2. A mão normal repousa até 96,75 unidades lógicas mais alta. A elevação decai com a força de carga pela curva size × 0,225 × (1 − force)³ e chega a zero no fim da carga. Arte, rotação de carga e spritesheet de impacto permanecem os existentes.

A interação, simulação de calor, pontuação, timing de golpe, bigorna, fundo e assets não mudaram. O único arquivo de runtime modificado é [ForgeCanvas.tsx](../src/game/ForgeCanvas.tsx).

## Calibração e contraexemplos

**OBSERVATION.** A primeira variante (elevação linear de 0,255 × size) baixou o overlap em repouso para 4,23–4,40%, mas elevou o overlap de carga para 33,84–34,12%: falhou o alvo de carga. A segunda (0,18 × size com retorno cúbico) preservou carga em 10,56–10,74%, mas repouso ficou em 61,73–62,42%: falhou o alvo de repouso. A variante final intermediária (0,225 × size com retorno cúbico) alcançou os valores apresentados abaixo. As medições intermediárias foram capturadas durante a calibração, mas somente a matriz final foi mantida no pacote de evidência.
## Comparação quantitativa

O mask mede pixels do workpiece dentro do canvas; overlap mede pixels desse mask cobertos pelo sprite real da mão, com alpha ≥128. Percentuais são da lâmina visível, não uma medida de percepção humana.

| Viewport | Lâmina em heat, baseline → candidato | Overlap em repouso, baseline → candidato | Overlap em carga, baseline → candidato | Overlap no frame de impacto, baseline → candidato |
|---|---:|---:|---:|---:|
| 390×844 | 0% → 100% | 77,84% → 31,05% | 9,39% → 11,15% | 0% → 0% |
| 412×915 | 0% → 100% | 77,49% → 31,00% | 9,39% → 11,09% | 0% → 0% |
| 844×390 | 100% → 100% | 78,34% → 30,76% | 9,10% → 10,92% | 0% → 0% |
| 1366×768 | 100% → 100% | 77,59% → 31,53% | 9,30% → 11,10% | 0% → 0% |

A lâmina também permanece 100% dentro do canvas nas fases rest, charge, impact e quench em todos os quatro viewports. A fração de cena lógica não mudou. O ponto de impacto medido no frame impact é idêntico ao baseline em cada viewport, porque o foco especial só se aplica durante heat.

## Leitura qualitativa

**FACT.** A lógica de captura mede o canvas e o comando efetivo de desenho da mão; a comparação A/B reutiliza as imagens e medições da M01-R1. O ramo do spritesheet de golpe retorna antes do desenho normal da mão, portanto a nova elevação não desloca o sprite de impacto.

**OBSERVATION.** Nas duas capturas retrato de heat, a peça passa de totalmente fora do canvas para totalmente dentro dele, enquadrada sobre a região em brasa. O quadro lógico não encolhe; sua janela apenas se desloca. Em repouso, cerca de 69% da lâmina deixa de ser coberta pelo sprite. A mão e o martelo continuam grandes e dominantes. Na carga, o overlap aumenta apenas 1,62–1,82 pontos percentuais e fica entre 10,92% e 11,15%, abaixo do alvo de 15%. O frame de impacto e sua posição visual permanecem iguais. A inspeção das quatro pranchas não mostrou perda relevante de bigorna ou degradação notável no desktop.

**INTERPRETATION.** A composição retrato agora comunica a peça junto da fornalha, sem centralizá-la em uma área desconectada. No estado inicial de shape=.12, o renderer mostra uma forma arredondada clara; ela pode parecer uma peça bruta mais que uma espada formada. O enquadramento sustenta a relação com o fogo, mas não resolve a legibilidade da silhueta inicial. O martelo mantém presença física; a carga e o impacto permanecem próximos ou iguais ao baseline. A hipótese foi sustentada para a amostra testada.

## Limites e artefatos

A inspeção foi visual e determinística, em Edge headless 156.0.4314.8, DPR 1 e seed 101. Não houve avaliação com jogadores, dispositivos físicos, safe areas ou navegador móvel. O impacto foi comparado no frame registrado; nenhuma nova alegação sobre todos os frames da animação é feita. Nenhuma arte foi substituída e não houve refatoração geral de câmera.

Pranchas A/B:

- [390×844](M01-R2/evidence/comparison-390x844.webp)
- [412×915](M01-R2/evidence/comparison-412x915.webp)
- [844×390](M01-R2/evidence/comparison-844x390.webp)
- [1366×768](M01-R2/evidence/comparison-1366x768.webp)

[Harness](M01-R2/capture.mjs) e [medições, hashes e parâmetros](M01-R2/evidence/measurements.json).

RECOMMENDATION: KEEP este candidato para consideração em uma decisão posterior; não promover automaticamente. Nenhum merge, push ou M01-R3 foi executado. O HEAD permanece igual à base e as alterações estão na working tree da branch experimental.