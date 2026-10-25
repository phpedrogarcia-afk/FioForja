# Navegação mobile — cinco seções integradas

**Estado:** `[USER-APPROVED]` arquitetura; `[AGENT-IMPLEMENTED]` integração; `[VERIFIED]` no envelope funcional Codex 08: navegador, percurso AVD e navegação básica no Poco. Candidata à avaliação humana; áudio, desempenho sustentado e primeiro frame da Revelação não foram resolvidos por esses resultados.
**Autoridade:** [FIOFORJA-MOBILE-UX-001](../DECISIONS.md#fioforja-mobile-ux-001) e a atualização de Craft em [FIOFORJA-MOBILE-CORE-001](../DECISIONS.md#fioforja-mobile-core-001).
**Branch de implementação:** `codex/mobile-core-integration-v1`.

## 1. Contrato

| Seção | Tela | Fonte de dados |
|---|---|---|
| Início | `WorkshopHome` | `save` real: carteira, carreira, Arsenal, núcleos, tentativa ativa, encomendas |
| Coleção | `CollectionScreen` | `gallery`, `inventory.components`, `inventory.fusionCores` |
| Forja | `DesignScreen` (modo embutido) | projeto, materiais e núcleo reais |
| Loja | `ShopScreen` | catálogo `src/game/shop.ts` + carteira/inventário reais |
| Craft | `CraftScreen` | `fuseSwords`/`fuseComponents` + transações |

A oficina é **uma só**: `GameApp` continua sendo o único dono do estado (`save.current`) e todas as seções leem/escrevem o mesmo `SaveData`. Não existe segunda carteira, segundo inventário, segundo save ou segundo motor de fusão.

## 2. Regras de layout

- Casca: `flex h-dvh flex-col overflow-hidden`; cabeçalho fixo, **miolo rolável** (`overflow-y-auto overscroll-contain`) e `BottomNav` fixa no rodapé.
- A rolagem acontece dentro da seção ativa; a navegação não rola nem sai da tela.
- Áreas seguras: cabeçalho usa `env(safe-area-inset-top)`; a barra usa `env(safe-area-inset-bottom)`.
- Alvos de toque: mínimo de 56 px na barra; botões de ação com `min-h` de 36–48 px.
- A seção ativa usa `aria-current="page"` e marcador dourado; as demais ficam legíveis em repouso.
- As cinco seções ficam **montadas** e são alternadas por `hidden`; trocar de aba não remonta a árvore nem reinicia seleção do Craft, inspeção da Coleção ou preparação da Forja.
- Como os Sheets usam portal, `hidden` da seção não basta para escondê-los: os nove painéis de Início/Coleção/Loja/Craft exigem também a seção `active`. A navegação remove o portal sobreposto, preservando o estado local para o retorno.

No Início/perfil, as encomendas oferecem escolha explícita da arma elegível antes de entregar e mantêm o histórico das cumpridas. Na Loja/Ferramentas, o jogador equipa ferramentas adquiridas ou restaura o padrão. Na inspeção da Coleção, o refino apresenta preço e delta efetivo antes de debitar.

## 3. Exceção canônica: fabricação

Ao iniciar a forja, `screen = "forge"` renderiza somente `ForgeCanvas` + `ForgeHud`; **a barra inferior não é renderizada**. A saída segura existe em dois caminhos:

1. botão **Sair** do HUD → diálogo "Sair da bigorna?" com "Continuar martelando" ou "Sair e cancelar";
2. gesto/botão Voltar do Android → o mesmo diálogo (nunca cancela sozinho).

Cancelar aplica `executeCancelForgeTransaction`: reembolso integral antes do primeiro golpe; depois dele, sucata conforme a política canônica. A tentativa permanece recuperável no save e o diálogo de recuperação continua aparecendo ao abrir o jogo.

## 4. Voltar

- Cada navegação de seção empilha `history.pushState({fioSection})` com hash `#home`, `#collection`, `#forgePrep`, `#shop`, `#craft`, `#forge`.
- `popstate` restaura a seção anterior; em `reveal`/`rewards` volta à Coleção.
- Em `forge`, o `popstate` abre o diálogo de saída e, ao continuar, repõe a entrada de histórico.
- O listener Capacitor de `mobile/main.tsx` continua intacto; `canGoBack` agora é verdadeiro quando há navegação interna.

## 5. Arquivos

- `src/game/GameApp.tsx` — estado único, rotas, diálogos, efeitos.
- `src/game/components/BottomNav.tsx`, `workshopSections.ts` — barra e ordem canônica.
- `src/game/components/Sheet.tsx` — painel inferior acessível (foco, ESC, backdrop).
- `src/game/components/WeaponPreview.tsx` — arma inteira; DNA opt-in com fallback legado.
- `src/game/screens/WorkshopHome.tsx`, `CollectionScreen.tsx`, `ShopScreen.tsx`, `CraftScreen.tsx`, `DesignScreen.tsx`.

## 6. Provas

- `experiments/mobile-core-integration/probe.mjs` — percursos históricos de navegador em 392×819/DPR 2,75: Loja → compra → Coleção → instalação (DEF 186→194) → Craft → 4 Raras → odds 50/42/8 → núcleo → reload → Forja → saída segura → sete eventos de golpe registrados + têmpera → Revelação → Arsenal → reload. A primeira execução revelou Raro; a segunda, Lendário. Resultados `PASS`, horários, localização no Git e limites no [relatório da integração](../../experiments/mobile-core-integration/README.md). O JSON não estabelece o total físico além dos sete eventos registrados.
- Testes de integração em `src/game/mobile-integration.test.ts`.
- `npm run typecheck`, `npm test`, `npm run lint` verdes na branch.

## 7. Limites

- A barra fica **oculta** em Revelação/Recompensas nesta entrega; a decisão anterior deixava a visibilidade em aberto. As telas têm retorno explícito para Arsenal/Início.
- O HUD da bigorna é da frente Antigravity; a grade de quatro estatísticas transborda em 392 px. Não foi alterado aqui — ver [estado e limites](../PROJECT-STATE.md).
- O botão Voltar foi verificado via `popstate` no navegador e por toque nativo no AVD. No Poco 0.2.2, navegação pelas cinco seções, Voltar de Craft à Loja e force-stop/relançamento preservaram exatamente o baseline subsequente à restauração; o aparelho passou por reinstalação autorizada após desinstalação humana, não atualização por cima.
- A [Operação Codex 08](../../.project-intelligence/experiments/CODEX08-review.md) confirmou quatro percursos UI adicionais **RED 4 → GREEN 4**: equipamento, portal entre seções, escolha/histórico de encomenda e cotação de refino. Esses percursos são separados dos **475 testes de `npm test` (468 PASS/7 SKIP/0 FAIL)**. Checks/builds e nove casos no AVD passaram. O AVD desta rodada mediu 412×839 CSS/DPR 2,625; o Poco, 392×819 CSS/DPR 2,75. Compras/fusão do percurso AVD não foram executadas no Poco.
