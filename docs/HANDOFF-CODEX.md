# Handoff — integração e APK Android experimental

## Estado após a Operação Codex 07 (24/10/2026)

- **Branch publicada:** `codex/mobile-core-integration-v1` (commits de código `6a640d4` → `2db89fd`), base `da46757` (cadeia: `0663f4e → c2b1883 → 41d7222 → cca050e → 82a9fd3 → da46757`).
- **Interface integrada:** Início, Coleção, Forja, Loja e Craft no `GameApp` real; barra inferior fixa fora da forja e oculta dentro dela; Voltar com histórico e diálogo de saída segura.
- **Loja:** `src/game/shop.ts` é o catálogo único; `executeShopPurchaseTransaction` valida ID, tipo, preço, quantidade e moeda; falha de storage não entrega item.
- **Coleção:** inspeção por ID, comparação, proteção (`favorite` aditivo) e instalação/troca via `executeComponentInstallTransaction`.
- **Craft:** mesma raridade exigida no seletor, em `fuseSwords` e em `validateSwordFusionTransaction`; núcleos antigos preservados.
- **Núcleo → Forja:** "Forjar agora" abre a preparação com identidade travada; material reservado no início; núcleo consumido na conclusão.
- **APK 0.2.1:** `com.projetofio.fioforja`, código 3, 12.128.406 bytes, SHA-256 `02e7ec2b01badbd848adf4212fc9e2a9abf2ce57aacd093747220cfbd0e8be8d`, HEAD `2db89fd`. Instalado por cima de 0.1.0/0.2.0 no AVD com o save preservado. Versão 0.1.0 anterior guardada em `Documents\FioForja\APK\Backups\pre-mobile-core-2026-10-24`.
- **Verificação:** 231/231 testes, typecheck 0, lint 0 erros, build web 0; percurso de navegador documentado em [`experiments/mobile-core-integration`](../experiments/mobile-core-integration/README.md).
- **Próximo passo:** instalar o APK por cima no Poco, validar toque, áreas seguras, Voltar, persistência e áudio; revisar visualmente o HUD da bigorna (truncamento em 392 px) com a frente Antigravity.

## Próximo trabalho de interface — Codex e Antigravity

