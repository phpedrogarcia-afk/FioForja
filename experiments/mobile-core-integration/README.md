# Integração mobile core — prova de percurso

**Branch:** `codex/mobile-core-integration-v1`. **Base:** `da46757`.
**Escopo:** cinco seções do `GameApp` real conectadas à economia, ao inventário, ao Crisol e à forja.
**Autoridade:** [FIOFORJA-MOBILE-CORE-001](../../docs/DECISIONS.md#fioforja-mobile-core-001--cinco-seções-conectadas-ao-jogo-real-user-approved-agent-implemented-verified) e [FIOFORJA-MOBILE-UX-001](../../docs/DECISIONS.md#fioforja-mobile-ux-001).

## O que este experimento NÃO é

- Não é o companion `com.projetofio.fioforja.prototype`.
- Não usa dados demonstrativos no aplicativo: a prova injeta um **save de teste identificado** (quatro Raras) apenas para viabilizar o percurso; todas as compras, instalações, fusões, consumo de núcleo e forja passam pelas transações reais.
- Não substitui avaliação visual humana nem validação física no Poco.

## Percurso executado (`PASS`)

Chromium/Edge via Playwright, viewport **392×819 CSS**, DPR **2,75**, toque habilitado.

| # | Passo | Evidência observada |
|---|---|---|
| 1 | Abrir o jogo | cinco seções: Início, Coleção, Forja, Loja, Craft |
| 2 | Loja → comprar guarda | ouro 4000 → 3780; item entregue e persistido |
| 3 | Coleção → instalar guarda | DEF **186 → 194** na mesma espada; afixo de montagem |
| 4 | Craft → quatro Raras (Q72/85/91/96) | chances **50% Rara / 42% Épica / 8% Lendária** |
| 5 | Confirmar fusão | quatro doadoras consumidas; núcleo **Raro** "Núcleo Dobrado de Alta Densidade" |
| 6 | Guardar núcleo | núcleo no inventário; **sobrevive ao reload** |
| 7 | Forjar agora | preparação com identidade do núcleo travada |
| 8 | Iniciar forja | barra inferior **ausente** (`navigation: false`) |
| 9 | Sair | diálogo de saída segura; "Continuar martelando" retorna |
| 10 | Martelar | 8 golpes físicos + reaquecimento + têmpera |
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

- `src/game/mobile-integration.test.ts`: 24 testes — Loja (7), Coleção (3), Craft (8), núcleo→forja (5), compatibilidade de save (1). Cobre preço adulterado, produto inexistente, falha de storage, mesma raridade, IDs repetidos, lâmina protegida/quebrada/treino/entregue, catalisador, reload, consumo único do núcleo e herança.
- Suíte total: **231 testes, 231 pass, 0 fail**. Typecheck 0. Lint 0 erros (39 avisos, abaixo do baseline de 44). Build web 0.

## Limites preservados

- Fixtures de quatro Raras não são progressão natural; a origem está declarada no topo de `probe.mjs`.
- O HUD da bigorna transborda em 392 px; pertence à frente Antigravity e não foi alterado.
- A Revelação usa a tela existente; enquadramento/corte da arma não é decisão desta entrega.
- Validação física no Poco depende de instalação e não é declarada aqui.
