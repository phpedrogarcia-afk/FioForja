# Operação Codex 08 — revisão da integração mobile

**Data:** 25/10/2026. **Veredicto:** `PASS` no envelope funcional testado; **candidata à avaliação humana**. Publicação autorizada exclusivamente para `codex/mobile-core-review-v1`; conferir o HEAD remoto ao retomar.
**Base congelada:** `78945e0de9d7a70d14994e80a14b2885998ec9ec`.
**Branch:** `codex/mobile-core-review-v1`.
**Worktree:** `C:\Users\phped\.codex\worktrees\mobile-core-review-v1\FioForja`.

## Escopo e continuidade

Revisão da integração mobile, com preservação dos contratos de cinco seções, economia/save únicos, forja manual com núcleo e trabalhos das outras frentes. Os JSONs históricos não são alterados para alinhar documentação.

Na abertura, `main` local estava em `4a1cd01`, `origin/main` observado em `3ad7239` e a branch remota DeepSeek em `78945e0`. Nenhum desses pontos foi movido pela revisão. A WIP funcional anterior permanece no checkout original e no snapshot `5f71ba4`; esse snapshot não é a base desta revisão. A identidade DeepSeek do doador Weapon DNA (`d3657da`/`a2fa002`) é histórica e não deve ser confundida com a branch remota atual em `78945e0`.

## Divergências resolvidas pela evidência existente

| Assunto | Fato observado | Decisão documental |
|---|---|---|
| Primeiro percurso de navegador | `6a640d4:experiments/mobile-core-integration/browser-proof.json`: UTC `2026-10-25T02:02:19.102Z`–`02:02:45.746Z`; núcleo Rara, "Núcleo Dobrado de Alta Densidade — Lâmina de Prova 96" | Preservar como primeira execução histórica |
| Segundo percurso de navegador | O mesmo caminho em `2db89fd` contém UTC `2026-10-25T02:11:21.424Z`–`02:11:48.925Z`; núcleo Lendária, "Coração Metálico Transcendental [Salto Excepcional +2] — Lâmina de Prova 96" | O README havia mantido a saída do primeiro run; descrever o segundo e apontar ambos |
| Golpes registrados | Cada JSON tem sete eventos `strike`, com contadores 1–7, seguidos de têmpera e revelação. O probe para de ler golpes ao entrar em têmpera | Corrigir "8 golpes físicos" para sete eventos registrados; total físico além desses eventos é `NOT_PROVEN` pelo JSON |
| Navegação | A decisão humana posterior substituiu Jogador por Craft; a integração contém Início/Coleção/Forja/Loja/Craft | Atualizar o resumo vigente; manter a substituição registrada como história da decisão |
| Versões anteriores | Na abertura da revisão, a rodada inicial era 0.1.0; 0.2.0 foi intermediária; o último APK integrado registrado era 0.2.1/código 3, commit `2db89fd` | Corrigir referências `CURRENT 0.2.0`; preservar hashes e relatos próprios das versões anteriores; candidato 0.2.2 detalhado abaixo |
| Texto inválido | `DECISIONS.md` continha o nome de um enumerador PowerShell como texto | Remover o artefato de formatação, sem reescrever decisões |

Não se executou novamente um percurso para decidir entre esses fatos: o histórico Git distingue objetivamente as duas rodadas. Não foi necessário consultar ranking de hipóteses para uma diferença resolvida por comparação determinística.

## Cobertura e contagem de testes

