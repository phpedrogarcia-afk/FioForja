# HANDOFF HISTÓRICO — DEEPSEEK / WEAPON VISUAL DNA

> **Entrega histórica do doador a2fa002.** As marcações VERIFIED abaixo têm o escopo originalmente relatado. A Operação Codex 05 encontrou colisões de cache, precedência incorreta e rerrolagem da lâmina após instalação real; corrigiu e ampliou a evidência. Estado atual: [handoff integrado](HANDOFF-CODEX.md) e [relatório](../experiments/M03-cross-agent-integration/README.md). O benchmark antigo mede submissão Canvas, sem readback/rasterização sincronizada. Não comprova gameplay nem aprovação estética humana.

**Branch:** `deepseek/weapon-dna-engine-v1` (exclusiva, sem merge, sem force push)
**Base:** `antigravity/blacksmith-progression-v1` @ `6e3920d4a8a92bca0b4d6f238d6232d3645a6b6c`
**Isolamento:** todo o trabalho foi feito em worktree separado. A árvore ativa do Antigravity
(`antigravity/forge-lifecycle-proof-v1`, Operação 04) **não foi tocada**, e `main` não foi
modificada.
**Status:** motor implementado, testado e comprovado visualmente em laboratório; integração no jogo
é **opt-in** (modo experimental), não é a aparência padrão.

---

## 1. STATUS REAL (sem marketing)

| Frente | Estado |
|---|---|
| Modelo de DNA visual determinístico | **IMPLEMENTED / VERIFIED** |
| Geometria de lâmina + montagem (9 famílias) | **IMPLEMENTED / VERIFIED** (varredura de 520 genomas) |
| Materiais, padrões de aço, oxidação | **IMPLEMENTED / VERIFIED** (visual) |
| Runas/inscrições com incisão física | **IMPLEMENTED / VERIFIED** (visual em macro) |
| Defeitos e marcas de qualidade | **IMPLEMENTED / VERIFIED** |
| Renderer em camadas + cache | **IMPLEMENTED / VERIFIED** |
| Laboratório visual + 8 matrizes de evidência | **IMPLEMENTED / VERIFIED** |
| Benchmark real (Chromium/Canvas 2D) | **IMPLEMENTED / VERIFIED** (com ressalva de custo, §12) |
| Integração nas telas do jogo | **PROPOSED / IMPLEMENTED opt-in** (Reveal + Gallery por URL param) |
| Migração de save / mudança de schema | **NÃO FEITO (de propósito)** |
| Substituição do renderizador legado | **NÃO FEITO (de propósito)** |
| Economia, loot, fusão, progressão, persistência | **INTOCADOS** |

O motor é utilizável **hoje** em laboratório e em telas experimentais. Não é a aparência padrão do
jogo: isso exige decisão de produto e uma rodada de QA em dispositivo real.

---

## 2. COMMITS

- `d3657da` feat(visuals): Weapon Visual DNA engine — deterministic genome, geometry, materials,
  runes, quality marks, layered renderer, opt-in adapter, visual lab
- `HEAD` feat(visuals): Weapon DNA round-2 — linguagem visual final, morfologia guiada por
  atributos, 8 matrizes de evidência + benchmark final e este handoff (ver `git log`)

Build de evidência final: `1bec6a443a9a8751a28cbce2467817734d62803809c96829d61f84859f2bd275`.

---

## 3. ARQUITETURA

```
src/game/visuals/
  math.ts             hash FNV-1a, mulberry32, clamp/lerp/smoothstep, quantise (determinismo)
  types.ts            contrato puro (Pt, BladeStation, WeaponGeometry, viewport, camadas)
  weaponGenome.ts     deriveWeaponVisualGenome(source) -> WeaponVisualGenome (+ FAMILY_GRAMMAR)
  geometry.ts         buildWeaponGeometry(genome) -> WeaponGeometry + helpers de Path2D
  materials.ts        liga, seção, chanfro, sangradouro, padrões, oxidação, cabo/guarda/pomo
  ornamentation.ts    incisão rúnica, filigrana, brasões, incrustações do cabo
  qualityMarks.ts     gume, defeitos de forja, trincas, marca do ferreiro
  weaponRenderer.ts   pipeline de camadas, transform, cache LRU de geometria, calor de forja
  rendererAdapter.ts  ponte opt-in com swordDraw.ts (modo legacy|dna)
```

