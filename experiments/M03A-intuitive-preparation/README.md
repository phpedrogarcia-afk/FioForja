# M03A — Preparação intuitiva

**Resultado:** PASS técnico no envelope abaixo; candidata à avaliação humana. **Base:** M02B `653694b41de18187ec068e2d67770954031a2f80`. **Branch:** `codex/intuitive-preparation-m03a`. Sem merge/push; `main` local permanece `4a1cd01c269277df76f0b593657144ee5dce28cd`.

## Entrega e preservação

Dois controles essenciais — projeto e metal — com listas inline, prévia fixa e uma ação principal. Personalização opcional preserva os nove campos existentes, incluindo inscrições/runas, além do treino. Não há segundo motor. A transação e a tela consultam os mesmos gates extraídos em `preparation.ts`, com nomes/aliases e thresholds originais. Antes a tela identificava projeto somente por `p.name`, omitindo nomes curtos e designs renomeados que a transação já bloqueava. O feedback agora acompanha a decisão canônica.

Projeto/família mantêm o metal escolhido; não há seleção silenciosa de insumo raro. Falta de estoque oferece Loja. Reciclagem não promete outro metal: oferece ferro apenas no contexto correspondente. Tentativa ativa impede iniciar outra pela interface e mantém Retomar. `lastDesign` agora é gravado nas edições; o schema permanece v5. Loja M02A/M02B, Coleção, Craft, inventário, economia e save canônico preservados. Nenhuma alteração nos arquivos da frente Antigravity.

## Comparação controlada de interface

Mesmo GameApp, save fresco sintético, projeto padrão, renderer Clássico, DPR 1. Base executada no worktree M02B intacto, porta 8959; candidato na porta 8958; build final na 8960. Dimensões confirmadas pelo DOM, imagens JPEG verificadas visualmente. São comparações locais de layout, não experimento controlado de usabilidade humana.

| Métrica | 360×800 antes → depois | 392×819 antes → depois |
|---|---:|---:|
| Altura do canvas da prévia | 222 → 282 px | 222 → 289,6 px |
| Área do canvas | 69.042 → 91.932 px² | 76.146 → 103.674,6 px² |
| Conteúdo do miolo essencial fechado | 3.579 → 289 px | 3.522 → 300 px |
| Excesso rolável desse miolo | 3.002 → 0 px | 2.926 → 0 px |
| Caracteres de texto visível amostrado | 437 → 264 | 461 → 264 |

A amostra textual conta folhas `p/span/label/button/h1/h2/summary/figcaption` geometricamente visíveis, inclui barra/carteira e pode incluir linha parcialmente cortada. Não é OCR nem inventário completo de texto. O canvas é a **área reservada à arma**, não sua área de pixels opacos. As capturas mostram ponta, guarda, cabo e pomo inteiros. O renderer não foi diminuído nem refeito.

**Escolhas e toques:** há dois assuntos principais, nove campos opcionais. Valores válidos já preenchidos permitem começar com um toque, antes e depois: não eram nove escolhas obrigatórias. Para trocar explicitamente projeto e metal, o novo fluxo usa cinco toques (abrir/escolher cada lista + começar); o anterior tinha três ativações diretas mais gestos de rolagem. O ganho comprovado é enquadramento permanente e ausência de formulário longo no caminho principal, não redução universal de toques.

Listas expandidas e ajustes detalhados continuam roláveis. Na amostra de personalização 360 px, 2.443 px de conteúdo continuaram acessíveis, com a prévia imóvel em y=46–328. Na preparação final do núcleo com metal, excesso rolável 11 px em 360 e 0 px em 392; com metal faltante, 83 px em 360 px. Esse estado adicional exige rolagem curta, sem esconder a arma.

### Capturas

- [Antes 360](evidence/before-360.jpg), [antes 392](evidence/before-392.jpg), [problema durante rolagem](evidence/before-scrolled-392.jpg).
- [Depois 360](evidence/after-360.jpg), [depois 392](evidence/after-392.jpg).
- [Projetos abertos 392](evidence/project-picker-392.jpg), [metais abertos 360](evidence/metal-picker-360.jpg), [personalização 360](evidence/advanced-360.jpg).
- [Núcleo sem metal](evidence/core-missing-360.jpg), [núcleo pronto 360](evidence/core-ready-360.jpg), [núcleo pronto 392](evidence/core-ready-392.jpg).
- [Entrada na fabricação](evidence/forge-entry-392.jpg), [recuperação](evidence/recovery-392.jpg), [entrada com núcleo](evidence/core-forge-entry-392.jpg).

JSONs de dimensões e [percursos observados](evidence/ui-checks.json) preservados ao lado das capturas. O fixture builder usa saves sintéticos declarados, somente em origens locais isoladas; não usa dados do proprietário. O HTML temporário foi removido e sua ausência no APK foi verificada.

## Verificações

