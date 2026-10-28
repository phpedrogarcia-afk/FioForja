# M04A — Primeira forja contextual

Direção humana aprovada: **FIOFORJA — GAMEPLAY CLARITY**. Uma instrução útil por vez, com a arma em destaque. Sem facilitação física ou econômica.

## Implementação
- `forgeOnboarding.ts`: função pura usa fase/temperatura/golpes reais de `HudSnapshot`, catálogo `STEELS` e estado de reaquecimento do checkpoint. Nenhum limiar térmico novo; o controle Reaquecer continua condicionado pela regra existente `<0.58`.
- `GameApp.tsx`: acompanha marcos na transação de checkpoint existente. HUD inicial da recuperação parte do snapshot físico, sem mostrar aquecimento fictício. Mantém os listeners de ponteiro na janela; ignora botões/summary e teclado em controles focados. O estado da confirmação impede novos gestos, sem liberar artificialmente um gesto em curso.
- `ForgeHud.tsx`: Fogo → Bigorna → Têmpera, mensagem única e dispensa; retirada destacada dentro da faixa real. Zona/ferramenta são controles avançados recolhidos. Usa modalidade inicial de ponteiro primário/coarse+sem hover e passa a respeitar a última entrada real; suporte a toque isolado não identifica telefone. Mantém movimento reduzido e descrições dos medidores além da cor.
- `types.ts`/`save.ts`: campo opcional `forgeOnboarding` com booleanos `heat`, `hammer`, `completed`, `dismissed`, sanitizados na migração v5. Saves anteriores começam sem marcos. Nenhuma chave de armazenamento paralela.

## Significado dos marcos
Sair fisicamente do aquecimento registra heat; golpe real registra hammer. Completed exige fase quench, done e peça não quebrada, com marcos observados. É aprendizado do gesto, inclusive no treino; não certifica qualidade alta. Abrir, esperar ou quebrar não conclui. A dispensa é gravada por writeSave e só aparece como aceita após sucesso. Feedback físico comum e alertas térmicos continuam após dispensa. Recuperação sempre segue a fase física, inclusive com metadados antigos ausentes.

O checkpoint persiste os marcos na mesma gravação que a física; não são feitas gravações de onboarding por frame. Falha de persistência mantém o mecanismo de bloqueio/retry físico existente. A preferência de dispensa não modifica a tentativa.

## Limites e integração
Canvas, sim, swordDraw, áudio e assets não foram alterados. O contrato de sinais continua HudSnapshot + ForgeSnapshot; a frente Antigravity pode manter esses callbacks ao integrar. Não há merge entre as frentes.

A confirmação de saída **não pausa o relógio físico** na implementação existente; esta missão não a apresenta como pausa. Pausa explícita futura exige contrato com Canvas, que está protegido nesta missão. Fechar/reabrir usa os checkpoints existentes. Aceitação humana, toque físico no Poco e desempenho prolongado permanecem pendentes até provas próprias. [Evidências](../../experiments/M04A-first-forge/README.md).
