## Atualização M04A — 28/10/2026
Branch `codex/first-forge-onboarding-m04a`, base `9b09a36` (checkpoint APK 0.2.8). Orientação contextual de aquecimento/martelo/têmpera, marcos persistidos junto dos checkpoints, dispensa persistida e navegação de três fases. [Contrato](specs/forge-onboarding.md), [provas e limitações](../experiments/M04A-first-forge/README.md). Base verificada contém M03A e Coleção M04. Main local `4a1cd01` e remota `3ad7239` divergem do fluxo mobile; ambas preservadas. Frente de movimento `antigravity/forge-motion-v1` em `67ab141` não incorporada.

# Estado do projeto — integração e APK Android experimental

## M03A — Da escolha à bigorna — 27/10/2026

- Branch `codex/forge-preparation-m03a`, base `2ac3cf5` (M03A anterior, M02B incluída). [Evidências e comparação](../experiments/M03A-choice-to-anvil/README.md); [contrato](specs/preparation.md). A frente Antigravity em `67ab141` é separada e não foi integrada.
- Seleção visual por miniaturas, bloqueados sob demanda, ajustes manuais preservados e núcleo com raridade/origem. Campos opcionais `id`/`customizedFields` no design v5 preservam identidade e intenção; projetos identificados simultaneamente por ID e família/perfil precisam cumprir ambos os gates. Economia, limites de metal e transações de consumo preservados.
- 190 testes afetados e 6 de Android/assets PASS; typecheck PASS; lint 0 erros/38 avisos herdados. Clássico e DNA observados em 360/392; 32 combinações geométricas sem extrapolação, sem afirmar cobertura de todos os pixels. Aprovação humana e desempenho sustentado pendentes.
- APK 0.2.7/código 9 instalado por cima no Poco; certificado igual e dez arquivos de Local Storage idênticos antes/depois da instalação, antes de abrir. Prévia e lista visual observadas com dados existentes; nenhuma compra/forja com estoque do proprietário. Backup privado e versões 0.2.5/0.2.6 preservados. Em emulador isolado sem rede, abertura, compra no save de teste e entrada no aquecimento foram observadas; ciclo completo offline não foi testado.
- Nenhuma modificação em câmera, martelo, simulação, Loja, Coleção ou Craft. Sem merge/push.

## M03A — Preparação intuitiva — 26/10/2026