Consultar [FIOFORJA-MOBILE-UX-001](DECISIONS.md#fioforja-mobile-ux-001) antes de alterar navegação ou composição. A arquitetura foi aprovada pelo proprietário em 24/10/2026; existe um [protótipo separado](../experiments/mobile-ux-v1/README.md), ainda sem aprovação humana ou integração ao jogo. Não reabrir a escolha entre barra fixa e saguão sem nova evidência ou decisão humana.

O recorte navegável de preparação, fabricação e coleção está em `experiments/mobile-ux-v1/`, branch `codex/mobile-ux-prototype-v1`. Foi observado no Poco a 392×819 CSS/DPR 2,75, com barra ausente na fabricação e coleção paginada. O companion `com.projetofio.fioforja.prototype` está separado do app real. Colher avaliação humana antes de reconstruir as demais telas; preservar física, economia, persistência e experimentos. Receita, evidências e limitações estão no relatório do recorte e na decisão canônica.

## Recuperação curta

1. Comece pelo [mapa](AI-START-HERE.md) e pelo [estado atual](PROJECT-STATE.md).
2. Confira branch/HEAD/status reais. A entrega Android de 24/10/2026 está em `codex/android-apk-delivery`, base `c2b1883`, no worktree `C:\Users\phped\.codex\worktrees\android-apk-delivery\FioForja`.
3. Leia a [especificação do APK](specs/android-apk.md): comando único, ferramentas locais, identidade, save, destinos e dez casos Android aprovados no emulador. O checkout principal atual é `C:\Users\phped\Projetos\FioForja\FioForja`; a entrega adicional solicitada é `C:\Users\phped\Documents\FioForja\APK`.
4. A integração histórica `codex/cross-agent-integration-v1`, baseada em `0663f4e5` com doador `a2fa0025`, tem rastreabilidade e evidência no [relatório Codex 05](../experiments/M03-cross-agent-integration/README.md). Não atribua seus resultados à validação Android.
5. O [handoff DeepSeek](HANDOFF-DEEPSEEK-WEAPON-DNA.md) e o [laboratório M02](../experiments/M02-weapon-dna/README.md) são históricos, com PNGs/build originais preservados.

## Empacotamento Android atual

- `npm run apk` constrói o bundle estático do `GameApp`, sincroniza Capacitor, compila e valida o APK debug, e exporta os quatro artefatos para o worktree e o checkout principal descoberto por `git worktree list`. O destino solicitado em `Documents` também é automático; `FIOFORJA_APK_EXPORT_DIR` acrescenta outro destino. O APK não tem permissões de internet ou recursos do aparelho; contém apenas a permissão interna de assinatura AndroidX.
- Use Java 21 local; o script encontra `%LOCALAPPDATA%\Programs\FioForja\jdk-21` ou aceita `FIOFORJA_JDK_HOME`. Não é necessário alterar variáveis globais.
- O save do Android é separado do navegador do computador. Para atualizar preservando progresso, mantenha app ID, origem WebView e chave debug local; não desinstale nem limpe dados. Não versione a chave.
- A tela inicial oferece “Visual da lâmina” para Clássico/DNA experimental. A preferência usa o adaptador existente; mecânica e padrão legado são preservados.
- Build, assinatura, instalação, abertura offline, forja/têmpera/claim, Arsenal, Clássico/DNA, save após force-stop, Back/Home e recuperação/conclusão de forja interrompida passaram no AVD dedicado. Evidências em `APK/evidence/2026-10-24T18-23-16-188Z-21288`. Os quatro artefatos finais foram copiados e o hash do APK foi confirmado nos três destinos. Instalação e abertura posteriores no Poco foram confirmadas; validação física completa e áudio físico permanecem `NOT_PROVEN`.
- Uma rodada anterior falhou por APPCRASH do QEMU; o último claim não sobreviveu à falha do host, embora a espada tenha persistido. A rodada completa seguinte passou com GPU host. Não atribuir causalidade à GPU nem afirmar durabilidade contra falha do host.

## Contratos herdados da integração Codex 05

- `transactions.ts`: início, checkpoint físico, finalização e claim persistem antes de avançar o estado econômico. Um golpe usa `forgeRunId:sequência`; replay não paga novamente. APIs antigas de callback foram mantidas como rejeição explícita.
- `sim.ts`: snapshot físico versão 1 e relógio acumulado. Nenhum RNG físico oculto foi encontrado no stepping atual; o estado determinante é preservado. Partículas/áudio ficam fora do snapshot.
- `ForgeCanvas.tsx`: checkpoint em golpe, fase, ferramenta/zona, intervalos de 0,75 s ativos e `pagehide`. Erro de escrita pausa e repete o mesmo checkpoint. Não promete continuidade entre frames não confirmados.
- Núcleo continua **4 espadas → núcleo → forja manual → arma final**. O metal é reservado no início; o núcleo é consumido no fim. Treino ignora núcleo e usa ferro canônico.
- Auxílio de treino: ver política exata em `needsTrainingRecovery`; cancelamento de treino é zero sucata. A rota de recuperação continua disponível ao falido.
- Weapon DNA: `?weaponRender=dna`; `?weaponRender=legacy` ganha de storage `dna`. Sem opção válida, legado. Miniaturas estáticas usam pixels cacheados; inspeção conserva luz interativa. A bigorna conserva seu renderizador.
- Instalação altera só montagem pertinente e proveniência; não recria semente da lâmina. O seed experimental corrigido muda imagens em relação ao DeepSeek; não é migração de save.

## Verificações da integração: retomar somente se o estado relevante mudar

```powershell
npm.cmd test
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run build
node experiments/M03-cross-agent-integration/browser-proof.mjs --run --serve --port 8947
node experiments/M03-cross-agent-integration/visual-proof.mjs
```

Os harnesses usam contextos Chromium descartáveis, dependências existentes e evidências em M03. `--preflight` verifica preparação sem alegar execução. O comparador visual exige build do doador exato; veja o protocolo no relatório para reconstruí-lo em outro ambiente. Aceita `--donor-root=CAMINHO` caso o diretório temporário padrão não exista. Não apague saves/perfis existentes.

## Continuidade e autoridade

- Não fazer merge em `main` nem mudar o padrão visual sem autorização humana.
- Preservar branches e experimentos anteriores; não fazer force push.
- Não iniciar minigame, monetização, nova arquitetura de memória ou outra campanha como parte desta entrega.
- Próximo passo: instalar o APK entregue no Poco e realizar a validação física de toque, som e fluidez. A prova do emulador já está congelada para o código e envelope registrados na [especificação do APK](specs/android-apk.md); repetir somente diante de mudança relevante.
- A revisão humana das três comparações visuais da integração Codex 05 e o balanceamento longo continuam decisões próprias, ainda não provadas pelo empacotamento.
