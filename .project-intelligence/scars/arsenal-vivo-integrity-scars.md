# Scars: Arsenal Vivo 01.2 — Item Integrity & Component Hardening

## 1. Acúmulo Infinito de Atributos por Modificação Aditiva Direta
- **Causa Raiz:** `handleInstallComponent` em `GameApp.tsx` aplicava bônus de atributos somando diretamente a `targetSword.damage += bonus`. Ao trocar de componente repetidamente ou reabrir a mesa, os atributos anteriores persistiam e acumulavam sem limite (`+8`, `+16`, `+24`, etc.).
- **Solução Definitiva:** Separação estrita de camadas metalúrgicas (`baseDamage`, `baseDefense`, `baseAgility`, `baseDurability`). Atributos finais são calculados determinísticamente via `recalculateSwordStats(sword)`:
  $$\text{Damage} = \text{baseDamage} + (\text{upgrades} \times 8) + \sum \text{installedComponents.damageBonus}$$
- **Prevenção:** Testes unitários com 10 trocas sucessivas de guardas provando ausência de acúmulo e devolução de peças anteriores ao inventário.

## 2. Inconsistência de Storage no Ambiente Node.js (--experimental-strip-types)
- **Causa Raiz:** Em `save.ts`, a verificação de ambiente testava `window.localStorage`, mas o corpo de `writeSave` e `loadSave` usava chamadas desqualificadas para `localStorage.getItem()`. No Node 22 com `--experimental-strip-types`, `window` é um objeto injetável no teste, enquanto `localStorage` no escopo léxico pode resolver para a implementação experimental do Node (que falha sem arquivo de storage configurado).
- **Solução Definitiva:** Introduzido helper `getStorage(): Storage | null` que unifica `window.localStorage` e `globalThis.localStorage`. Adicionado seed imediato de `BACKUP_KEY` no primeiro save para eliminar a janela de vulnerabilidade.

## 3. Chave de Geometria Não-Canônica em Dados de Teste/Mock
- **Causa Raiz:** O script de captura mockou uma lâmina com `profile: "broadsword"`, que não existia no dicionário `PROFILES`. O motor de desenho `drawSwordBody` acessava `PROFILES[design.profile].length`, causando `TypeError: Cannot read properties of undefined (reading 'length')`.
- **Solução Definitiva:** 
  1. `drawSwordBody` recebeu fallback defensivo obrigatório: `PROFILES[design.profile] || PROFILES.long`, `STEELS[design.steel] || STEELS.steel`, `WRAPS[design.wrap] || WRAPS.leather`.
  2. A lâmina de teste foi corrigida para usar o perfil canônico `claymore`.
