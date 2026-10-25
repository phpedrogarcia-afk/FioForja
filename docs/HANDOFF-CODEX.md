# Handoff — integração e APK Android experimental

## Operação Codex 08 — PASS no envelope funcional testado (25/10/2026)

Revisão isolada em `codex/mobile-core-review-v1`, base `78945e0de9d7a70d14994e80a14b2885998ec9ec`, no worktree `C:\Users\phped\.codex\worktrees\mobile-core-review-v1\FioForja`. A auditoria distinguiu os dois runs de navegador e corrigiu a descrição de `231` como subtotal TypeScript. O [registro Codex 08](../.project-intelligence/experiments/CODEX08-review.md) concentra fatos, limites e resultados novos. Preservar a WIP anterior no checkout original e o snapshot `5f71ba4`.

- **Software verificado:** `npm test` 475 encontrados = JS 203 (196 PASS/7 SKIP) + TS 272 (272 PASS); total **468 PASS/7 SKIP/0 FAIL**. As 41 regressões novas preservam todos os testes anteriores. Focal 123 PASS sobreposta; UI adicional **RED 4 → GREEN 4**, fora do total.
- **Mudanças:** impedir ressurreição de candidato recusado pelo backup inicial; reconstruir receita de fusão para validar custo/resultado/herança/fragmentos; equipar ferramentas compradas ou padrão; limitar nove Sheets à seção ativa; escolher arma da encomenda e exibir histórico; compartilhar preço e delta real de refino entre tela e transação. A normalização da Loja já era correta na base: preservada com regressões.
- **Limites:** fusão não autentica sorteio original nem detecta genericamente `usedCatalyst true → false` quando o resultado é possível nos dois cenários. Não há proteção geral contra edição do save. Os quatro percursos UI não substituem prova Android.
- **Checks/builds:** typecheck PASS; lint 0 erros/38 avisos; build web/mobile e APK PASS, assinatura `apksigner` verificada. Migração remota SKIP explícito por `DATABASE_URL` ausente, com fallback PGLite.
- **APK:** 0.2.2/código 4, 12.129.669 bytes, SHA-256 `d528b890f9f83a2299f105874084bf8e7f8717e5c86a5cf920b74a393fc40f56`; entregue em `Documents\FioForja\APK`, cópias `FioForja-teste.apk` e `FioForja-debug-v0.2.2.apk`. Foi construído da base `78945e0` mais o working tree revisado (`BUILD-INFO`: alterações não commitadas YES). O 0.2.1 anterior está preservado, inclusive em `APK/Arquivo-Codex08/FioForja-v0.2.1-code3.apk`.
- **Android:** [AVD, 9 casos PASS](../experiments/CODEX08-review/android-summary.json), atualização 0.2.1→0.2.2 e percurso Loja→montagem/troca→núcleo Épico→forja manual→espada Épica Q75→reabertura, com fixture declarada e recompensas não coletadas. [Poco](../experiments/CODEX08-review/poco-summary.json): reinstalação após desinstalação humana confirmada, restauração do snapshot pré-remoção e navegação/Voltar/force-stop com baseline preservado; sem fixture, compra ou fusão. Não alegar atualização por cima no Poco. Uma nova forja local foi observada antes do baseline de navegação, com ator não atribuído; não se restaurou novamente para apagar progresso.
- **Candidata à avaliação humana:** zero diferenças em 72 outputs econômicos na revisão independente, fora de `npm test`. Não há aprovação geral de governança/produção, áudio físico, desempenho sustentado ou longo prazo. A captura imediata da Revelação tem canvas vazio, com timing versus desenho `NOT_PROVEN`; inspeção após reabrir mostra a arma inteira.
- **Publicação:** autorizada exclusivamente para `codex/mobile-core-review-v1`; conferir o HEAD remoto ao retomar. Nenhum merge em main autorizado.

## Estado após a Operação Codex 07 (24/10/2026)

