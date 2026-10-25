# Protótipo mobile — plano de execução

> **For agentic workers:** usar `superpowers:executing-plans` nesta sessão. Este é o protótipo visual delimitado já solicitado pelo proprietário, não uma migração do aplicativo.

**Goal:** entregar preparação, fabricação imersiva e coleção navegáveis para revisão no Poco.

**Architecture:** entrada React/Vite exclusiva em `experiments/mobile-ux-v1/`, reaproveitando catálogo, renderizadores, física e assets. Estado somente em memória; nenhum import de transações ou chamada de persistência. As três áreas restantes são acessos demonstrativos identificados.

**Tech Stack:** React, Vite existente, Canvas 2D, lucide-react e CSS local. Sem dependências novas.

**Spec:** [FIOFORJA-MOBILE-UX-001](../../DECISIONS.md#fioforja-mobile-ux-001).

## Global Constraints

- Cinco seções na navegação; sem barra inferior durante fabricação.
- Espada inteira e estável na preparação; vista elevada da bigorna e orientação térmica legível.
- Não mudar gameplay, APK instalado, saves, main, economia ou arte original; sem push/merge.
- Poco observado: 1080×2400, 440 dpi, gestos, recorte superior de 103 px; WebView atual: 392×819 CSS, DPR 2,75 (visualViewport 392,727×819,273).
- Navegador físico e WebView nativo possuem insets diferentes. Registrar cada viewport observado; não alegar equivalência automática.

## Review Focus

- Espadas com outros comprimentos/montagens: encaixe completo por limites geométricos.
- Tela curta: prévia e controles permanecem visíveis, sem rolagem global.
- Toque cancelado ou aplicativo oculto: liberar carga, sem golpe preso.
- Trocar filtros/página: seleção e navegação continuam recuperáveis.
- Protótipo versus save real: rotulagem permanente; nenhuma escrita em storage.

## Tarefas

- [x] **1 — Preparação e navegação.** Criar `index.html`, `main.tsx`, `App.tsx`, `SwordView.tsx`, `styles.css`, `vite.config.ts` e `specimens.ts`. Prévia medida por ResizeObserver e renderer existente; três etapas curtas e cinco seções. Dados de coleção vêm de armas realmente produzidas na prova do emulador e são identificados como exemplos.
- [x] **2 — Fabricação e coleção.** Criar `ForgeView.tsx`: usar `createSim/stepSim` sem transações, desenho próprio do enquadramento com assets existentes, segurar/soltar, reaquecer e têmpera. Coleção paginada, detalhe e comparação; mostrar atributos existentes. Conclusão demonstrativa não grava arma nem concede recompensa.
- [x] **3 — Verificar e entregar.** Compilar somente o alvo experimental, conferir tipos/lint das adições, observar screenshots e navegação a 392×819 e em tela curta. Abrir no Poco por encaminhamento USB, medir viewport e capturar evidências sem alterar o APK. Documentar limites e manter revisão humana pendente.

## Registro de execução

- BASE: `cca050e4911d3dd22001cc6ddcd11f8639bf39be`; branch `codex/mobile-ux-prototype-v1`, no worktree isolado existente.
- Execução direta nesta sessão: o usuário já escolheu a direção e pediu para começar o protótipo. Não repetir a decisão de arquitetura ou criar uma nova rodada de aprovação para tarefas mecânicas.
- Não repetir os 403 testes do gameplay sem mudar esse código. A validação relevante deste recorte é visual/navegação; aceitação humana continua pendente.
