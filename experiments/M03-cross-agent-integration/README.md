# Operação Codex 05 — integração auditada

**Status:** candidato técnico verificado em branch experimental; aceitação estética humana pendente. Esta pasta M03 é o experimento de integração após o laboratório M02, não a missão antiga de bootstrap documental M03.

## Bases e mapa concorrente

- Gameplay: `antigravity/forge-lifecycle-proof-v1` @ `0663f4e52522643ab0d296f7f3e8cd083373df3e`.
- Visual: `deepseek/weapon-dna-engine-v1` @ `a2fa0025a2e6755c78c42777b3abd1fec4e5572d`.
- Comum: `6e3920d4a8a92bca0b4d6f238d6232d3645a6b6c`. O doador visual deriva de gameplay anterior; merge integral substituiria correções posteriores. **ADOPT seletivo** de visuals, lab, testes, script e documentação.
- Branch: `codex/cross-agent-integration-v1`; worktree independente. Main local inicial `4a1cd01c269277df76f0b593657144ee5dce28cd`; main remota inicial `0ab93c7e51bcfa25b9aebcf7d5c86f5509963cd7`.
- Nenhuma dependência nova, nenhum lockfile alterado. O node_modules local é uma junction ignorada para dependências existentes.

## Falhas e correções — rastreabilidade

| Decisão / defeito | Implementação | Teste / evidência | Estado |
|---|---|---|---|
| Um golpe físico é uma ocorrência | transactions checkpoint run+sequência; sim conta golpe fatal | lifecycle-proof; [RED](evidence/gameplay-strike-red.txt), [GREEN](evidence/integrated-test.txt) | PASS no envelope local |
| Núcleo exige forja manual | GameApp usa start transacional; reserva metal; finish vincula/consome core | lifecycle-proof, navegador B | PASS; herança preservada |
| Retomar metalurgia confirmada | snapshot físico v1, relógio acumulado, Canvas pause/retry; legado sem snapshot só cancela | roundtrip/negativos/storage failure; navegador D | PASS; recuo ativo até 1 s |
| Finish e claim vinculados | ACTIVE + done + igualdade com snapshot; payout persistido exato | negativos de run/design/core/NaN/replay; A/D | PASS; sem autoridade de servidor |
| Treino sem farming por cancelamento | zero sucata no cancel; needsTrainingRecovery limita auxílio | casos de insolvência/falha/alias; navegador C 1,2,2 | PASS; balanceamento longo NOT_PROVEN |
| Geometrias distintas não colidem | chave exata silhouette/structure/mount; LRU240 | renderer-cache.test.ts; [RED DNA](evidence/dna-red.txt) | PASS |
| URL explícita prevalece | rendererAdapter URL > storage > legacy | renderer-adapter.test.ts; navegador H | PASS; opt-in |
| Instalação não rerrola lâmina | seed físico estável, parsing de tokens reais, base física | dna-integration.test.ts com quatro transações; F compra/instala/reload | PASS |
| Miniatura conserva detalhes | raster completo, chave genoma/dims/DPR; LRU96/32MiB | prova Chromium de paridade, invalidação e eviction | PASS / PARITY_APPROX controlado |
| Curadoria de três famílias | gramática/material/montagem compartilhados | refinements.test.ts + três pares visuais abaixo | AGENT-DESIGNED; revisão humana pendente |

## Testes e execução

- [npm test](evidence/integrated-test.txt): processo scripts **197 descobertos / 190 pass / 0 fail / 7 skip**; processo TS **207 / 207 pass / 0 fail / 0 skip**. Total real **404 / 397 pass / 7 skip**. Subtotais focados não são somados novamente.
- Skips: quatro verificações de skills de autoria ausentes neste repo standalone; uma de `.grok/app-env.json` ausente; duas de symlinks Windows. Permanecem explicitamente não executados.
- [Typecheck](evidence/integrated-typecheck.txt) exit0; [lint](evidence/integrated-lint.txt) exit0,0erros/44avisos (baseline26); [build](evidence/integrated-build.txt) exit0; sem DATABASE_URL e sem migração externa.
- [Harnesses finais](evidence/harness-lint-final.txt): sintaxe e lint sem erros. Não instalaram navegador/ferramentas.
- [Notas de integridade](evidence/gameplay-integrity-notes.md): contrato, regressões, consulta Kev e override fundamentado. Uma consulta econômica opcional foi recusada pela revisão automática por possível envio de contexto privado a serviço externo; não foi contornada. Investigação seguiu localmente.