- RED: suíte nova falhou por ausência do helper. GREEN: **115 testes PASS** nas suítes preparation, mobile-core-review, mobile-integration, lifecycle-proof e progression. Sete novos testes; um deles contém 224 combinações com oracle explícito de carreira/projeto/metal, além de conferir o resultado transacional. Não contar combinações como testes adicionais.
- **6 testes de Android/assets PASS**; typecheck PASS; lint **0 erros / 38 avisos herdados**.
- Navegador: projeto/metal selecionados, bloqueios reais, falta de estoque, prévia durante personalização, nome/inscrição mantidos após Loja e reload. Build final: entrada real no aquecimento sem barra; reload detecta tentativa e Retomar volta à fabricação; aço 4→3, sem segundo consumo ao retomar.
- Núcleo sintético: projeto/metal/família/perfil bloqueados; compra real de um meteorito (5.000/200 → 3.600/195 ouro/rubis), retorno ao mesmo núcleo e entrada real na fabricação. Consumo final/idempotência e migração cobertos pelas regressões existentes; não foi necessário fabricar uma espada inteira nesta missão de preparação.
- Checklist React: hooks locais, eventos explícitos, radios nativos rotulados, foco devolvido ao seletor, sem efeitos de sincronização adicionais ou novas dependências.

**Revisão final:** um P2 reproduzido — Liberar núcleo deixava metal sem autorização e a escolha de projeto habilitada podia não aplicar nada. Corrigido com regressão RED → GREEN: projeto desbloqueado pode ser selecionado antes de corrigir o metal; a transação continua bloqueada. Feedback distingue Metal bloqueado de Projeto bloqueado. [Caso também verificado no build final](evidence/released-core-project-392.jpg). Nenhum outro finding acionável.

## APK

**0.2.5 / versionCode 7**, 12.368.091 bytes; SHA-256 `9fa653bf5b87703fbfbae0610512f388b12fb85b04316f0a25465ddfb6618ea9`.

Entrega: `C:\Users\phped\Documents\FioForja\APK\FioForja-teste.apk` e `FioForja-debug-v0.2.5.apk`. Versão anterior preservada em `APK\Backups\pre-M03A-20261026\requested` nesse diretório, e cópia do destino original em `primary`; hash anterior `460634f125cdd4f027457967043499085f499080b0bbca450e3fee51c26a659c`.

Certificado novo/anterior idêntico, SHA-256 `29896d7ad281e0f642a44d513b2b277a3e1723de2df0d796ea0eff1a8af195bc`. App ID e origem local preservados; 11 assets locais, sem fixture de teste. Build realizado com alterações declaradas como não commitadas; blobs fonte registrados em `verification.json`. A posterior inclusão de documentação no commit não transforma o build em um build de HEAD limpo.

## Decisões e limites

- **Ruling:** adaptar inline em vez de Sheet. Kev sugeriu Sheet com probabilidade 0,3644 (inline 0,2405; insuficiente 0,2962); o painel padrão ocupa até 90dvh e cobriria a arma ou exigiria uma segunda prévia. O contrato visual e o menor custo de um único preview prevaleceram. Seletores nativos foram substituídos por listas inline para não depender de como o WebView abre pickers. Não atribuir eficiência causal à consulta.
- **NOT_PROVEN na entrega original:** instalação/atualização M03A e avaliação visual física no Poco, teclado virtual, áreas seguras reais, modo DNA visual desta tela, desempenho sustentado e maior intuitividade. O telefone conectado não foi usado para modificar seu save nem instalar naquela rodada. A instalação e observação física ocorreram posteriormente conforme registro abaixo; a avaliação humana continua pendente.
- **Limitação preexistente:** antes de iniciar uma tentativa, `prepCore` é apenas memória da sessão. Reabrir mantém o núcleo no inventário, mas requer selecioná-lo novamente. Não foi criado novo campo de save nem inferência ambígua de identidade. Após início, o checkpoint mantém o núcleo.
- Nenhuma regressão detectada no envelope testado; isso não prova ausência universal de regressões. Pendência humana: avaliar o APK nas duas experiências principais, seleção e personalização, antes de integrar.

**STOP:** M03A encerrada. Não iniciar outra missão nem integrar à main.

## Atualização posterior no Poco — 27/10/2026

Após o proprietário conectar o aparelho e pedir continuidade, o Poco `M2103K19PG` foi atualizado por `adb install -r` de 0.2.3/código 5 para 0.2.5/código 7. As assinaturas dos APKs instalado e candidato coincidiram. Uma cópia privada do APK anterior e dos dados do aplicativo foi criada em `C:\Users\phped\Documents\FioForja\APK\Backups\poco-M03A-20261027-201615`. A instalação retornou `Success`, a primeira data de instalação permaneceu, e os hashes dos nove arquivos de Local Storage permaneceram idênticos entre o backup e a verificação após atualização, antes de abrir o aplicativo.

O aplicativo abriu (`MainActivity`, status `ok`) e exibiu o progresso existente. Na tela física 1080×2400, a prévia completa apareceu junto às escolhas; abrir projetos e metais manteve a espada visível. Capturas e manifesto permanecem no backup privado, fora do Git. Não foram realizadas compras, alterações de projeto/metal ou forjas com o inventário do proprietário. A observação física não equivale à aprovação humana nem prova áudio, offline, partidas longas ou a entrada na fabricação no dispositivo. O APK/código 7 e os testes técnicos anteriores não mudaram nesta atualização; a avaliação pelo proprietário permanece pendente.
