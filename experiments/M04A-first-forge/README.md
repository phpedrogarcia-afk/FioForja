# M04A — A primeira forja intuitiva

## Base e limites de autoridade
Base real `9b09a36bab7631d3af2989623cd62973f7829533`, checkpoint instalado 0.2.8: inclui M03A `0806758` e Coleção `56027a1`. Branch `codex/first-forge-onboarding-m04a`. Main local `4a1cd01` e main remota observada `3ad7239` são linhas divergentes; não foram integradas nem alteradas. Worktrees anteriores preservados. Frente Antigravity de movimento `67ab141` continua separada.

## Implementação e decisões
[Contrato técnico](../../docs/specs/forge-onboarding.md). Uma mensagem principal contextual, fases compactas, dispensa persistida e controles avançados recolhidos. Sinais vêm do snapshot real e catálogo, sem física nova. No aquecimento, retirada ganha contorno dentro da faixa real do aço. Após o primeiro golpe, sai a dica do gesto e permanece a consequência registrada pelo simulador. Têmpera mantém a janela física e mostra a instrução antes do primeiro mergulho. Calor frio/reaquecimento têm prioridade durante a bigorna.

Campo opcional v5 com quatro booleanos; save antigo é migrado sem perder dados. Marcos acompanham a mesma gravação transacional do checkpoint existente. Dispensa usa writeSave. Concluir exige têmpera terminada com peça íntegra; treino também ensina o gesto, sem recompensas reais indevidas. Nenhuma chave paralela ou gravação de onboarding por frame.

Consulta Kev única: recomendou acompanhar checkpoints existentes (probabilidade 0.6491; evidência `60c9eb4fb0fae1bda59c489fb4207db555d7c43b41d9a8d4105c6130c508f0fe`). Escolha aplicada e verificada por migração/checkpoint e ciclos touch; conselho não é prova.

## Verificação técnica
- `npm test`: **504 descobertos, 497 PASS / 7 SKIP / 0 FAIL** (203 testes de scripts + 301 testes TypeScript). Inclui cinco novos testes de onboarding, treinamento transacional e ausência de mutação física.
- Typecheck PASS; lint 0 erros / 40 avisos herdados; build web e mobile PASS.
- `verify.mjs`: **33 verificações PASS**, ciclo físico completo por toque real CDP em 360×800 e 392×819, oito golpes, reaquecimento, têmpera e uma espada persistida por ciclo. Após o primeiro golpe e na têmpera, recarga/retomada mantém a fase. Também testa saves antigos sem metadados e dispensa/recarga nas três fases. [Resultados](evidence/checks.json).
- `controls.mjs`: três verificações PASS: Enter no botão de dispensa não golpeia; abrir Voltar enquanto Espaço continua pressionado não solta martelo nem têmpera. [Resultados](evidence/controls.json).
- ForgeCanvas, sim, swordDraw, audio e assets não alterados. A integração com Antigravity mantém HudSnapshot e callbacks existentes.

## Comparação visual
Amostra controlada: mesma tentativa sintética recuperada na bigorna, aço/força/estado fixados; não é experimento controlado de aprendizagem humana. [Métricas](evidence/comparison.json).

| Viewport | Texto visível antes → depois | Altura topo antes → depois | Altura inferior antes → depois | Faixa vertical adicional entre grupos |
|---|---|---|---|---|
| 360×800 | 288 → 194 caracteres | 260.6 → 249.6 px | 64 → 36 px | 39 px |
| 392×819 | 288 → 194 caracteres | 246.2 → 238.9 px | 64 → 36 px | 35.3 px |

Nenhuma rolagem horizontal/vertical nas amostras. A faixa vertical é uma medida de layout, não percentual de pixels da espada desocluídos. Contagem de caracteres não mede esforço cognitivo. O gesto físico continua segurar/soltar; não aumentou o número de gestos para forjar. Dispensa e escolha avançada são opcionais.

Antes/depois: [360 antes](evidence/before-hammer-360.png), [360 depois](evidence/after-hammer-360.png), [392 antes](evidence/before-hammer-392.png), [392 depois](evidence/after-hammer-392.png). Capturas de calor, têmpera e recuperação acompanham a pasta evidence.

## Scars e limites
A revisão identificou um risco introduzido pelo guard de confirmação de saída: remover listeners fazia cleanup soltar o input com a simulação rodando. Foi corrigido para bloquear apenas novas entradas por ref, sem desmontar o efeito; testes de Voltar durante carga/imersão passaram. A confirmação de saída preexistente não pausa a física e não é anunciada como pausa; corrigir isso exige contrato com Canvas em missão posterior.

Falhas do harness corrigidas: baseline não tinha o novo aria-current; a espera passou a usar o botão comum. Snapshot artificial de têmpera sem histórico foi rejeitado pelo validador existente; a fixture foi substituída por checkpoint produzido após oito golpes reais. Um teste de treino usava design anterior à normalização transacional; passou a usar a identidade efetiva. Nenhuma validação física foi enfraquecida para fazer testes passarem.

**NOT_PROVEN:** compreensão por iniciante sem ajuda, aprovação humana, toque/legibilidade/Voltar físico no Poco, desempenho sustentado, áudio físico e uma pausa real em modal. O Poco não estava conectado na consulta M04A. Android/APK: registro complementar após build e validação em AVD. Publicação somente das branches experimentais autorizadas, sem merge nem alteração da main.

## APK e Android — resultado limitado
APK candidato **0.2.9 / código 11**, 12.132.681 bytes, SHA-256 `64399fa0c1c0e8a0f412ccd600ad9b9c287b2303606c50dd6be31165a1a1d358`; fonte `ce8387577bf08cba8b658c90f345a962437d745b`. Mesmo pacote e certificado SHA-256 `29896d7ad281e0f642a44d513b2b277a3e1723de2df0d796ea0eff1a8af195bc` do APK 0.2.8. [Resumo verificável](evidence/android-summary.json).

Build, assinatura, instalação por cima e abertura a frio passaram no AVD read-only API36, com Wi-Fi/dados desativados e rede padrão ausente. O fluxo interativo Android **não passou a ser comprovado**: o driver Playwright rejeitou o WebView por não oferecer gerenciamento de contextos, e o emulador encerrou sozinho duas vezes (exit 1), sem causa atribuível ao app demonstrada. [Falha preservada](evidence/android.json), harness `android.mjs` preservado como tentativa não concluída. Uma etapa adicional combinando reabertura do AVD e driver direto foi rejeitada pela revisão automática de aprovação com motivo “blocked by policy”; não executada. Não houve alterações no simulador para contornar falhas.

A entrega mantém **FioForja-teste.apk 0.2.8** nos destinos do proprietário. O novo candidato fica identificado como `C:\Users\phped\Documents\FioForja\APK\FioForja-debug-v0.2.9.apk`, com `BUILD-INFO-v0.2.9.txt`. Checkpoint anterior em `APK/Backups/pre-M04A-20261028`; 0.2.7 também permanece nas cópias por versão anteriores. Sem instalação no Poco e sem leitura/escrita de seu progresso nesta missão. Novos fontes e provas podem ser revisados na branch; aceitação final é **PARTIAL**, por validação Android interativa e humana pendentes.
