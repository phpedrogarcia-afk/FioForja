# Craft mobile Implementation Plan

> **For agentic workers:** usar superpowers:executing-plans nesta sessão, respeitando a divisão humana Codex/Craft e Antigravity/forja.

**Goal:** entregar seleção, confirmação e revelação de núcleo navegáveis no Poco, sem save real.

**Architecture:** ampliar o companion já isolado; reutilizar SwordView, fuseSwords e getFusionOdds sem chamar transações. Estado da demonstração fica em memória, inclusive ao alternar seções.

**Tech Stack:** React, TypeScript, CSS, Vite e Playwright existentes.

**Spec:** [direção aprovada](../../specs/craft-mobile-prototype.md).

## Global Constraints

- Mesma raridade não exige mesma qualidade; saída sempre núcleo.
- Nenhuma mudança em src/, main, save real, dependências ou código da forja; sem push/merge.
- Provas anteriores ficam congeladas; testar apenas o novo fluxo e regressões diretamente relacionadas.

## Review Focus

Raridades diferentes; itens protegidos/indisponíveis; confirmação repetida; saída de uma seção e retorno; identificação clara de fixtures e ausência de persistência.

## Task 1 — seleção e núcleo em memória

- [x] Criar testes de seleção em `experiments/mobile-ux-v1/craft.test.ts`: quatro Raras de qualidades diferentes aceitas; repetidas, mistas, protegidas, quebradas, treino, entregues e IDs ausentes rejeitados.
- [x] Executar teste e observar ausência do módulo `craft.ts`.
- [x] Implementar `CraftDonor`, `craftDonors`, `donorBlockReason` e `selectionIssue` em `craft.ts`; reaproveitar amostras com identificação de dados sintéticos.
- [x] Criar `CraftView.tsx`: slots 2×2, seletor paginado, inspeção, chances/custo do motor, confirmação e revelação; guardar núcleo somente na sessão.
- [x] Testar seleção e fluxo; nenhum commit intermediário obrigatório para este protótipo.

## Task 2 — navegação e prova de entrega

- [x] Alterar `App.tsx` e `styles.css`: Craft no quinto acesso; perfil demonstrativo acessível pelo Início; prévia de núcleo sem início funcional de fabricação.
- [x] Criar prova Playwright do fluxo em 392×819/DPR 2,75, captura, retorno entre seções e storage vazio; verificar cancelamento e clique repetido.
- [x] Rodar testes focados, lint, typecheck explícito do experimento e build do companion.
- [x] Atualizar README/DECISIONS com CURRENT/TARGET e limitações. Se USB acessível, instalar somente o companion separado e observar o novo fluxo.
- [x] Revisar diff, links e estado Git. Preservar alterações somente nesta branch; integração funcional depende da avaliação humana.

## Resultado observado

3 testes focados PASS; prova de navegação PASS sem erros de página; lint e typecheck do experimento PASS; 16 links locais com destinos existentes; build Android PASS. Fluxo seleção → confirmação → núcleo observado no Poco físico. APK original manteve o mesmo SHA-256. Sem alterações em src/, scripts, mobile ou android, sem merge/push. Avaliação humana continua pendente.