Pipeline: `FinishedSword` → genoma (puro) → geometria (cacheada) → camadas → Canvas 2D.
Ordem das camadas: shadow → structure → base → bevels → fuller → pattern → defects → inscriptions →
guard → grip → pommel → reflections.

Especificação completa: [`docs/specs/weapon-visual-dna.md`](specs/weapon-visual-dna.md).

---

## 4. DETERMINISMO (VERIFIED)

- Semente = FNV-1a sobre a identidade persistente da arma (id, design, qualidade, warp, cracks,
  grau, estado estrutural). Nenhum `Math.random()` no motor.
- Teste: mesmo `FinishedSword` → genoma idêntico byte a byte, inclusive após
  `JSON.stringify`/`parse` (`weaponGenome.test.ts`, 23 testes).
- Sub-seeds por subsistema: trocar guarda/pomo/cabo **só** muda `mount` correspondente; lâmina,
  superfície, padrão e marca do ferreiro não mudam (3 testes dedicados).
- Compatibilidade: arma antiga sem `physicalProfile`, sem atributos, sem `combatRole`, sem
  `rarity` — genoma derivado e renderizável (testes "legacy swords missing optional fields").

---

## 5. TESTES (VERIFIED)

```
npm test
  scripts/*.test.mjs + scripts/internal : 197 testes, 0 falhas
  TS (sim/arsenal/prestige/progression/lib/visuals): 144 testes, 0 falhas
npx tsc --noEmit                          : 0 erros
npx vite build --mode development         : build OK
```

Testes específicos do motor (`src/game/visuals/`):
- `weaponGenome.test.ts` — determinismo, round-trip JSON, ranges numéricos documentados, tolerância a
  saves antigos, isolamento de componentes, primitivas de RNG.
- `geometry.test.ts` — geometria idêntica para genoma idêntico; todas as armas canônicas em todos os
  tiers de qualidade; **varredura determinística de 520 genomas** (9 famílias × 9 guardas × 8 pomos ×
  9 cabos × qualidade 20–99) sem NaN/Infinity, sem largura negativa, estações monotônicas, contorno
  fechado e simples (teste de auto-interseção), ponta válida como ponto mais avançado, limites de
  guarda/cabo/pomo.

Verificação visual: 8 matrizes de evidência (abaixo) geradas por Chromium headless com Canvas 2D
real, sem mocks, com PNGs em resolução exata e `manifest.json` com hashes de build.

---

## 6. CINCO ARMAS DE REFERÊNCIA (as 5 canônicas)

| Arma | Família | O que a geometria comunica |
|---|---|---|
| **Guarda da Fronteira** | Ferro | lâmina reta e larga, ferro fosco, cruz medieval com bloco central, cabo de couro, disco de pomo |
| **Cimitarra de Damasco** | Damasco | barriga curta, lâminas onduladas visíveis no aço, guarda curva em bronze, trançado escuro |
| **Lua Silenciosa** | Oriental | sori contínuo, perfil fino, bo-hi deslocado à espinha, kissaki em cinzel, tsuba, tsukamaki vermelho |
| **Folha de Aereth** | Élfica | lâmina foliar (cintura + ventre), prata pálida, guarda-folha, gema no pomo e na lâmina |
| **Queda de Asterion** | Meteórica | sabre escuro com inclusões minerais, asas douradas, fio de ouro na empunhadura |

Onde aparecem nas evidências: `G.png` (linha DNA) e `H.png` (macro hilt / meio / ponta).

---

## 7. COBERTURA DAS NOVE FAMÍLIAS (VERIFIED)

Todas as nove têm gramática própria em `FAMILY_GRAMMAR` (largura, taper, curvatura/expoente/início,
perfis de gume/espinha/ponta, seção, sangradouro, chanfro, acabamento, oxidação, padrão, densidade
ornamental, metal de guarda/pomo, pool de peculiaridades):
Ferro do Ferreiro · Aço do Reino · Damasco · Oriental · Élfica · Rúnica · Meteórica · Imperial ·
Antiga/Relíquia.

Prioridade de polimento: as cinco primeiras (canônicas). As demais estão implementadas e testadas,
com menos iteração visual — declarado como limitação em §12.

---

## 8. MATRIZES VISUAIS (evidências preservadas)

Pasta: `experiments/M02-weapon-dna/evidence/` (regenerar com `node experiments/M02-weapon-dna/capture.mjs`)