- **Codex 05, histórico:** o relatório `experiments/M03-cross-agent-integration/README.md` e `evidence/integrated-test.txt` registram dois processos: JavaScript **197 encontrados / 190 pass / 7 skip / 0 fail**; TypeScript **207 / 207 pass / 0 fail**. Total **404 encontrados / 397 pass / 7 skip / 0 fail**.
- **Codex 07, histórico:** os **231/231** eram o subtotal TypeScript: os 207 anteriores mais os 24 de `mobile-integration.test.ts`. A documentação o rotulava incorretamente como suíte total. O total executado na revisão está registrado por processo abaixo; não é uma reconstrução do resultado histórico por aritmética.
- **Comparação estática `c2b1883..78945e0`:** nenhum teste versionado anterior foi removido ou modificado. Foram adicionados `scripts/android-package.test.mjs` (4 declarações), `scripts/mobile-assets.test.mjs` (2), `src/game/mobile-integration.test.ts` (24) e `experiments/mobile-ux-v1/craft.test.ts` (3). O comando `npm test` mantém os argumentos anteriores e acrescenta `mobile-integration.test.ts`; os dois arquivos JavaScript novos são alcançados pelo glob existente. Os três testes do protótipo Craft não estão incluídos nesse comando.
- **Doador DeepSeek:** `d3657da` introduziu `weaponGenome.test.ts` e `geometry.test.ts`; `a2fa002` ajustou uma asserção de geometria. Esses dois arquivos foram preservados na integração `c2b1883` e continuam sem alterações até a base desta revisão. `c2b1883` ampliou a seleção visual do comando para `visuals/*.test.ts`, acrescentando testes de integração DNA, refinamentos, adaptador e cache, além do lifecycle de gameplay. Não houve retirada de testes do doador para explicar a diferença 404/231.
- **Limite da inspeção estática:** as declarações acima foram lidas no código; loops, parâmetros e skips podem alterar o total de execução. Nesta worktree não existe `scripts/internal`; nenhum arquivo foi inventado para preencher esse glob herdado. O runner da revisão confirmou o conjunto concreto JavaScript de 203 testes, separado do subtotal TypeScript.

## Correções e mecanismos preservados

| Frente | Contraexemplo ou comportamento observado | Mudança e alcance |
|---|---|---|
| Loja | A base já normalizava nome, efeitos e identidade do produto pelo catálogo | `KEEP`: preservar normalização e acrescentar regressões; não atribuir à revisão uma correção que já existia |
| Persistência inicial | No save fresco, o candidato era gravado no backup antes do primary; uma compra recusada reaparecia ao recuperar o backup. Controle RED observou `730 !== 850` | O primeiro candidato só é copiado ao backup após a gravação primária bem-sucedida; regressão GREEN preserva o saldo anterior quando a transação falha |
| Fusão | Custos negativos/NaN e resultado, herança ou fragmentos incompatíveis com a receita podiam atravessar a validação | Reconstruir uma receita possível do mesmo tier a partir das doadoras atuais e comparar custos e efeitos antes do débito; probabilidades preservadas |
| Ferramentas | A Loja vendia ferramentas sem oferecer o percurso mobile de equipar e restaurar o padrão | A categoria Ferramentas oferece equipamento comprado e padrão, usando o fluxo existente |
| Painéis de seções ocultas | As seções permanecem montadas; um Sheet em portal podia continuar sobre outra seção | Os nove Sheets abrem somente quando sua seção está ativa, preservando a seleção local ao retornar |
| Encomendas | Faltava escolher a arma elegível e consultar o histórico cumprido | Seletor explícito da arma antes da entrega; histórico das encomendas cumpridas preservado |
| Refino | O painel não mostrava previamente o preço e o efeito real da próxima operação | `getSwordUpgradeQuote` compartilhado por tela e transação mostra custo e delta ATK/DUR efetivos, inclusive quando a durabilidade encontra seu limite; máximo de três refinos |

**Limite da validação de fusão:** a reconstrução verifica compatibilidade da receita, não autentica o sorteio original. Não detecta genericamente uma troca `usedCatalyst: true → false` quando o mesmo resultado é possível nos dois cenários. O save local continua editável; esta correção não é um sistema de autoridade remota nem proteção geral contra adulteração do save. Núcleos antigos permanecem forjáveis sem exigir reconstrução de doadoras já consumidas.

## Resultados de software confirmados pelo executor

| Processo ou prova | Descobertos | PASS | SKIP | FAIL |
|---|---:|---:|---:|---:|
| `npm test` — JavaScript | 203 | 196 | 7 | 0 |
| `npm test` — TypeScript | 272 | 272 | 0 | 0 |
| **`npm test` — total** | **475** | **468** | **7** | **0** |
| Suíte focal, sobreposta ao total | 123 | 123 | 0 | 0 |

