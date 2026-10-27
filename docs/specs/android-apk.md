# APK Android experimental

**Atualização física posterior, M03A — 27/10/2026:** Poco atualizado por cima de 0.2.3/código 5 para 0.2.5/código 7. Assinaturas conferidas; backup privado do estado anterior e nove arquivos de armazenamento idênticos antes/depois da instalação, antes de abrir. Jogo e tela de preparação abriram; listas de projeto/metal mantiveram a espada visível no aparelho. Sem compra ou forja com o inventário do proprietário. Aceitação humana, áudio, offline e teste de fabricação física permanecem pendentes. [Registro](../../experiments/M03A-intuitive-preparation/README.md#atualização-posterior-no-poco--27102026).

**M03A — 26/10/2026:** APK **0.2.5/código 7**, 12.368.091 bytes, SHA-256 `9fa653bf5b87703fbfbae0610512f388b12fb85b04316f0a25465ddfb6618ea9`. Preparação intuitiva sobre M02B; 0.2.4 preservado em `Backups/pre-M03A-20261026` nos arquivos de entrega do proprietário, com mesmo certificado. Build com alterações não commitadas declaradas; blobs e testes no [relatório](../../experiments/M03A-intuitive-preparation/README.md). Entregue no destino habitual, sem instalação física desta rodada, merge ou push. Identidade e schema do save preservados.

**M02B — 26/10/2026:** APK de teste **0.2.4/código 6**, 12.130.785 bytes, SHA-256 `460634f125cdd4f027457967043499085f499080b0bbca450e3fee51c26a659c`, entregue nos destinos existentes. Base `d332233` + alterações M02B não commitadas declaradas no `BUILD-INFO`; somente seleção de categorias e apresentação local dos painéis da Loja, preservando cards/economia/save. 0.2.3 foi preservado antes da substituição; certificado permanece igual. [Comparação, provas e limites](../../experiments/M02B-shop-categories/README.md). Este APK não foi instalado no Poco nesta missão; sua navegação aguarda avaliação física/humana.

**M02A — 26/10/2026:** APK de teste **0.2.3/código 5**, 12.129.945 bytes, SHA-256 `70a1343076fedbc2762efa157b2d505815a7c11aa5de3b2b4658c5450c8d32b1`, entregue pela mesma infraestrutura. Origem: base `1bcc1ea` + apresentação da Loja M02A, alterações não commitadas declaradas no `BUILD-INFO`. Certificado igual ao 0.2.2 e versão anterior preservada antes da substituição. Identidade, origem local, assets offline, save e transações preservados; sem instalação/teste físico deste APK. [Relatório, cópias e limites](../../experiments/M02A-shop-essential/README.md#apk-entregue-e-preservação). A rodada Codex 08 abaixo é histórica e mantém seu próprio envelope.

**Instalação posterior no Poco (26/10/2026):** atualização autorizada 0.2.2→0.2.3 por `adb install -r` e abertura aprovadas; os nove arquivos de Local Storage permaneceram idênticos durante a instalação, com backup privado prévio. [Detalhes e limites](../../experiments/M02A-shop-essential/README.md#atualização-posterior-no-poco--26102026). A nova Loja ainda aguarda avaliação de uso no aparelho.

**Operação Codex 08 (25/10/2026): `PASS` no envelope funcional testado; candidata à avaliação humana.** Branch isolada `codex/mobile-core-review-v1`, base `78945e0de9d7a70d14994e80a14b2885998ec9ec` + working tree revisado. O APK atual **0.2.2/código 4** tem **12.129.669 bytes**, SHA-256 `d528b890f9f83a2299f105874084bf8e7f8717e5c86a5cf920b74a393fc40f56`. Checks/builds e assinatura passaram; AVD tem nove casos PASS; Poco tem prova limitada de reinstalação/restauração/navegação. Detalhes na seção [Rodada 0.2.2](#rodada-022--operação-codex-08) e no [registro Codex 08](../../.project-intelligence/experiments/CODEX08-review.md). Não implica aprovação de governança/produção nem comprova áudio, desempenho sustentado ou primeiro frame da Revelação. Publicação autorizada exclusivamente para `codex/mobile-core-review-v1`; conferir seu HEAD remoto ao retomar.

**Rodada histórica inicial:** 23–24/10/2026. **Branch:** `codex/android-apk-delivery`. **Base:** `c2b1883038332f3572e7135824116852b328c56a`. As seções até "Rodada 0.2.1" descrevem essa entrega inicial 0.1.0; números, APKs e provas de rodadas diferentes não são intercambiáveis. A receita continua comum, executada no worktree da rodada em questão.

## Escopo e fontes

O APK empacota o [`GameApp`](../../src/game/GameApp.tsx) real em um bundle Vite estático, `dist-mobile`, servido localmente pelo Capacitor em `https://localhost/`. O manifesto-fonte do app não solicita permissões. No APK final, não há permissões de internet ou recursos do aparelho; existe apenas `com.projetofio.fioforja.DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION`, permissão interna de assinatura (`signature`) gerada pelo AndroidX para proteger receivers. A configuração está em [`capacitor.config.ts`](../../capacitor.config.ts) e [`vite.mobile.config.ts`](../../vite.mobile.config.ts); a composição do build está em [`build-mobile.mjs`](../../scripts/build-mobile.mjs) e [`build-apk.mjs`](../../scripts/build-apk.mjs).

A tela inicial oferece “Visual da lâmina”: Clássico ou Weapon DNA experimental. O seletor usa o adaptador existente, mantém `legacy` como padrão e não altera a mecânica. Permanecem válidos o contrato de [Weapon Visual DNA](weapon-visual-dna.md), a [Persistência v5](save-persistence-v5.md), as [Invariantes](../INVARIANTS.md) e as fontes de produto listadas no [mapa](../AI-START-HERE.md).

A [integração Codex 05](../../experiments/M03-cross-agent-integration/README.md) e seus resultados são baseline histórico. A compilação e os percursos Android desta rodada são evidência separada.

## Identidade e ferramentas

| Item | Configuração da entrega inicial 0.1.0 |
|---|---|
| Pacote | `com.projetofio.fioforja` |
| Versão | `0.1.0`, código `1`, assinatura debug |
| Capacitor | `core`, `android` e `cli` `8.5.3`; plugin `app` `8.1.2` |
| Android | `minSdk 24`, `compileSdk 36`, `targetSdk 36` |
| Build nativo | AGP `8.13.0`, Gradle `8.14.3`; build-tools `35`/`36` disponíveis localmente |
| JDK | Java **21** estrito; Temurin `21.0.12.1+1` em `%LOCALAPPDATA%\Programs\FioForja\jdk-21` |
| SDK | `%LOCALAPPDATA%\Android\Sdk`, plataforma API 36 |

O script seleciona um JDK 21 com `java` e `javac`; aceita `FIOFORJA_JDK_HOME` e procura a instalação local. Define Java/SDK somente para os processos do build. Java 17 e Java 25 não são substitutos aceitos por esta receita. O SDK pode ser selecionado por `ANDROID_SDK_ROOT` ou `ANDROID_HOME`.

## Construir e entregar

Com as dependências do lockfile e as ferramentas acima disponíveis, execute no PowerShell:

```powershell
Set-Location -LiteralPath 'C:\Users\phped\.codex\worktrees\android-apk-delivery\FioForja'
npm.cmd run apk
```

Nenhuma variável global é alterada. `npm run apk` constrói `dist-mobile`, copia os **11 assets de arte exigidos**, sincroniza o projeto Android e executa `assembleDebug`. Antes de entregar, usa `aapt` para verificar pacote, versão, rótulo `FioForja`, `minSdk 24`, `targetSdk 36` e a lista exclusiva da permissão interna de assinatura AndroidX. Também verifica a presença dos assets e a assinatura com `apksigner`.

São produzidos quatro artefatos; a lista abaixo usa o nome da rodada inicial. A cópia identificada de cada nova rodada acompanha a versão efetiva do pacote:

- `FioForja-teste.apk`;
- `FioForja-debug-v0.1.0.apk`;
- `BUILD-INFO.txt`;
- `COMO-INSTALAR.txt`.

| Destino | Papel |
|---|---|
| `C:\Users\phped\.codex\worktrees\android-apk-delivery\FioForja\APK` | Saída do worktree que executa o build |
| `C:\Users\phped\Projetos\FioForja\FioForja\APK` | Exportação automática para o checkout principal descoberto por `git worktree list` |
| `C:\Users\phped\Documents\FioForja\APK` | Entrega automática exigida pela missão; no Windows usa a pasta `Documents\FioForja\APK` do usuário |

A mudança da raiz principal e o build isolado motivaram a descoberta automática do checkout principal. Uma consulta consultiva ao Kev favoreceu `primary_auto` com peso `0.3294`; esse ranking não é prova. O requisito humano também exige o destino em `Documents`, por isso ambos são automáticos, sem depender de uma variável por sessão. `FIOFORJA_APK_EXPORT_DIR` permite acrescentar outro destino. Somente os quatro artefatos são exportados.

`BUILD-INFO.txt` é o registro de cada execução: HEAD Git, presença de alterações não commitadas, tamanho, SHA-256 e diretórios de entrega. O hash do APK não é fixado nesta especificação. O arquivo no worktree, sozinho, não comprova entrega nos outros destinos. Artefatos e chaves não devem ser versionados.

## Save e atualização

O Android mantém seu próprio `localStorage`, separado do navegador do computador. Usa as chaves existentes `a-forja-save` e `a-forja-save-backup`; o empacotamento não implementa transferência do save entre esses ambientes.

Atualize instalando o APK por cima da versão anterior com o mesmo app ID e assinatura. Preserve também a origem `https://localhost/` para continuidade do storage. A chave debug local padrão fica em `%USERPROFILE%\.android\debug.keystore`: mantenha essa chave fora do Git e não a substitua entre builds destinados à atualização da mesma instalação. Não desinstale o aplicativo nem limpe seus dados para preservar o progresso local.

O contrato herdado recupera o último checkpoint confirmado; não promete preservar frames não confirmados. Compilar um APK não prova persistência depois de suspensão, encerramento do processo ou atualização. Esses comportamentos exigem observação no Android, sem apagar saves existentes.

## Evidência histórica da rodada inicial 0.1.0

| Verificação | Resultado e envelope |
|---|---|
| `npm test` | **410 encontrados; 403 pass, 7 skip, 0 fail** |
| `npm run typecheck` | Passou, exit 0 confirmado |
| `npm run lint` | **0 erros / 38 avisos** |
| `npm run build` | Build web de produção passou; migração pulada explicitamente porque `DATABASE_URL` estava ausente |
| APK debug | Compilado; **12.101.397 bytes** na compilação registrada; assinatura válida |
| AVD | Instalado em `FioForja_API36_APK`, Android 16/API 36, `x86_64` |
| Abertura | Tela inicial abriu com assets locais; toque via `adb` iniciou `DesignScreen` |

`npm audit` identifica avisos altos em Vite e zod herdados do lockfile; nenhuma versão preexistente foi alterada nesta entrega. Há avisos moderados novos na cadeia CLI/xcode/uuid de tooling iOS não usado pelo APK. Isso não constitui uma aprovação geral das dependências. Correção de dependências e `npm audit fix` ficam fora desta missão.

## Validação histórica do APK inicial no emulador

**STATUS = APK_READY**, limitado ao APK entregue e ao AVD Android 16/API 36 `x86_64`. A rodada `2026-10-24T18-23-16-188Z-21288` passou os **dez casos**: modo avião; título e seletor DNA; forja/têmpera/claim/Arsenal; save após force-stop; comparação Clássico/DNA sem alterar os dados; dois golpes reais numa nova tentativa; Back minimiza e retorna; Home e retorno; modal de recuperação com checkpoint de dois golpes; conclusão da forja retomada. Nenhuma exceção JavaScript foi observada no intervalo monitorado. Os rádios foram restaurados ao estado anterior `0/1/1`.

O harness [`android-proof.mjs`](../../scripts/android-proof.mjs) reaproveita o percurso de prova M03, recusa aparelhos que não sejam emuladores e usa toques nativos ADB com leitura CDP de HUD/save. Não apaga dados, não injeta fixtures e não chama transações diretamente. Com o APK já instalado no AVD dedicado:

```powershell
node scripts/android-proof.mjs --run --serial emulator-5556 --webview-bounds 0,136,1080,2337
```

Os limites acima foram observados por UIAutomator nesta configuração e validados contra viewport/DPR. Não reutilizá-los para outra configuração sem observação. Sem o argumento, o harness tenta obter os limites pelo UIAutomator.

Relatório, logs, snapshots e screenshots nativos estão em `APK/evidence/2026-10-24T18-23-16-188Z-21288`, preservados também nos dois destinos de entrega. SHA-256 do `report.json`: `5029673a184ee443bc7bb522b62be3ee14f30f9ed77dedabeed9a53eabec6a79`. O APK testado e as cópias entregues têm SHA-256 `d9b7825342a2bc08bd65924bda4f193278d8485d27d9826d25e4ac86914d8b97`, **12.101.397 bytes**. Não são versionados os binários, saves sintéticos e capturas.

Medições desta rodada: Activity `TotalTime` **1.856 / 1.544 / 1.252 ms**, do comando até título pronto **2.834 / 2.316 / 1.891 ms**. PSS observado: título **116.698 KiB**, forja **124.690 KiB**, Arsenal final **137.954 KiB**. Amostra de 60 intervalos rAF no título: média **16,665 ms**, p95 **16,7 ms**. Isso mede agendamento no emulador, não latência física de golpe nem fluidez sustentada. Web Audio apresentou contexto `running`, 48 kHz; o emulador foi iniciado com `-no-audio`, portanto audibilidade permanece não comprovada.

### Falhas preservadas e limites

- Primeiras tentativas falharam no driver: comparação de texto transformado, toque CDP ineficaz, timeout de UIAutomator e latência de comandos DOWN/UP separados. Corrigiu-se o harness, sem mudar a física. O driver final usa um único gesto ADB temporizado para carga/têmpera.
- A rodada de 23/10 terminou em APPCRASH de `qemu-system-x86_64-headless.exe`, exceção `0xc0000005`, relatório Windows `5d6eb934-ed71-478a-b7bc-a9fc13f90c85`. A espada persistiu, mas o claim observado imediatamente antes da falha do host não reapareceu após o reboot. A causa interna e a durabilidade contra falha do host são **UNKNOWN / NOT_PROVEN**. A continuação que exigia esse claim falhou corretamente e seu relatório foi preservado.
- A rodada completa de 24/10 usou GPU host AMD RX 6600 XT, preservando userdata; o backend foi confirmado nos logs. Isso não demonstra que a GPU causou ou resolveu o crash anterior. Save após force-stop Android passou; não se generaliza para desligamento abrupto do computador.
- A captura antiga `first-arsenal` da rodada interrompida mostrava um frame anterior de recompensas apesar do DOM já estar na galeria. Não é evidência visual da galeria. As capturas Clássico/DNA da rodada final mostram efetivamente a galeria.
- **NOT_PROVEN ao encerrar a rodada inicial:** instalação e execução no Poco, API/ABI efetivamente instaladas nesse aparelho, desempenho térmico/sustentado, latência e toque físicos, audibilidade, atualização entre versões distintas, migração de save desktop e confiabilidade em todos os dispositivos. Nenhum telefone estava conectado. Instalação e abertura posteriores da versão inicial no Poco foram relatadas no estado do projeto; isso não valida o APK integrado 0.2.1. Os ícones/splash nativos permanecem os padrões do template.

Próximo passo daquela rodada: copiar `FioForja-teste.apk` ao Poco, instalar e avaliar toque, som e fluidez. Não houve merge, push ou mudança de `main` naquela entrega; publicação posterior deve ser atribuída à sua própria rodada.


---

## Rodada 0.2.1 — Operação Codex 07 (integração mobile core)

**Branch:** `codex/mobile-core-integration-v1`. **Commit empacotado:** `2db89fd59cc968387a5ee46e4da11750431472ee`. **Data:** 24/10/2026.

O APK 0.2.1 contém a interface integrada: Início, Coleção, Forja, Loja e Craft sobre o mesmo save, com a barra inferior ausente durante a fabricação. A receita, a identidade e os destinos não mudaram.

| Item | 0.2.1 |
|---|---|
| Pacote | `com.projetofio.fioforja` (inalterado) |
| Versão | `0.2.1`, código **3** |
| Android | `minSdk 24`, `targetSdk 36` (inalterado) |
| Assinatura | debug local, verificada por `apksigner` |
| Tamanho | **12.128.406 bytes** |
| SHA-256 | `02e7ec2b01badbd848adf4212fc9e2a9abf2ce57aacd093747220cfbd0e8be8d` |
| `BUILD-INFO` | HEAD `2db89fd`, sem alterações não commitadas |
| Cópia identificada | `APK/FioForja-debug-v0.2.1.apk` |
| Destinos | worktree, checkout principal e `C:\Users\phped\Documents\FioForja\APK` |

**Preservação das versões anteriores:** os artefatos 0.1.0 foram copiados para `C:\Users\phped\Documents\FioForja\APK\Backups\pre-mobile-core-2026-10-24\` (APK `4285d300…`, 12.336.603 bytes, HEAD `da46757` com alterações não commitadas). O build intermediário 0.2.0 (`637aef70…`, código 2) foi substituído pelo 0.2.1 durante a validação, após um defeito de prévia da Forja ser encontrado e corrigido. Nenhum binário anterior foi apagado.

**Instalação por cima:** mesmo `applicationId`, mesma chave debug e mesma origem `https://localhost/`. `versionCode` subiu 1 → 2 → 3 durante a rodada; a instalação `adb install -r` preservou o save Android existente (4 armas forjadas, melhor Q93, 1.632 ouro, 7 ferro, 4 aço, 5 peças) nas duas atualizações.

**Validação Android desta rodada — `[PARTIAL]`:** o AVD `FioForja_API36_APK` (1080×2400, 420 dpi, Android 16/API 36) instalou o APK por cima, abriu o jogo, exibiu as cinco seções, navegou por Loja/Coleção/Forja/Craft, respondeu ao Voltar físico, sobreviveu a force-stop + relançamento e abriu em modo avião após o cold start. A prévia da Forja, que ficava em branco por desenhar com a aba oculta, foi corrigida em 0.2.1 e verificada no AVD. Compras, fusão e conclusão de forja **não** foram repetidas no APK 0.2.1; estão provadas por testes transacionais e pelo percurso de navegador. O teste físico no Poco continua pendente por ausência de aparelho em ADB.

**Limite de ambiente:** o emulador encerrou sozinho uma vez (exit 1) após a instalação final, sem mensagem de falha do app; a mesma rodada já havia capturado a tela inicial com o save preservado. Reinícios anteriores passaram. Não atribuir o encerramento ao aplicativo sem reprodução.

**Mudanças funcionais no bundle:** cinco seções; Loja transacional; instalação de componentes; fusão com mesma raridade; núcleo persistido; Craft 2×2; saída segura da forja; prévia da Forja resiliente à visibilidade. O HUD e a cena da bigorna são os mesmos da frente Antigravity. Nenhuma permissão nova foi adicionada.

## Rodada 0.2.2 — Operação Codex 08

| Item | Candidato testado |
|---|---|
| Pacote | `com.projetofio.fioforja` |
| Versão | **0.2.2**, código **4** |
| Fonte | Base `78945e0` + working tree revisado; `BUILD-INFO` registra alterações não commitadas **YES** |
| Tamanho | **12.129.669 bytes** |
| SHA-256 | `d528b890f9f83a2299f105874084bf8e7f8717e5c86a5cf920b74a393fc40f56` |
| Build/assinatura | `npm run apk` PASS; assinatura `apksigner` verificada |
| Entrega | `C:\Users\phped\Documents\FioForja\APK\FioForja-teste.apk` e `FioForja-debug-v0.2.2.apk`, além dos destinos automáticos da receita |
| Versão anterior | 0.2.1 preservada na cópia por versão e em `APK/Arquivo-Codex08/FioForja-v0.2.1-code3.apk`, SHA-256 `02e7ec2b01badbd848adf4212fc9e2a9abf2ce57aacd093747220cfbd0e8be8d`; APK físico 0.1.0 tem backup prévio |

O APK não é apresentado como build de HEAD limpo. Typecheck PASS; lint **0 erros/38 avisos**; build web e mobile PASS. `db:migrate` foi explicitamente pulado por `DATABASE_URL` ausente, com fallback PGLite, sem migração de banco remoto. `npm test`: **475 encontrados/468 PASS/7 SKIP/0 FAIL**. Os quatro percursos UI e os 72 outputs econômicos da revisão independente estão fora desse total.

**AVD — [nove casos PASS](../../experiments/CODEX08-review/android-summary.json):** Android 16/API 36 x86_64, `emulator-5556`, viewport **412×839 CSS/DPR 2,625**. A atualização **0.2.1→0.2.2 por cima** preservou os dados sem limpar o app. O percurso usa fixture sintética explícita de quatro Raras e, depois dela, somente entradas nativas ADB e leitura CDP: comprar aço/catalisador/duas guardas, instalar e trocar (DEF 185→193→195, devolução da anterior), fundir em núcleo Épico consumindo um catalisador, reabrir, forjar com oito golpes e têmpera 98, produzir espada Épica Q75, consumir núcleo na conclusão e reabrir preservando o estado relevante. Recompensas foram geradas e persistidas, **não coletadas**. O resumo reúne etapas confirmadas, preservadas após reparos do driver e interrupção de coordenação, sem refazer o percurso inteiro.

**Poco — [reinstalação/restauração e navegação PASS](../../experiments/CODEX08-review/poco-summary.json):** o proprietário confirmou a desinstalação do app original e autorizou reinstalar. O snapshot anterior à remoção foi restaurado e comparado na escrita, SHA-256 `387b58558af9e0c3576966751b0917f605b4afc82778de2546b2706cdd7a2f24`. Uma nova forja local foi observada antes da leitura de navegação (carreira 2→3, aço 2→1), com ator não atribuído; não houve segunda restauração. O baseline subsequente `66c14a7bbb4ea0a08054b40dadea1c92d4e4ea4278b8977d8fecc28e5250a4be` ficou igual após cinco seções, Voltar e force-stop/relançamento, em **392×819 CSS/DPR 2,75**. Não houve fixture, compra ou fusão desta prova no Poco. **Não é prova de atualização por cima no aparelho físico.**

**Limites/scars:** a captura imediata `07-weapon-reveal.png` mostra canvas vazio, sem isolar timing de captura versus desenho (`NOT_PROVEN`); `08-persisted-inspection.png`, após reabrir, mostra a arma inteira. Áudio físico, desempenho sustentado, progressão/balanceamento de longo prazo e aceitação humana continuam fora do comprovado. A normalização da Loja foi preservada; a validação de fusão verifica receita possível, não autentica o sorteio original nem oferece proteção geral contra edição do save. Os JSONs de evidência não foram reescritos.
