# Estado do projeto — integração e APK Android experimental

## Operação Codex 07 — integração mobile core — 24/10/2026

- **Branch publicada:** `codex/mobile-core-integration-v1` (commits `6a640d4` e `2db89fd`), base `da46757` (que contém `41d7222`/`cca050e`/`82a9fd3`).
- **Worktree isolado:** `C:\Users\phped\.codex\worktrees\mobile-core-integration-v1\FioForja`. O checkout principal e as branches de outros agentes não foram movidos nem reescritos.
- **APK:** versão `0.2.1`, código 3, **12.128.406 bytes**, SHA-256 `02e7ec2b01badbd848adf4212fc9e2a9abf2ce57aacd093747220cfbd0e8be8d`, HEAD `2db89fd`, sem alterações não commitadas. Entregue no worktree, no checkout principal e em `C:\Users\phped\Documents\FioForja\APK`. Instalado por cima de 0.1.0/0.2.0 no AVD com save preservado.
- **Interface:** Início, Coleção, Forja, Loja e Craft sobre o mesmo `GameApp`/`SaveData`; barra inferior fixa fora da fabricação e ausente dentro dela; saída segura com confirmação.
- **Loja:** catálogo único em `src/game/shop.ts`; compra valida ID, tipo, preço, quantidade e moeda; guarda, lingote, catalisador e receita chegam ao inventário real.
- **Coleção:** Arsenal real, inspeção, comparação, proteção mínima e instalação/troca de peças com recálculo persistido.
- **Craft:** quatro doadoras da **mesma raridade** (qualidades livres), chances do motor (50/42/8 para Raras), confirmação, núcleo persistido e "Forjar agora" encaminhando à preparação.
- **Núcleo → Forja:** material reservado no início; núcleo consumido apenas na conclusão; herança, raridade e origem preservadas no Arsenal.
- **Provas:** `npm test` **231/231**, typecheck 0, lint 0 erros/39 avisos, build web 0; percurso real de navegador em 392×819/DPR 2,75 com compra, instalação, fusão, reload, forja, revelação e novo reload. Relatório em `experiments/mobile-core-integration/`.
- **Android:** cinco seções, Voltar físico, force-stop/relançamento, modo avião e prévia da Forja verificados no AVD 1080×2400/420 dpi. Compras/fusão/forja no APK 0.2.1 não foram repetidas no AVD; estão provadas por 24 testes transacionais e pelo percurso de navegador. Validação física no Poco, áudio físico, desempenho sustentado e HUD da bigorna (frente Antigravity) continuam `NOT_PROVEN`.

## Decisão mobile aprovada — 24/10/2026

- **Autoridade:** [FIOFORJA-MOBILE-UX-001](DECISIONS.md#fioforja-mobile-ux-001), decisão explícita do proprietário após jogar no Poco e fornecer vídeo de 23 segundos.
- **TARGET aprovado:** barra inferior fixa em Início, Coleção, Forja, Loja e Jogador; barra ausente durante fabricação. Preparação mantém espada inteira visível; fabricação elevada/oblíqua com HUD compacto; orientação térmica clara e Revelação centrada na arma.
- **CURRENT:** o APK 0.2.0 (branch `codex/mobile-core-integration-v1`) já usa a arquitetura de cinco seções no jogo real; ver a seção Codex 07 acima. O APK de `41d7222` e o [protótipo separado](../experiments/mobile-ux-v1/README.md) continuam preservados como checkpoints históricos. O companion `FioForja Protótipo` tem outro pacote/UID e não grava o progresso real.
- **OBSERVED no recorte:** três experiências navegáveis no Poco, 1080×2400/440 dpi, WebView 392×819 CSS/DPR 2,75; prévia inteira, fabricação sem barra, coleção paginada, inspeção e comparação. Evidências e limites no relatório do experimento.
- **Próximo passo:** avaliação humana dessas três experiências no Poco. Reconstrução das outras telas depende dessa validação.
- **NOT_PROVEN:** aceitação visual, solução final de câmera, integração ao jogo e desempenho sustentado. Observação física não equivale a aprovação do layout.

## Entrega Android — 24/10/2026

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