O processo TypeScript inclui as **41 regressões novas** de economia/persistência em `src/game/mobile-core-review.test.ts`; nenhum teste antigo foi removido. A suíte focal não é somada novamente ao total.

Quatro percursos de interface adicionais, fora de `npm test`, passaram de **RED 4/4 falhas** a **GREEN 4/4 PASS** em 392×819 CSS: comprar/equipar/restaurar ferramenta; ir da inspeção à Loja sem portal oculto bloquear a navegação; escolher a segunda arma elegível e manter o histórico da encomenda; mostrar custo e efeito limitado do refino antes do débito. Evidência preservada em [RED](../../experiments/CODEX08-review/ui-regressions-red.json), [GREEN](../../experiments/CODEX08-review/ui-regressions-green.json) e [harness](../../experiments/CODEX08-review/ui-regressions.mjs). Esses quatro percursos não constituem um novo ciclo completo de forja nem validação física Android.

| Verificação adicional | Resultado confirmado |
|---|---|
| Typecheck | PASS |
| Lint | 0 erros / 38 avisos |
| Build web | PASS; `db:migrate` explicitamente SKIP por `DATABASE_URL` ausente, com fallback PGLite; nenhum banco remoto migrado |
| Build mobile | PASS |
| Build APK e assinatura | PASS; assinatura verificada por `apksigner` |
| Revisão econômica independente | Comparação reportada de 72 outputs: 6 raridades × 2 modos × 2 opções de catalisador × 3 seeds; zero diferenças após excluir IDs/datas. Fora do total de `npm test`; não autentica a origem de um sorteio |

## APK entregue e identidade da fonte

- **Versão:** 0.2.2, código 4, pacote `com.projetofio.fioforja`.
- **Tamanho:** 12.129.669 bytes. **SHA-256:** `d528b890f9f83a2299f105874084bf8e7f8717e5c86a5cf920b74a393fc40f56`.
- **Fonte do build:** base `78945e0` mais o working tree revisado. `BUILD-INFO.txt` registra alterações não commitadas `YES`; este APK não é apresentado como build de um HEAD limpo.
- **Entrega:** `C:\Users\phped\Documents\FioForja\APK\FioForja-teste.apk` e `FioForja-debug-v0.2.2.apk`, além dos destinos automáticos da receita.
- **Preservação:** APK 0.2.1, SHA-256 `02e7ec2b01badbd848adf4212fc9e2a9abf2ce57aacd093747220cfbd0e8be8d`, mantido na cópia identificada por versão e em `APK/Arquivo-Codex08/FioForja-v0.2.1-code3.apk`. O APK físico anterior 0.1.0 também tem backup prévio. Nenhum candidato 0.1.0 foi instalado pela Operação 08.

## Android no emulador — nove casos PASS

Fonte: [android-summary.json](../../experiments/CODEX08-review/android-summary.json). AVD `FioForja_API36_APK`, `emulator-5556`, Android 16/API 36, x86_64. Viewport observado nesta rodada: **412×839 CSS, DPR 2,625**, mapeado à área nativa `(0,136)–(1080,2337)`. O resumo reúne etapas confirmadas em momentos distintos; etapas PASS foram preservadas após reparos de driver e interrupção de coordenação, sem repetir o percurso inteiro.

Houve backup do estado original do AVD e **fixture sintética declarada**: quatro Raras de qualidades livres, carteira e desbloqueio de aço, inicialmente sem materiais/componentes/núcleos. Isso não é progressão naturalmente conquistada. Após a fixture, as interações foram toques/gestos/teclas nativos ADB; CDP leu DOM/HUD/storage, sem injetar transações, React ou canvas.