## Navegador — execução real versus fixture

Chromium 149.0.7827.55, contextos novos sem perfil/saves do usuário, 1440×1000/DPR1. Física foi dirigida por teclado/botões; observação de HUD/save não foi usada para injetar metalurgia. [Índice verificável](evidence/validation-summary.json) confere os hashes de runtime atuais contra cada run selecionado.

| Caso | Prova / procedência | Relatório |
|---|---|---|
| A — PASS | Forja completa em contexto vazio; arma Q89/Magistral, DNA, claim. Sem fixture de gameplay. | [run](evidence/browser/2026-10-19T02-45-16-687Z/report.json) |
| B — PASS | Quatro doadores preparados; fusão pela UI → núcleo, depois forja manual real e consumo único. Não prova conquista orgânica dos quatro doadores. | [run](evidence/browser/2026-10-19T02-45-16-687Z/report.json) |
| C — PASS | Fixture falida; cancelamento de treino0, três treinos reais com sucata1,2,2 e reciclagem→1ferro; carteira/carreira/Arsenal isolados. | [run](evidence/browser/2026-10-19T02-45-16-687Z/report.json) |
| D — PASS | Forja real, dois golpes, reload, recuperação do estado e conclusão única. | [run](evidence/browser/2026-10-19T02-48-35-707Z/report.json) |
| E — PASS | Mesma arma real A antes/depois de reload; outro contexto com arma em save antigo explicitamente preparado. | [run](evidence/browser/2026-10-19T02-45-16-687Z/report.json) |
| F — PASS | Arma real A + compra e instalação de guarda pela UI; pixels mudam e permanecem após reload; genoma físico preservado. | [run](evidence/browser/2026-10-19T02-45-16-687Z/report.json) |
| G — PASS | Fixture24: miniaturas DNA distintas e comparador de duas armas. Não é progressão orgânica. | [run](evidence/browser/2026-10-18T21-53-30-669Z/report.json) |
| H — PASS | Outra forja real em legacy apesar de storage dna; coleção24/comparador em contexto de fixture separado. | [run](evidence/browser/2026-10-19T02-45-16-687Z/report.json) |

Os relatórios individuais FAIL foram preservados: primeiro roteiro clicava antes da hidratação; outro usava o texto antigo do botão de recuperação. As esperas/seletor foram corrigidos no harness, sem mudar runtime; somente casos afetados foram repetidos. O índice seleciona casos aprovados no mesmo hash, sem converter os runs falhos em PASS.

Screenshots, vídeos .webm e relatórios são versionados; traces completos muito grandes ficam locais/ignorados, com hashes nos relatórios. Nenhum perfil existente foi aberto ou apagado.

## Comparação visual — BEFORE donor / AFTER Codex

Mesmas fixtures q96/scores96, IDs, presets, dimensões e ambiente em cada par. Antes usa build original congelado; depois usa o motor atual. Os pares também incluem a correção de seed; não isolam causalmente cada ajuste artístico.

- [Damasco: antes/depois](evidence/visual-proof-2026-10-19T02-44-34-466Z/visual-pair-cimitarra_damasco.png).
- [Oriental: antes/depois](evidence/visual-proof-2026-10-19T02-44-34-466Z/visual-pair-lua_silenciosa.png).
- [Meteórica: antes/depois](evidence/visual-proof-2026-10-19T02-44-34-466Z/visual-pair-queda_asterion.png).

**Avaliação do agente: KEEP como candidato experimental / ADAPT para aceitação.** Damasco tem corpo mais estreito e arco mais nítido; Oriental mantém seção diamantada e ganha sori/linha de têmpera e facetas legíveis; Meteórica mostra espinha recortada, seção hexagonal, níquel e asas prateadas/pomo escuro. O refinamento de Damasco é discreto e seus padrões ainda podem ganhar leitura macro. Nenhuma aprovação estética humana ou promoção do padrão foi inferida. Não houve emissão nova para compensar materiais escuros.

## Benchmark comparável

