# M01-R3A — Estado da arma terminada

**Status:** modelo conceitual para implementação futura; sem tipos, fórmulas, limiares ou migração definidos. Preserva a distinção [projeto/modelo ↔ peça individual](../canon/galeria.md) e a exigência de que [qualidade deixe marcas](../CONSTITUTION.md).

## Falha atual que este modelo resolve

**Implementação no HEAD experimental:** [sim.ts](../../src/game/sim.ts) mantém `shape`, `warp`, calor e notas; [GameApp.tsx](../../src/game/GameApp.tsx) salva em cada `FinishedSword` o projeto, qualidade/grade, três notas, `warp`, id e data (até 24 peças no arsenal local). `shape` final, sequência dos golpes, reaquecimentos e defeitos localizados não são salvos. A [Revelação](../../src/game/screens/RevealScreen.tsx) força `shape=1`; a [Galeria](../../src/game/screens/GalleryScreen.tsx) usa o default 1. Nenhuma das duas passa `warp` ao renderer. Conforme [M01-R1](../../experiments/M01-R1-visual-baseline.md), variar apenas `quality` altera luminosidade e cor opcional de inscrição, não geometria ou defeitos.

## Contrato conceitual de continuidade

`projeto escolhido + execução observada` → **estado derivado da peça** → `aparência final reproduzível` → Revelação e Arsenal. **Atributos de combate são uma derivação futura separada**, sem autoridade para apagar ou redesenhar o estado visual. A mesma peça, com o mesmo id, projeto e marcas, deve continuar reconhecível em miniatura, inspeção e comparação. [Identidade de família](weapon-identity-model.md) define a forma que o jogador buscava; execução define o que aconteceu com aquela instância.

| Camada | Conteúdo / origem | Limite |
|---|---|---|
| Execução | Calor, momento e tipo de golpe, maturidade de forma, `warp`, têmpera, reaquecimento, projeto; hoje só parte desses dados existe ou persiste. | Métrica é evidência da ação, ainda não aparência. Histórico completo de eventos é decisão futura. |
| Estado derivado da peça | Família/projeto e componentes imutáveis da peça; maturidade final, eixo/empenamento, regularidade de gume, superfície/marcas, dano térmico, polimento, integridade da inscrição e das runas, equilíbrio percebido, síntese de acabamento. Cada eixo guarda intensidade e, quando relevante, posição/trecho. | Não preencher uma propriedade por palpite a partir da nota geral. Usar “não avaliado” quando a execução atual não fornece sinal. |
| Aparência | Silhueta, ponta e gume; reflexos, padrões materiais, manchas, inscrições e encaixes condicionados ao estado derivado. Mesma definição visual em Revelação/Galeria; escala muda, identidade e defeitos não. | Renderer apresenta a peça; não recalcula resultados da partida. |
| Atributos futuros | Possíveis ATK/DEF/AGI ou outra leitura de combate, derivados por regras próprias de projeto + estado + eventuais condições. | Não são sinônimo de qualidade, raridade nem brilho visual. |

**Eixos do estado derivado:**

- **Maturidade da lâmina:** quanto do projeto foi efetivamente formado; peça incompleta não vira uma silhueta perfeita na Revelação. Sinal atual parcial: `shape` transitório.
- **Retidão/empenamento e gume:** alinhamento geral e irregularidade em trechos distinguíveis. Sinal atual parcial: `warp`; consistência localizada do gume ainda não é medida.
- **Superfície, dano térmico e polimento:** marcas de golpe, manchas/queima, homogeneidade e definição dos reflexos. `heatScore` é resumo térmico, não mapa de queima; polimento ainda não é ação medida.
- **Inscrição e runas:** projeto indica texto e opção de runas; sua integridade de gravação precisa de sinal próprio se vier a depender de execução. Hoje não há tal medição, portanto não atribuir sucesso/falha fictício.
- **Equilíbrio e síntese de artesanato:** proporções/encaixes e leitura geral da peça, derivados de sinais reais quando existirem. `quality` e `grade` podem resumir e ordenar; não substituem os eixos acima.

**Persistência futura:** congelar o estado derivado ao terminar a forja, ligado ao id individual e à versão do modelo que o produziu. Guardar os sinais de execução necessários para explicar o resultado sem obrigar a Galeria a refazer a simulação. Reabrir a peça em outro tamanho não deve gerar novos defeitos. Migração de peças já salvas requer política explícita; ausência de dados antigos deve aparecer como desconhecida, sem inventar marcas retrospectivas.

Um único `quality` é insuficiente porque duas peças de mesma nota podem ter histórias e defeitos diferentes: uma pode estar reta com superfície queimada; outra, limpa mas com ponta torta. Se ambas apenas mudarem de luminosidade, o jogador perde a autoria do resultado. Qualidade e raridade continuam eixos diferentes. Os limiares de `gradeFor` no [catálogo atual](../../src/game/catalog.ts) são estado de implementação; os intervalos estéticos da [Bíblia](../canon/estetica.md) são direção. Este documento não os reconcilia.
