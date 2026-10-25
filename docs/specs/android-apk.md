# APK Android experimental

**Rodada:** 23–24/10/2026. **Branch:** `codex/android-apk-delivery`. **Base:** `c2b1883038332f3572e7135824116852b328c56a`.

## Escopo e fontes

O APK empacota o [`GameApp`](../../src/game/GameApp.tsx) real em um bundle Vite estático, `dist-mobile`, servido localmente pelo Capacitor em `https://localhost/`. O manifesto-fonte do app não solicita permissões. No APK final, não há permissões de internet ou recursos do aparelho; existe apenas `com.projetofio.fioforja.DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION`, permissão interna de assinatura (`signature`) gerada pelo AndroidX para proteger receivers. A configuração está em [`capacitor.config.ts`](../../capacitor.config.ts) e [`vite.mobile.config.ts`](../../vite.mobile.config.ts); a composição do build está em [`build-mobile.mjs`](../../scripts/build-mobile.mjs) e [`build-apk.mjs`](../../scripts/build-apk.mjs).

A tela inicial oferece “Visual da lâmina”: Clássico ou Weapon DNA experimental. O seletor usa o adaptador existente, mantém `legacy` como padrão e não altera a mecânica. Permanecem válidos o contrato de [Weapon Visual DNA](weapon-visual-dna.md), a [Persistência v5](save-persistence-v5.md), as [Invariantes](../INVARIANTS.md) e as fontes de produto listadas no [mapa](../AI-START-HERE.md).

A [integração Codex 05](../../experiments/M03-cross-agent-integration/README.md) e seus resultados são baseline histórico. A compilação e os percursos Android desta rodada são evidência separada.

## Identidade e ferramentas

| Item | Configuração desta entrega |
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

São produzidos quatro artefatos:

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

## Evidência registrada nesta rodada

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

## Validação Android concluída no emulador

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
- **NOT_PROVEN:** instalação e execução no Poco, API/ABI efetivamente instaladas nesse aparelho, desempenho térmico/sustentado, latência e toque físicos, audibilidade, atualização entre versões distintas, migração de save desktop e confiabilidade em todos os dispositivos. Nenhum telefone estava conectado. Os ícones/splash nativos permanecem os padrões do template.

Próximo passo: copiar `FioForja-teste.apk` ao Poco, instalar e avaliar toque, som e fluidez. Não há merge, push ou mudança de `main` nesta entrega.


---

## Rodada 0.2.0 — Operação Codex 07 (integração mobile core)

**Branch:** `codex/mobile-core-integration-v1`. **Commit empacotado:** `6a640d4a0e8094b62a0ab25290db210b32a27d16`. **Data:** 24/10/2026.

O APK 0.2.0 contém a interface integrada: Início, Coleção, Forja, Loja e Craft sobre o mesmo save, com a barra inferior ausente durante a fabricação. A receita, a identidade e os destinos não mudaram.

| Item | 0.2.0 |
|---|---|
| Pacote | `com.projetofio.fioforja` (inalterado) |
| Versão | `0.2.0`, código **2** |
| Android | `minSdk 24`, `targetSdk 36` (inalterado) |
| Assinatura | debug local, verificada por `apksigner` |
| Tamanho | **12.128.161 bytes** |
| SHA-256 | `637aef70dfe11e46fe04803ef2cd3172000b7916f73bab90390ef37b84b32ace` |
| `BUILD-INFO` | HEAD `6a640d4`, sem alterações não commitadas |
| Cópia identificada | `APK/FioForja-debug-v0.2.0.apk` |
| Destinos | worktree, checkout principal e `C:\Users\phped\Documents\FioForja\APK` |

**Preservação da versão anterior:** antes do rebuild, os artefatos 0.1.0 foram copiados para `C:\Users\phped\Documents\FioForja\APK\Backups\pre-mobile-core-2026-10-24\` (APK `4285d300…`, 12.336.603 bytes, HEAD `da46757` com alterações não commitadas). O binário anterior não foi apagado do histórico de entrega.

**Instalação por cima:** mesmo `applicationId`, mesma chave debug e mesma origem `https://localhost/`. `versionCode` subiu de 1 para 2, o que permite atualização sem desinstalar. O save Android anterior permanece no WebView `localStorage`.

**Validação desta rodada:** `[PARTIAL]`. A compilação, a verificação de identidade/assinatura/permissões/assets e a exportação para os três destinos passaram. A instalação/abertura no AVD e o teste físico no Poco estão registrados na seção seguinte quando executados. Não declarar validação no aparelho sem essa observação.

**Mudanças funcionais no bundle:** cinco seções; Loja transacional; instalação de componentes; fusão com mesma raridade; núcleo persistido; Craft 2×2; saída segura da forja. O HUD e a cena da bigorna são os mesmos da frente Antigravity. Nenhuma permissão nova foi adicionada.