| Arquivo | Matriz | Conteúdo |
|---|---|---|
| `A.png` | FAMÍLIAS | 1 arma por família (9), mesma faixa de qualidade |
| `B.png` | QUALIDADE | mesma espada em q35 / q68 / q96 |
| `C.png` | INDIVIDUALIDADE | 6 armas de Damasco com identidades distintas (componentes, massa, história) |
| `D.png` | COMPONENTES | mesma lâmina com guardas/cabos/pomos diferentes |
| `E.png` | ATRIBUTOS | ofensiva / defensiva / ágil |
| `F.png` | ESCALA | card (180px) / inspeção (420px) / apresentação (900px) |
| `G.png` | LEGADO VS DNA | as 5 canônicas: `drawFinishedSword` (topo) vs DNA (base) |
| `H.png` | TRÊS DISTÂNCIAS | macro de punho, meio da lâmina e ponta (2× supersampling) |
| `manifest.json` | — | métricas por matriz, bbox por arma, hash do build, browser, warnings |
| `benchmark.json` | — | números de §12 |

**Comparação honesta com o legado:** no `G.png` o legado desenha as 9 famílias praticamente com a
mesma silhueta de lâmina (só muda cor/tip), não escala largura com `lengthPx` e tem cabos
desproporcionais. O DNA entrega silhuetas distintas, seção metálica, punho proporcional e se
mantém legível em 180 px. **Não** é uma diferença de "brilho": é geometria.

---

## 9. MATERIAIS E RUNAS (VERIFIED visualmente)

- Liga define paleta, acabamento (rough→mirror limitado pela qualidade), polimento, oxidação e padrão.
- Padrões recortados pela silhueta e seguindo o eixo curvo: `damascus-waves`, `damascus-ripple`,
  `meteor-stars`, `meteor-veins`, `blacksteel-bands`, `ancient-veining`, `elven-sheen`,
  `royal-grain`.
- Runas em 4 passos (sulco → realce unilateral → preenchimento → emissão ≤ 0.40 dentro do canal),
  posicionadas/rotacionadas pela tangente local, nunca cruzando a guarda.
- Inscrição: altura de glifo ≤ ~0,20 da largura local da lâmina; em qualidade baixa é gravação
  física oxidada, sem preenchimento.

---

## 10. COMPATIBILIDADE COM O RENDER LEGADO

- `src/game/swordDraw.ts` **intacto**. Nenhuma assinatura alterada.
- `rendererAdapter.ts`: `?weaponRender=dna` na URL ou
  `localStorage["fioforja.weaponRenderMode"]="dna"`. **Padrão = legacy.**
- Lâminas quebradas continuam no renderizador legado (o DNA ainda não tem fratura própria).
- Nenhum campo novo no save; nenhuma migração.

---

## 11. INSTRUÇÕES DE INTEGRAÇÃO (para o próximo agente)

### 11.1 Ligar o modo experimental (já implementado)
```
https://<app>/?weaponRender=dna      // ou localStorage.setItem("fioforja.weaponRenderMode","dna")
```
Telas já ligadas de forma opt-in (sem alterar o comportamento padrão):
`src/game/screens/RevealScreen.tsx` e `src/game/screens/GalleryScreen.tsx` (função `Thumb`).

### 11.2 Nova tela / card
```ts
import { isWeaponDnaEnabled } from "../visuals/rendererAdapter";
import { drawWeaponGenome, fitWeaponViewport, weaponGenomeFor } from "../visuals/weaponRenderer";

if (isWeaponDnaEnabled()) {
  const genome = weaponGenomeFor(sword);
  drawWeaponGenome(ctx, genome, fitWeaponViewport(genome, w, h), { runicCharge: 0.3, lightOffset: 0.5 });
} else {
  drawFinishedSword(ctx, sword.design, w / 2, h * 0.58, len, legacyOpts);
}
```

### 11.3 Tornar DNA o padrão (quando o QA visual aprovar)
1. Trocar o default em `resolveWeaponRenderMode()` de `"legacy"` para `"dna"`.
2. Rodar `npm test` + `npx tsc --noEmit` + captura das matrizes.
3. Comparar `G.png` (legado vs DNA) em dispositivo real; se aprovado, remover o fallback legado das
   telas migradas (o arquivo `swordDraw.ts` pode continuar existindo para telas não migradas).
4. Avaliar a otimização de custo descrita em §12 antes de usar em listas grandes redesenhas por frame.