**Atualização física posterior — 27/10/2026:** Poco atualizado de 0.2.3/código 5 para 0.2.5/código 7 por instalação sobreposta; certificado igual e nove arquivos de Local Storage idênticos antes/depois da instalação, antes da abertura. Backup privado dos dados e APK anteriores preservado. Jogo abriu com dados existentes; preparação e listas de projeto/metal foram observadas no aparelho com a espada inteira visível. Avaliação humana, forja com estoque do proprietário, áudio e offline continuam pendentes. Este registro supera apenas a pendência de instalação e observação física indicada no item histórico abaixo. [Detalhes](../experiments/M03A-intuitive-preparation/README.md#atualização-posterior-no-poco--27102026).

- Branch isolada `codex/intuitive-preparation-m03a`, base M02B `653694b`. [Relatório e evidências](../experiments/M03A-intuitive-preparation/README.md); [contrato da preparação](specs/preparation.md).
- Dois controles principais com listas inline, arma inteira fora da rolagem, nove campos opcionais preservados. Miolo essencial comum sem rolagem em 360×800/392×819. Projeto/família mantêm metal explícito; edições gravam `lastDesign` v5. Gates existentes extraídos para uso compartilhado pela tela/transação; thresholds e efeitos preservados.
- 115 testes afetados + 6 de Android/assets PASS; typecheck PASS; lint 0 erros/38 avisos herdados. Navegador comprova retorno da Loja, rascunho/reabertura, bloqueios, entrada na forja e retomada, além do fluxo de núcleo sintético com compra real. Não representa dados/progressão naturais do proprietário.
- APK 0.2.5/código 7: SHA-256 `9fa653bf5b87703fbfbae0610512f388b12fb85b04316f0a25465ddfb6618ea9`, certificado mantido, 0.2.4 em backup. Não instalado nesta rodada. Avaliação visual física, teclado virtual, áreas seguras reais e modo DNA visual permanecem pendentes. `prepCore` anterior ao início continua apenas em memória; reabrir exige selecionar novamente o núcleo preservado no inventário.
- Nenhuma alteração em câmera/martelo/simulação ou nas outras seções. Sem merge/push; trabalho Antigravity preservado.

## M02B — Categorias intuitivas — 26/10/2026

- Branch isolada `codex/shop-categories-m02b`, base M02A `d332233` (contém `bc3f364`). [Relatório comparativo](../experiments/M02B-shop-categories/README.md).
- Escolha técnica B: botão Categorias + painel com oito radios, sem faixa horizontal. Mantém seis materiais inteiros em 360×800/392×819; a alternativa A deixava quatro. Cards, catálogo, IDs, preços, transações e save preservados; única tela alterada `ShopScreen`.
- Feedback humano: cards, nomes e preços da M02A claros/legíveis no Poco. A navegação M02B ainda não tem aprovação visual humana.
- 16 verificações de filtro, compra real de Fehu/catalisador, entrega e reabertura PASS no navegador. Voltar fecha os painéis antes de sair; teclado/Escape/foco verificados. 65 testes afetados + 4 de empacotamento PASS; typecheck PASS; lint 0 erros/38 avisos herdados.
- APK 0.2.4/código 6 entregue, SHA-256 `460634f125cdd4f027457967043499085f499080b0bbca450e3fee51c26a659c`; 0.2.3 preservado, mesmo certificado confirmado. Não instalado no Poco nesta missão. Voltar físico, área segura efetiva e usabilidade M02B no aparelho pendentes. Sem merge/push.

## M02A — Loja Essencial — 26/10/2026

- Branch isolada `codex/shop-essential-m02a`, base funcional Codex 08 `1bcc1ea88ad339df4ce56df45ce2794c18ecf92d`; [relatório e comparação](../experiments/M02A-shop-essential/README.md).
- Única tela alterada: `ShopScreen`. Grade com resumo de identidade, preço e posse; detalhes sob demanda; déficit por moeda substitui “Venda/forje”. Categorias e mecanismos funcionais preservados. Seis materiais inteiros em 392×819 e 360×800, contra cinco/quatro na base.
- 65 testes afetados e quatro de empacotamento PASS; typecheck PASS; lint 0 erros/38 avisos herdados; compra de ferro/Damasco, débito, entrega, bloqueio e reabertura comprovados por UI em save de teste.
- APK 0.2.3/código 5 entregue em `C:\Users\phped\Documents\FioForja\APK`, SHA-256 `70a1343076fedbc2762efa157b2d505815a7c11aa5de3b2b4658c5450c8d32b1`; versão anterior preservada e mesmo certificado confirmado. Sem teste físico desta rodada; atualização com dados em execução e aprovação visual no Poco continuam NOT_PROVEN. M02B não iniciada; sem merge/push.
- **Instalação posterior autorizada, 26/10/2026:** Poco atualizado por cima de 0.2.2 para 0.2.3; nove arquivos de Local Storage idênticos antes/depois da atualização, backup privado preservado e abertura do Início confirmada. Esta prova supera a pendência de instalação/armazenamento durante atualização acima; uso da nova Loja, compras, offline e aprovação visual no Poco continuam pendentes. [Envelope da prova](../experiments/M02A-shop-essential/README.md#atualização-posterior-no-poco--26102026).

## Operação Codex 08 — revisão isolada — 25/10/2026 — PASS no envelope funcional testado

- **Base:** `78945e0de9d7a70d14994e80a14b2885998ec9ec`; branch `codex/mobile-core-review-v1`; worktree `C:\Users\phped\.codex\worktrees\mobile-core-review-v1\FioForja`.
- **Estado Git na abertura:** `main` local em `4a1cd01`, `origin/main` observado em `3ad7239`; branch remota DeepSeek em `78945e0`. Esses pontos não são equivalentes nem foram movidos pela revisão. O trabalho funcional anterior continua no checkout original e no snapshot `5f71ba4`.
- **Auditoria documental:** os JSONs de navegador pertencem a duas execuções distintas; `231` era o subtotal TypeScript, não a suíte completa. Detalhes, escopos e pendências no [registro Codex 08](../.project-intelligence/experiments/CODEX08-review.md).
- **Testes novos confirmados:** `npm test` **475 encontrados / 468 PASS / 7 SKIP / 0 FAIL**: JavaScript 203 (196 PASS/7 SKIP) + TypeScript 272 (272 PASS), com 41 regressões novas e nenhum teste antigo removido. Suíte focal 123 PASS, sobreposta ao total; quatro percursos UI adicionais **RED 4 → GREEN 4**, fora dele.
- **Correções:** primeiro save só publica o candidato no backup após commit primário; fusão valida custo e efeitos por reconstrução de receita possível sem mudar odds; ferramentas podem ser equipadas e restauradas ao padrão; nove Sheets respeitam a seção ativa; encomenda permite escolher a arma e preserva histórico; refino mostra preço e delta efetivos por orçamento compartilhado. Normalização de payload da Loja já era correta: `KEEP` com regressões.
- **Limite de fusão:** não autentica o sorteio original, não detecta toda troca `usedCatalyst true → false` compatível com ambos os cenários e não protege genericamente contra edição manual do save.
- **Checks/builds:** typecheck PASS; lint **0 erros/38 avisos**; web e mobile PASS; `db:migrate` explicitamente SKIP por `DATABASE_URL` ausente, com fallback PGLite, sem migração de banco remoto. APK e assinatura `apksigner` PASS.
- **APK entregue:** `0.2.2`, código `4`, **12.129.669 bytes**, SHA-256 `d528b890f9f83a2299f105874084bf8e7f8717e5c86a5cf920b74a393fc40f56`. Fonte: base `78945e0` + working tree revisado, `BUILD-INFO` com alterações não commitadas `YES`; não é build de HEAD limpo. Cópias em `C:\Users\phped\Documents\FioForja\APK\FioForja-teste.apk` e `FioForja-debug-v0.2.2.apk`; anteriores preservados.
- **AVD:** [nove casos PASS](../experiments/CODEX08-review/android-summary.json), com fixture sintética declarada: atualização 0.2.1→0.2.2 sem limpar dados, compras de aço/catalisador/duas guardas, montagem DEF 185→193→195 e devolução da antiga, quatro Raras→núcleo Épico, forja manual com oito golpes/têmpera 98, espada Épica Q75, núcleo consumido e estado preservado ao reabrir. Recompensas geradas, não coletadas.
- **Poco:** [reinstalação autorizada e restauração](../experiments/CODEX08-review/poco-summary.json) após desinstalação confirmada pelo proprietário; não foi atualização por cima. Snapshot pré-remoção conferido na escrita; nova forja local observada antes do baseline de navegação (ator não atribuído). O baseline subsequente permaneceu igual após cinco seções, Voltar e force-stop/relançamento, 392×819/DPR 2,75. Sem fixture, compra ou fusão nesta prova física.
- **Revisão independente:** 72 outputs econômicos comparados, zero diferenças excluindo IDs/datas; fora do total de `npm test`.
- **Limites:** candidata à avaliação humana, sem aprovação de governança ou produção. Áudio físico, desempenho sustentado e progressão de longo prazo continuam `NOT_PROVEN`. O canvas vazio na captura imediata da Revelação não foi isolado entre timing e desenho; a inspeção após reabrir mostra a arma inteira. Publicação autorizada exclusivamente para `codex/mobile-core-review-v1`; conferir seu HEAD remoto ao retomar. A evidência histórica abaixo mantém seus próprios envelopes.

## Operação Codex 07 — integração mobile core — 24/10/2026

- **Branch publicada:** `codex/mobile-core-integration-v1` (commits `6a640d4` e `2db89fd`), base `da46757` (que contém `41d7222`/`cca050e`/`82a9fd3`).
- **Worktree isolado:** `C:\Users\phped\.codex\worktrees\mobile-core-integration-v1\FioForja`. O checkout principal e as branches de outros agentes não foram movidos nem reescritos.
- **APK:** versão `0.2.1`, código 3, **12.128.406 bytes**, SHA-256 `02e7ec2b01badbd848adf4212fc9e2a9abf2ce57aacd093747220cfbd0e8be8d`, HEAD `2db89fd`, sem alterações não commitadas. Entregue no worktree, no checkout principal e em `C:\Users\phped\Documents\FioForja\APK`. Instalado por cima de 0.1.0/0.2.0 no AVD com save preservado.
- **Interface:** Início, Coleção, Forja, Loja e Craft sobre o mesmo `GameApp`/`SaveData`; barra inferior fixa fora da fabricação e ausente dentro dela; saída segura com confirmação.
- **Loja:** catálogo único em `src/game/shop.ts`; compra valida ID, tipo, preço, quantidade e moeda; guarda, lingote, catalisador e receita chegam ao inventário real.
- **Coleção:** Arsenal real, inspeção, comparação, proteção mínima e instalação/troca de peças com recálculo persistido.
- **Craft:** quatro doadoras da **mesma raridade** (qualidades livres), chances do motor (50/42/8 para Raras), confirmação, núcleo persistido e "Forjar agora" encaminhando à preparação.
- **Núcleo → Forja:** material reservado no início; núcleo consumido apenas na conclusão; herança, raridade e origem preservadas no Arsenal.
- **Provas históricas:** processo TypeScript **231/231**; esse subtotal foi descrito incorretamente como o total de `npm test` e não inclui o processo JavaScript. Typecheck 0, lint 0 erros/39 avisos, build web 0; percurso de navegador em 392×819/DPR 2,75 com compra, instalação, fusão, reload, forja, revelação e novo reload. Relatório e distinção entre as duas execuções em `experiments/mobile-core-integration/`.
- **Android:** cinco seções, Voltar físico, force-stop/relançamento, modo avião e prévia da Forja verificados no AVD 1080×2400/420 dpi. Compras/fusão/forja no APK 0.2.1 não foram repetidas no AVD; estão provadas por 24 testes transacionais e pelo percurso de navegador. Validação física no Poco, áudio físico, desempenho sustentado e HUD da bigorna (frente Antigravity) continuam `NOT_PROVEN`.

## Decisão mobile aprovada — 24/10/2026

- **Autoridade:** [FIOFORJA-MOBILE-UX-001](DECISIONS.md#fioforja-mobile-ux-001), decisão explícita do proprietário após jogar no Poco e fornecer vídeo de 23 segundos.
- **TARGET aprovado:** barra inferior fixa em Início, Coleção, Forja, Loja e Craft; Craft substituiu a quinta seção Jogador por decisão humana posterior. Perfil e carreira ficam no Início/perfil. A barra desaparece durante fabricação; preparação mantém espada inteira visível; fabricação elevada/oblíqua com HUD compacto; orientação térmica clara e Revelação centrada na arma.
- **APK integrado atual:** `0.2.2`, candidato da revisão Codex 08 acima. A rodada Codex 07 entregou `0.2.1`; `0.2.0` foi intermediário. O APK de `41d7222` e o [protótipo separado](../experiments/mobile-ux-v1/README.md) continuam preservados como checkpoints históricos. O companion `FioForja Protótipo` tem outro pacote/UID e não grava o progresso real.
- **OBSERVED no protótipo separado:** três experiências navegáveis no Poco, 1080×2400/440 dpi, WebView 392×819 CSS/DPR 2,75; prévia inteira, fabricação sem barra, coleção paginada, inspeção e comparação. Essa observação não valida o APK integrado.
- **Próximo passo humano:** avaliar o APK integrado no Poco; preservar física, economia e saves ao revisar a composição.
- **NOT_PROVEN:** aceitação visual, solução final de câmera e desempenho sustentado. A integração ao jogo foi implementada na Operação 07; observação física do companion não equivale a aprovação do layout integrado.

## Entrega Android histórica — 24/10/2026

- **Branch experimental:** `codex/android-apk-delivery`; base `c2b1883038332f3572e7135824116852b328c56a`.
- **Worktree da entrega:** `C:\Users\phped\.codex\worktrees\android-apk-delivery\FioForja`.
- **Checkout principal atual:** `C:\Users\phped\Projetos\FioForja\FioForja`. O destino adicional solicitado continua `C:\Users\phped\Documents\FioForja\APK`.
- **Implementação:** Capacitor empacota o `GameApp` real em bundle estático local, sem permissões de internet ou recursos do aparelho; apenas permissão interna de assinatura AndroidX. O seletor da tela inicial oferece Clássico/DNA experimental pelo adaptador existente; legado continua padrão.
- **Evidência atual:** `APK_READY` no envelope de emulador. Dez casos passaram no AVD `FioForja_API36_APK`: offline, toque, forja/têmpera/claim, Arsenal, Clássico/DNA, save após force-stop, Back/Home, recuperação de checkpoint de dois golpes e conclusão da forja retomada. Web Audio estava `running`; audibilidade física não foi testada.
- **Entrega:** os quatro artefatos finais existem no worktree, no checkout principal e no destino adicional em `Documents`. APK de **12.101.397 bytes**, SHA-256 `d9b7825342a2bc08bd65924bda4f193278d8485d27d9826d25e4ac86914d8b97`. `npm run apk` repete o build e a exportação; O destino solicitado em `Documents` também é automático; `FIOFORJA_APK_EXPORT_DIR` acrescenta outro destino.
- **Receita, contagens, metadados e limites:** [APK Android experimental](specs/android-apk.md). `BUILD-INFO.txt` registra HEAD, alterações não commitadas, SHA-256 e destinos de cada build.
- **Aparelho físico — evidência posterior:** instalação e abertura do APK confirmadas em Xiaomi `M2103K19PG`, Android 13/API 33, ABI `arm64-v8a,armeabi-v7a,armeabi`. O vídeo do proprietário mostra uso e problemas de composição; não prova desempenho sustentado nem um ciclo físico completo com save validado. Áudio físico permanece `NOT_PROVEN`. Na consulta desta atualização documental, nenhum aparelho estava acessível por ADB.
- **Scar de ambiente:** uma rodada anterior terminou em APPCRASH nativo do QEMU, com causa interna desconhecida. A rodada completa passou usando GPU host. Não se demonstrou causalidade da GPU nem durabilidade do save contra falha do host; o claim da rodada interrompida não reapareceu após esse reboot. Save após force-stop Android foi comprovado na rodada seguinte.

## Baseline histórico — integração Codex 05

**Data da rodada:** 18/10/2026. **Branch experimental da rodada:** `codex/cross-agent-integration-v1`. Os resultados abaixo pertencem à integração original; não comprovam execução Android.

### Identidade e fontes

- Repositório: `phpedrogarcia-afk/FioForja`.
- Base de gameplay: `antigravity/forge-lifecycle-proof-v1` em `0663f4e52522643ab0d296f7f3e8cd083373df3e`.
- Doador visual: `deepseek/weapon-dna-engine-v1` em `a2fa0025a2e6755c78c42777b3abd1fec4e5572d`.
- Ancestral comum: `6e3920d4a8a92bca0b4d6f238d6232d3645a6b6c`. O doador visual antecedia correções de gameplay; seus módulos foram transplantados seletivamente.
- `main` não é esta integração. Checkouts preexistentes são preservados. SHAs e evidência de publicação constam no [relatório](../experiments/M03-cross-agent-integration/README.md).

### Implementação registrada na integração

| Área | Estado observado na branch de integração |
|---|---|
| Golpe físico | Um checkpoint transacional une sequência, contador, estado e ouro derivado. Callback independente não paga; replay confirmado é NOOP. O golpe fatal também conta. |
| Forja com núcleo | Mesmo início transacional: valida projeto/núcleo, reserva metal, persiste tentativa. A conclusão consome o núcleo uma vez e preserva herança. Fusão continua exigindo forja manual. |
| Recuperação | Snapshot físico v1 preserva metalurgia, relógio, equipamentos e núcleo. Retoma o último ponto confirmado; carga/calor podem recuar até 1 s de simulação ativa. Falha de gravação pausa a física e permite repetir o mesmo ponto. |
| Tentativa antiga | Save sem snapshot físico compatível continua carregável; a UI oferece cancelamento e política de insumos, sem inventar progresso metalúrgico. |
| Finalização | Exige tentativa ativa, run, projeto, núcleo, contador e estado final iguais ao checkpoint confirmado. Arma e recompensas partem desse estado. |
| Cancelamento | Regular antes de golpe devolve metal; após golpe recupera 1 sucata. Treino não concede sucata por cancelamento. |
| Treino | Sem ouro, drops, moedas especiais, carreira, fusão ou encomendas. Conclusão íntegra Q≥50 concede 1 sucata somente se ouro<50, sem ferro/aço utilizável e sucata<2. Custo básico compartilhado com o Bazar. |
| Weapon DNA | Opt-in por URL/storage em Arsenal, revelação, comparador e inspeção. Legado permanece padrão e fallback. O desenho físico da bigorna não foi migrado para DNA. |
| Cache visual | Geometria por chave estrutural completa; miniaturas por genoma/dimensões/DPR, LRU96/32MiB. Instalação real preserva lâmina e altera montagem. |
| Arte | Três refinamentos do agente: Damasco, Oriental e Meteórica. Comparação com doador e aceitação humana são coisas distintas. |

### Evidência histórica da rodada

- `npm test`: 404 testes descobertos em dois processos; **397 pass, 0 fail, 7 skip**. Os 207 testes TypeScript incluem gameplay, visuais e bibliotecas; não somar novamente os subtotais focados.
- `npm run typecheck`: exit 0.
- `npm run lint`: exit 0, **0 erros / 44 avisos**; baseline de gameplay tinha 26 avisos.
- `npm run build`: exit 0. Migração externa não executada: `DATABASE_URL` ausente.
- Provas de navegador, imagens e benchmark: ver [relatório e matriz de rastreabilidade](../experiments/M03-cross-agent-integration/README.md), que registra o resultado de cada caso e os hashes de fonte.

### Limites e desconhecidos preservados

- Persistência local não é servidor de autoridade e não impede edição manual do próprio storage. Escrita concorrente entre abas não é comprovada.
- Cada checkpoint serializa o save completo; custo de I/O com arsenais muito grandes ainda não medido sistematicamente.
- Auxílio de treino pode reaparecer após nova insolvência real. É rota intencional de retorno, não quota vitalícia nem prova de balanceamento longo.
- Testes e fixtures não equivalem a progressão orgânica completa. Um percurso bem-sucedido não prova confiabilidade em todos os dispositivos.
- DNA não é aparência aprovada final; desempenho móvel e avaliação humana dos três refinamentos continuam pendentes.
- [Bíblia Estética](canon/estetica.md), [Galeria](canon/galeria.md) e [decisões humanas](DECISIONS.md) continuam fontes de produto. Thresholds estéticos são direção; thresholds do código descrevem implementação e não foram reconciliados silenciosamente.
