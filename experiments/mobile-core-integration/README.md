# Integração mobile core — prova de percurso

**Branch:** `codex/mobile-core-integration-v1`. **Base:** `da46757`.
**Escopo:** cinco seções do `GameApp` real conectadas à economia, ao inventário, ao Crisol e à forja.
**Autoridade:** [FIOFORJA-MOBILE-CORE-001](../../docs/DECISIONS.md#fioforja-mobile-core-001--cinco-seções-conectadas-ao-jogo-real-user-approved-agent-implemented-verified) e [FIOFORJA-MOBILE-UX-001](../../docs/DECISIONS.md#fioforja-mobile-ux-001).

## O que este experimento NÃO é

- Não é o companion `com.projetofio.fioforja.prototype`.
- Não usa dados demonstrativos no aplicativo: a prova injeta um **save de teste identificado** (quatro Raras) apenas para viabilizar o percurso; todas as compras, instalações, fusões, consumo de núcleo e forja passam pelas transações reais.
- Não substitui avaliação visual humana nem validação física no Poco.

## Percursos históricos executados (`PASS`)

Chromium/Edge via Playwright, viewport **392×819 CSS**, DPR **2,75**, toque habilitado.

Há duas execuções distintas preservadas pelo histórico Git. A primeira, incluída em `6a640d4`, ocorreu de **2026-10-25T02:02:19.102Z** a **02:02:45.746Z** e revelou núcleo **Raro**, "Núcleo Dobrado de Alta Densidade — Lâmina de Prova 96". A segunda, que substituiu o JSON em `2db89fd` e está em [`browser-proof.json`](browser-proof.json), ocorreu de **2026-10-25T02:11:21.424Z** a **02:11:48.925Z** e revelou núcleo **Lendário**, "Coração Metálico Transcendental [Salto Excepcional +2] — Lâmina de Prova 96". O texto anterior mantinha a saída da primeira rodada ao lado do JSON da segunda. Esta correção não modifica nenhum JSON histórico.

A tabela descreve a segunda execução. Ambos os JSONs registram **sete eventos `strike`**, com contadores 1–7, seguidos de têmpera e revelação; não sustentam a afirmação anterior de oito eventos de golpe registrados. O probe interrompe a leitura ao chegar à fase de têmpera, portanto a ausência do oitavo registro não prova que o simulador recebeu apenas sete golpes. O total físico além dos sete eventos gravados permanece `NOT_PROVEN` por esses arquivos.

| # | Passo | Evidência observada |
|---|---|---|
| 1 | Abrir o jogo | cinco seções: Início, Coleção, Forja, Loja, Craft |
| 2 | Loja → comprar guarda | ouro 4000 → 3780; item entregue e persistido |
| 3 | Coleção → instalar guarda | DEF **186 → 194** na mesma espada; afixo de montagem |
| 4 | Craft → quatro Raras (Q72/85/91/96) | chances **50% Rara / 42% Épica / 8% Lendária** |
| 5 | Confirmar fusão | quatro doadoras consumidas; núcleo **Lendário** "Coração Metálico Transcendental [Salto Excepcional +2] — Lâmina de Prova 96" |
| 6 | Guardar núcleo | núcleo no inventário; **sobrevive ao reload** |
| 7 | Forjar agora | preparação com identidade do núcleo travada |
| 8 | Iniciar forja | barra inferior **ausente** (`navigation: false`) |
| 9 | Sair | diálogo de saída segura; "Continuar martelando" retorna |
| 10 | Martelar | sete eventos de golpe registrados (1–7), reaquecimento e têmpera; total físico não estabelecido pelo JSON |
| 11 | Revelação | arma final exibida; "Ver no Arsenal" |
| 12 | Arsenal + reload | **1 arma** no Arsenal e persistida após recarregar |

Relatório bruto: [`browser-proof.json`](browser-proof.json). Capturas: `evidence/` (não versionadas; regeneráveis).

Reproduzir:

```powershell
node node_modules/vite/bin/vite.js --config vite.mobile.config.ts --host 127.0.0.1 --port 8952 --strictPort
node experiments/mobile-core-integration/probe.mjs
```

O probe usa Edge instalado (`FIOFORJA_BROWSER_CHANNEL` sobrescreve). Ele semeia o save **uma vez por aba** e recarrega a página nos pontos de persistência.

## Prova Android (AVD)

APK **0.2.1** (código 3), `com.projetofio.fioforja`, SHA-256 `02e7ec2b01badbd848adf4212fc9e2a9abf2ce57aacd093747220cfbd0e8be8d`, 12.128.406 bytes, HEAD `2db89fd`. AVD `FioForja_API36_APK`: **1080×2400**, **420 dpi**, Android 16/API 36.

| Verificação | Resultado |
|---|---|
| Instalação por cima de 0.1.0 e 0.2.0 | `adb install -r` sucesso; `versionCode` 1 → 2 → 3 |
| Save anterior | preservado: 4 forjadas, Q93, 1.632 ouro, 7 ferro, 4 aço, 5 peças |
| Cinco seções | Início, Coleção, Forja, Loja, Craft visíveis e navegáveis por toque |
| Voltar físico | Loja → Início; em Início o app permanece aberto |
| Force-stop + relançamento | volta ao Início com o mesmo save |
| Modo avião | abre e renderiza offline após cold start |
| Coleção/inspeção | 4 armas, miniaturas, atributos e painel de inspeção |
| Prévia da Forja | **defeito encontrado e corrigido**: o canvas desenhava uma vez com a aba oculta e ficava em branco; agora usa `WeaponPreview` com `ResizeObserver` |
| Compras/fusão/forja no AVD | não repetidas no 0.2.1; provadas por testes e pelo navegador |

O emulador encerrou sozinho uma vez (exit 1) após a instalação final; a tela inicial do APK final já havia sido capturada com o save preservado. Não há aparelho físico em ADB nesta rodada.

Capturas: `evidence/android-*.png` (não versionadas).

**Correção final verificada no navegador:** `check-final.mjs` confirmou `Estado: estável` na inspeção e a prévia da Forja pintada (7.363 pixels não transparentes, extensão vertical de 412 px em um canvas de 919×484), em 392×819/DPR 2,75. Resultado em `final-check.json`.

## Testes automatizados

- `src/game/mobile-integration.test.ts`: 24 testes — Loja (6), Coleção (3), Craft (8), núcleo→forja (5), compatibilidade de save (1) e proteção de espada (1). Cobre preço adulterado, produto inexistente, falha de storage, mesma raridade, IDs repetidos, lâmina protegida/quebrada/treino/entregue, catalisador, reload, consumo único do núcleo e herança.
- Subtotal histórico do processo TypeScript: **231 testes, 231 pass, 0 fail**. A redação anterior "suíte total" era incorreta: `npm test` executa primeiro os testes JavaScript de `scripts/` e depois TypeScript. Os 231 correspondem aos 207 TypeScript da integração Codex 05 mais os 24 novos. O total executado na revisão Codex 08 está registrado por processo no bloco abaixo; não é uma reconstrução do resultado histórico por aritmética.
- Typecheck 0. Lint 0 erros (39 avisos, abaixo do baseline de 44). Build web 0. Esses resultados pertencem à Operação 07, não à revisão posterior.

## Limites históricos preservados da Operação 07

- Fixtures de quatro Raras não são progressão natural; a origem está declarada no topo de `probe.mjs`.
- O HUD da bigorna transborda em 392 px; pertence à frente Antigravity e não foi alterado.
- A Revelação usa a tela existente; enquadramento/corte da arma não é decisão desta entrega.
- Validação física no Poco depende de instalação e não é declarada aqui.

## Operação Codex 08 — PASS no envelope funcional testado (25/10/2026)

Revisão isolada na branch `codex/mobile-core-review-v1`, base `78945e0de9d7a70d14994e80a14b2885998ec9ec`. A auditoria documental acima usa os objetos Git das duas execuções; não reapresenta esses resultados como um percurso novo.

- **`npm test` confirmado:** JS **203 encontrados / 196 PASS / 7 SKIP / 0 FAIL**; TS **272 / 272 PASS / 0 SKIP / 0 FAIL**. Total **475 encontrados / 468 PASS / 7 SKIP / 0 FAIL**, com 41 regressões novas e nenhum teste antigo removido. Focal 123 PASS é sobreposta e não se soma novamente.
- **UI adicional:** quatro percursos **RED 4 → GREEN 4**, fora de `npm test`: equipamento comprado/padrão; remoção de portal da seção oculta; escolha e histórico de encomenda; custo e delta efetivo de refino. [Evidências e limites](../../.project-intelligence/experiments/CODEX08-review.md).
- **Correções de domínio:** backup inicial não publica candidato recusado; fusão verifica custo e efeitos por receita possível do mesmo tier. Normalização da Loja já era correta e foi preservada com regressões. A validação de fusão não autentica o sorteio original nem detecta genericamente a troca de catalisador quando o resultado é possível nos dois cenários; não é proteção geral contra adulteração do save.
- **Checks/builds:** typecheck PASS; lint 0 erros/38 avisos; web/mobile/APK PASS; assinatura `apksigner` verificada. `db:migrate` SKIP explícito por `DATABASE_URL` ausente, com fallback PGLite, sem banco remoto migrado. Revisão econômica independente: zero diferenças em 72 outputs após excluir IDs/datas, fora de `npm test`.
- **APK entregue:** 0.2.2/código 4, **12.129.669 bytes**, SHA-256 `d528b890f9f83a2299f105874084bf8e7f8717e5c86a5cf920b74a393fc40f56`; base `78945e0` + working tree revisado, `BUILD-INFO` com alterações não commitadas YES. Entregue em `Documents\FioForja\APK\FioForja-teste.apk` e `FioForja-debug-v0.2.2.apk`; 0.2.1 e 0.1.0 anteriores preservados.
- **[AVD: nove casos PASS](../CODEX08-review/android-summary.json):** atualização 0.2.1→0.2.2 sem limpar dados; compras de aço/catalisador/duas guardas; montagem/troca DEF 185→193→195 com devolução da anterior; quatro Raras→núcleo Épico consumindo catalisador; núcleo→forja com oito golpes/têmpera 98→espada Épica Q75; núcleo consumido e estado preservado após reabrir. Fixture sintética declarada; recompensas geradas/persistidas, não coletadas. Viewport 412×839/DPR 2,625. Etapas PASS preservadas após reparos de driver e interrupção de coordenação; não se declara um único percurso ininterrupto.
- **[Poco: reinstalação/restauração e navegação PASS](../CODEX08-review/poco-summary.json):** proprietário confirmou desinstalação e autorizou reinstalar. Snapshot pré-remoção restaurado e conferido na escrita; nova forja local observada antes da leitura de navegação (carreira 2→3/aço 2→1, ator não atribuído), sem nova restauração. O baseline posterior ficou igual após cinco seções, Voltar e force-stop/relançamento, 392×819/DPR 2,75. Sem fixture, compra ou fusão nesta prova física; **não é atualização por cima no Poco**.
- **Candidata à avaliação humana:** não é aprovação de governança/produção. Áudio físico, desempenho sustentado e longo prazo não foram comprovados. Captura imediata da Revelação mostra canvas vazio, com timing versus desenho `NOT_PROVEN`; inspeção após reabrir mostra a arma inteira. Branch autorizada pronta para publicação pelo coordenador, sem SHA remoto novo declarado.