### 11.4 Links a adicionar em `docs/AI-START-HERE.md` (não editei esse arquivo de governança)
- `docs/specs/weapon-visual-dna.md` — especificação do motor
- `docs/HANDOFF-DEEPSEEK-WEAPON-DNA.md` — este handoff
- `experiments/M02-weapon-dna/README.md` — como regenerar as evidências
- `src/game/visuals/weaponGenome.ts` — contrato do genoma (leitura obrigatória antes de mexer em arte)
- Sugestão de linha no índice: "Renderização de armas: `src/game/visuals/` (Weapon DNA) é a camada de
  identidade visual; `swordDraw.ts` é o renderizador legado mantido por compatibilidade."

---

## 12. BENCHMARKS (VERIFIED, com ressalva)

Ambiente: Chromium 149 headless (Playwright 1228), Canvas 2D real, Ryzen 5 5600, 16 GB RAM,
deviceScaleFactor 1. Artefato: `experiments/M02-weapon-dna/evidence/benchmark.json`.

| Métrica | Valor |
|---|---|
| Derivação do genoma | **20,4 µs / arma** (520 iterações, p95 30 µs) |
| Construção de geometria a frio | **279,5 µs / arma** (220 iterações, cache limpo, p95 500 µs) |
| Draw com geometria cacheada @180px | **0,92 ms / frame** (p95 1,20) |
| Draw com geometria cacheada @420px | **0,78 ms / frame** (p95 1,10) |
| Draw com geometria cacheada @900px | **0,76 ms / frame** (p95 1,10) |
| Galeria: 24 armas DNA em 1 canvas 1400×900 | **21,5 ms / frame** (~0,89 ms/arma) |
| Mesma galeria com renderizador legado | **1,08 ms / frame** (~0,045 ms/arma) |

**Ressalva honesta:** o DNA custa ~20× mais por desenho que o legado (21,5 ms vs 1,08 ms para 24
armas). A geometria é cacheada
(LRU 240), portanto o custo de 275 µs é pago **uma vez por arma**; mas as camadas de pintura
(padrões, runas, filigrana) continuam custando ~0,9 ms por arma por desenho. Isso é adequado para
cards desenhados **uma vez** ao montar a tela (galeria, revelação, inspeção) e **não** é adequado
para animar 24 armas a 60 fps. Otimização proposta (não implementada): nível de detalhe automático
por `viewport.lengthPx` (pular marca do ferreiro, microdefeitos e filigrana abaixo de ~220 px),
o que deve derrubar o custo de card em ~40–50 %. Não foi implementada para não arriscar regressão
visual no fim da sessão.

---

## 13. LIMITAÇÕES REAIS

1. **Integração é opt-in.** A aparência padrão do jogo continua a legada. Não há botão de UI; a
   seleção é por URL/localStorage.
2. **Lâminas quebradas** usam o renderizador legado (sem fratura/estilhaço no DNA).
3. **Custo de pintura** (§12): adequado a desenho estático, não a 24 armas por frame.
4. **Famílias fora das cinco canônicas** têm gramática e testes, mas menos iteração visual.
5. **Design Screen / ForgeCanvas** continuam no renderizador legado (peça em forja, não arma final).
6. **Damasco/meteorito** são convincentes, mas não fisicamente simulados: são padrões determinísticos
   derivados da liga, não simulação metalográfica.
7. **Nenhum campo novo no save**: toda a identidade visual vem de dados existentes. Se no futuro
   quisermos "assinatura de forja" persistida (ex.: marca única escolhida pelo jogador), será preciso
   um campo novo — hoje a assinatura é derivada e, portanto, estável mas não editável.
8. A matriz H é macro de laboratório; a legibilidade em telas pequenas reais (390 px) foi avaliada por
   matriz F (card 180 px), não em dispositivo físico.

---

## 14. PRÓXIMOS PASSOS SUGERIDOS (PROPOSED)

1. QA em dispositivo real com `?weaponRender=dna`; decidir se vira padrão.
2. Implementar LOD por escala (§12) e re-benchmarkar.
3. Implementar fratura de lâmina no DNA para eliminar o fallback em `structuralState="broken"`.
4. Migrar `DesignScreen` (preview do projeto) para o DNA — hoje aceita `{ design }` sem `FinishedSword`.
5. Persistir uma "assinatura do ferreiro" por arma (campo opcional retrocompatível) se o produto
   quiser que a marca seja escolhida/evoluída em vez de derivada.
6. Estender a matriz C para 6 armas por família (hoje só Damasco) como teste de diversidade contínuo.