[Manifest e raws](evidence/visual-proof-2026-10-19T02-44-34-466Z/manifest.json), [benchmark](evidence/visual-proof-2026-10-19T02-44-34-466Z/benchmark.json). Build donor `1bec6a443a9a8751a28cbce2467817734d62803809c96829d61f84859f2bd275`; atual `c72fce679cad957e7b969a0b06421b684e82cf1fc82915b3cabe4a2ccacce7f3`.

Mesma galeria24, canvas1400×900, cards220×210,DPR1; cinco aquecimentos e60amostras por braço, ordem intercalada. Medição inclui desenho e getImageData integral (rasterização/readback/alocação). CPU AMD Ryzen 5 5600 6-Core Processor              ; Node v24.20.0.

| Cenário | Média ms | p95 ms |
|---|---:|---:|
| Doador direto | 103.19 | 110.50 |
| Atual direto | 102.17 | 110.40 |
| Raster frio | 155.35 | 165.40 |
| Raster quente | 12.62 | 14.50 |

O cache quente beneficia repintura/remontagem; o frio é mais caro. Não são FPS apresentados nem primeiro paint. O [benchmark histórico reexecutado](evidence/benchmark-donor-rerun.json) observou21,52ms/p9524,90ms para DNA24 contra legado1,05/p951,20, mas só mede submissão Canvas. Seus valores não são comparáveis diretamente ao protocolo com readback acima. LOD foi DEFER: cache mostrou benefício sem remover detalhes; inspeção continua direta/interativa.

Paridade: seis leituras frias exatas; seis quentes diferiram da leitura inicial em1–40pixels (máximo1nível/canal, até0,015625%dos pixels). O desenho direto repetido reproduziu as mesmas diferenças; cache e desenho contemporâneo foram **idênticos** nos12casos. O primeiro protocolo exato e o segundo limite arbitrário de quantidade de pixels falharam e estão preservados. A regra final usa o controle direto contemporâneo, sem chamar diferenças não nulas de zero. A causa específica de backend/alpha é inferência, não prova.

## Reproduzir e continuar

```powershell
npm.cmd test
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run build
node experiments/M03-cross-agent-integration/browser-proof.mjs --run --serve --port 8947
node experiments/M03-cross-agent-integration/visual-proof.mjs
```

O harness visual espera por padrão o doador em `%TEMP%/fioforja-codex05-donor-0663-a2fa`; aceita `--donor-root=...`. Para reconstruir, exporte por git archive do SHA doador os caminhos `src/game`, `experiments/M02-weapon-dna`, `scripts/weapon-lab.mjs` e `package.json` para diretório temporário novo; disponibilize as dependências existentes e execute seu `build.mjs`. O preflight confere arquivos/hash do build original antes de comparar. Não use o checkout ativo do DeepSeek para gerar outputs.

## Preservação Git e escopo

[Verificação de identidade e worktrees](evidence/git-preservation.json): main local e remota mantidas, Antigravity/DeepSeek/M03 antigos limpos nos mesmos HEADs. O commit que contém este relatório é o checkpoint de integração; a publicação autorizada é somente da branch experimental por push normal.

Checagem de whitespace de código/documentos passou; logs brutos de ferramentas preservam espaços de tabelas e linhas finais. [Links](evidence/documentation-links.json): 72 referências locais resolvidas nos documentos de entrega.

## Compatibilidade, limites e próxima decisão

- Loader real e migração v4→v5 testados; arma antiga renderizada em browser. Tentativa velha sem snapshot é preservada, mas não promete metalurgia não registrada; cancelamento continua disponível.
- Persistência local, não anti-cheat de servidor. Concorrência entre abas e I/O sistemático com saves enormes permanecem NOT_PROVEN.
- Treino pode habilitar ajuda novamente após insolvência real; balanceamento/carreira longos não foram simulados como prova de produto.
- QA humano, mobile e padrão visual final: UNKNOWN/NOT_PROVEN. Raridade e nota continuam separadas; thresholds da Bíblia não foram promovidos a regras do código.
- Consulta extra de revisão independente do final foi interrompida por limite dos workers; a revisão root, contratos e provas executadas acima são o envelope entregue. Não houve infraestrutura nova.
- Próxima ação: revisão humana da branch e dos três pares. Não iniciar novo minigame nem fundir main automaticamente.