- **Branch publicada:** `codex/mobile-core-integration-v1` (commits de código `6a640d4` → `2db89fd`), base `da46757` (cadeia: `0663f4e → c2b1883 → 41d7222 → cca050e → 82a9fd3 → da46757`).
- **Interface integrada:** Início, Coleção, Forja, Loja e Craft no `GameApp` real; barra inferior fixa fora da forja e oculta dentro dela; Voltar com histórico e diálogo de saída segura.
- **Loja:** `src/game/shop.ts` é o catálogo único; `executeShopPurchaseTransaction` valida ID, tipo, preço, quantidade e moeda; falha de storage não entrega item.
- **Coleção:** inspeção por ID, comparação, proteção (`favorite` aditivo) e instalação/troca via `executeComponentInstallTransaction`.
- **Craft:** mesma raridade exigida no seletor, em `fuseSwords` e em `validateSwordFusionTransaction`; núcleos antigos preservados.
- **Núcleo → Forja:** "Forjar agora" abre a preparação com identidade travada; material reservado no início; núcleo consumido na conclusão.
- **APK 0.2.1:** `com.projetofio.fioforja`, código 3, 12.128.406 bytes, SHA-256 `02e7ec2b01badbd848adf4212fc9e2a9abf2ce57aacd093747220cfbd0e8be8d`, HEAD `2db89fd`. Instalado por cima de 0.1.0/0.2.0 no AVD com o save preservado. Versão 0.1.0 anterior guardada em `Documents\FioForja\APK\Backups\pre-mobile-core-2026-10-24`.
- **Verificação histórica:** 231/231 no processo TypeScript; não representa o total de `npm test`, que também executa JavaScript. Typecheck 0, lint 0 erros, build web 0; duas execuções de navegador identificadas em [`experiments/mobile-core-integration`](../experiments/mobile-core-integration/README.md).
- **Próximo passo:** instalar o APK por cima no Poco, validar toque, áreas seguras, Voltar, persistência e áudio; revisar visualmente o HUD da bigorna (truncamento em 392 px) com a frente Antigravity.

## Próximo trabalho de interface — Codex e Antigravity

Consultar [FIOFORJA-MOBILE-UX-001](DECISIONS.md#fioforja-mobile-ux-001) antes de alterar navegação ou composição. A arquitetura foi aprovada pelo proprietário em 24/10/2026; o [protótipo separado](../experiments/mobile-ux-v1/README.md) permanece como referência histórica. A integração funcional ocorreu na Operação 07; aprovação visual humana do APK integrado permanece pendente. Não reabrir a escolha entre barra fixa e saguão sem nova evidência ou decisão humana.

O recorte navegável de preparação, fabricação e coleção está em `experiments/mobile-ux-v1/`, branch `codex/mobile-ux-prototype-v1`. Foi observado no Poco a 392×819 CSS/DPR 2,75, com barra ausente na fabricação e coleção paginada. O companion `com.projetofio.fioforja.prototype` está separado do app real; suas capturas não validam o APK integrado. Colher avaliação humana da integração e preservar física, economia, persistência e experimentos. Receita, evidências e limitações estão no relatório do recorte e na decisão canônica.

## Recuperação curta

1. Comece pelo [mapa](AI-START-HERE.md) e pelo [estado atual](PROJECT-STATE.md).
2. Confira branch/HEAD/status reais. A entrega Android de 24/10/2026 está em `codex/android-apk-delivery`, base `c2b1883`, no worktree `C:\Users\phped\.codex\worktrees\android-apk-delivery\FioForja`.
3. Leia a [especificação do APK](specs/android-apk.md): comando único, ferramentas locais, identidade, save, destinos e dez casos Android aprovados no emulador. O checkout principal atual é `C:\Users\phped\Projetos\FioForja\FioForja`; a entrega adicional solicitada é `C:\Users\phped\Documents\FioForja\APK`.
4. A integração histórica `codex/cross-agent-integration-v1`, baseada em `0663f4e5` com doador `a2fa0025`, tem rastreabilidade e evidência no [relatório Codex 05](../experiments/M03-cross-agent-integration/README.md). Não atribua seus resultados à validação Android.
5. O [handoff DeepSeek](HANDOFF-DEEPSEEK-WEAPON-DNA.md) e o [laboratório M02](../experiments/M02-weapon-dna/README.md) são históricos, com PNGs/build originais preservados.

## Receita Android compartilhada e prova histórica inicial

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
- Próximo passo humano: avaliar o candidato 0.2.2 no Poco, especialmente composição, primeiro frame da Revelação, som e fluidez sustentada. As provas da revisão já estão congeladas para o código e os envelopes registrados na [especificação do APK](specs/android-apk.md); repetir somente diante de mudança relevante.
- A revisão humana das três comparações visuais da integração Codex 05 e o balanceamento longo continuam decisões próprias, ainda não provadas pelo empacotamento.
