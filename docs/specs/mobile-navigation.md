# Navegação mobile — cinco seções integradas

**Estado:** `[USER-APPROVED]` arquitetura; `[AGENT-IMPLEMENTED]` integração; `[VERIFIED]` no navegador; Android em `[PARTIAL]` até a instalação no aparelho.
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

- `experiments/mobile-core-integration/probe.mjs` — percurso de navegador em 392×819/DPR 2,75: Loja → compra → Coleção → instalação (DEF 186→194) → Craft → 4 Raras → odds 50/42/8 → núcleo → reload → Forja → saída segura → 8 golpes + têmpera → Revelação → Arsenal → reload. Resultado `PASS` em `evidence/probe-report.json`.
- Testes de integração em `src/game/mobile-integration.test.ts`.
- `npm run typecheck`, `npm test`, `npm run lint` verdes na branch.

## 7. Limites

- A barra fica **oculta** em Revelação/Recompensas nesta entrega; a decisão anterior deixava a visibilidade em aberto. As telas têm retorno explícito para Arsenal/Início.
- O HUD da bigorna é da frente Antigravity; a grade de quatro estatísticas transborda em 392 px. Não foi alterado aqui — ver [pendências](../PROJECT-STATE.md#pontos-que-dependem-da-frente-antigravity).
- O botão Voltar foi verificado via `popstate` no navegador; o gesto físico no aparelho depende da instalação do APK.