| Caso | Resultado observado |
|---|---|
| Atualização 0.2.1 → 0.2.2 | Instalação por cima sem limpar dados preservou a fixture |
| Comprar aço | Estoque canônico abastecido pela Loja |
| Comprar catalisador | Unidade disponível para o Craft |
| Comprar duas guardas | Ambas entregues ao inventário real |
| Instalar e trocar guarda | DEF **185 → 193 → 195**; primeira guarda devolvida ao inventário |
| Fundir quatro Raras | Núcleo **Épico**; um catalisador consumido |
| Reabrir o processo | Núcleo preservado |
| Forjar com o núcleo | Oito golpes nativos; têmpera **98**; aço reservado consumido; espada **Épica Q75**; núcleo consumido na conclusão |
| Reabrir após a forja | Arma e efeitos transacionais relevantes preservados exatamente |

Recompensas foram geradas e persistidas, **não coletadas** neste recorte. A captura imediata `07-weapon-reveal.png` mostra canvas vazio: **timing de captura versus comportamento de desenho permanece `NOT_PROVEN`**. A captura `08-persisted-inspection.png`, após reabrir, mostra a arma inteira. Não usar a segunda imagem para declarar resolvido o primeiro frame da Revelação.

## Poco — reinstalação e restauração, não atualização por cima

Fonte: [poco-summary.json](../../experiments/CODEX08-review/poco-summary.json). O proprietário confirmou que desinstalou o aplicativo original e autorizou a reinstalação. Instalou-se 0.2.2 e restaurou-se o snapshot do proprietário capturado antes da remoção; a escrita foi comparada ao snapshot de SHA-256 `387b58558af9e0c3576966751b0917f605b4afc82778de2546b2706cdd7a2f24`.

Entre a restauração e o início da leitura de navegação, observou-se uma nova forja local: carreira **2 → 3**, aço **2 → 1**. O ator é `NOT_PROVEN` por esta observação; não houve nova restauração para apagar esse progresso. O baseline de navegação subsequente, SHA-256 `66c14a7bbb4ea0a08054b40dadea1c92d4e4ea4278b8977d8fecc28e5250a4be`, permaneceu exatamente igual após navegar pelas cinco seções, Voltar de Craft à Loja, background e force-stop/relançamento. Viewport físico observado: **392×819 CSS, DPR 2,75**.

Não houve fixture sintética, compra nem fusão executada por esta prova no Poco. A atualização por cima foi comprovada **no emulador**; no Poco, o envelope é reinstalação, restauração e navegação com preservação do baseline. Áudio físico e desempenho sustentado não foram medidos.

## Evidência nova da revisão

| Etapa | Estado |
|---|---|
| Correção documental e separação de envelopes | Corrigidas; evidências históricas preservadas |
| Testes completos, subtotais e skips | **475 encontrados / 468 PASS / 7 SKIP / 0 FAIL**, por processo na tabela acima |
| Regressões de interface | **RED 4 → GREEN 4**, fora do total de `npm test` |
| Typecheck, lint e builds | PASS nos escopos acima; migração remota SKIP explícito |
| APK novo, versão, tamanho, SHA-256 e destinos | **0.2.2/código 4**, 12.129.669 bytes, hash e entrega registrados acima; fonte inclui working tree revisado |
| Instalação e percurso Android do candidato | **9 casos PASS** no AVD, com fixture declarada e recompensas não coletadas |
| Poco | PASS em reinstalação/restauração e navegação/relançamento; sem compra/fusão ou prova de atualização por cima |
| Publicação da revisão | Autorizada exclusivamente para `codex/mobile-core-review-v1`; confirmar referência remota na retomada |

Hash e contagens dos registros anteriores não foram reutilizados como se fossem desta rodada. Os resumos JSON preservam os artefatos e hashes das etapas, incluindo falhas de driver, interrupção de coordenação e observação visual inconclusiva.

## Limite de conclusão

**PASS no envelope funcional testado; candidata à avaliação humana.** Isso não é aprovação de governança ou produção e não prova confiabilidade geral, balanceamento/progressão de longo prazo, áudio físico ou desempenho sustentado. O primeiro frame da Revelação continua `NOT_PROVEN`; câmera/HUD e avaliação visual permanecem pendências próprias. A validação física do Poco cobre apenas o percurso explicitamente descrito, e a publicação autorizada abrange somente a branch experimental; nenhuma integração à main.
