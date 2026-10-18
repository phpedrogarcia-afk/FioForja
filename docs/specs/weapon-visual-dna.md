# FioForja — Weapon Visual DNA
## Especificação permanente do motor de morfologia artística determinística

> Status: **IMPLEMENTED / VERIFIED** (ver \`docs/HANDOFF-DEEPSEEK-WEAPON-DNA.md\` para o estado exato
> e para as evidências visuais). Branch: \`deepseek/weapon-dna-engine-v1\`.
>
> Legenda de proveniência das decisões:
> - **USER-APPROVED** — exigido explicitamente na operação (briefing da missão).
> - **AGENT-DESIGNED** — decisão técnica/estética tomada pela implementação, dentro das
>   restrições da Bíblia Estética.
> - **IMPLEMENTED** — código em \`src/game/visuals/\`.
> - **VERIFIED** — coberto por teste automatizado e/ou evidência visual preservada.
> - **PROPOSED** — desenhado, ainda não integrado ao fluxo real do jogador.

---

## 1. Objetivo (USER-APPROVED)

Duas armas do mesmo projeto não podem parecer a mesma arma pintada de outra cor. A nota da forja,
a família, o material, os componentes e os atributos precisam **moldar a forma física**.

> THE WEAPON IS THE HERO. GEOMETRY BEFORE GLOW. QUALITY MUST LEAVE A MARK.

O motor consome apenas dados já persistidos (\`FinishedSword\`, \`SwordDesign\`,
\`PhysicalBladeProfile\`, atributos de combate, componentes instalados, afixos). **Nenhum campo é
adicionado ao save.** Nenhum atributo é recalculado: P.ATK / DEF / AGI / DUR entram como entrada e
são *interpretados* como morfologia.

---

## 2. Invariantes (USER-APPROVED → VERIFIED)

1. **Determinismo absoluto.** Mesma arma → mesmo genoma → mesma geometria → mesma aparência.
   Nada de \`Math.random()\`, \`Date.now()\` ou estado de frame. (Ver §5.)
2. **Geometria antes de efeito.** Silhueta, seção e proporção são resolvidas antes de qualquer
   gradiente. Nenhum brilho pode compensar geometria ruim.
3. **Qualidade deixa marca física.** Simetria, afiação, alinhamento da ponta, empenamento,
   polimento, canal, inscrição, quantidade de defeitos.
4. **Atributos viram forma.** Ofensiva = massa e taper; Defensiva = raiz reforçada e guarda;
   Ágil = lâmina esguia e mais curva.
5. **Componente trocado muda só o componente.** Sub-seeds separados por subsistema (§5.3).
6. **Sem neon, sem plástico, sem ruído uniforme, sem arma colorida por raridade.**
7. **Estabilidade de compatibilidade.** Armas antigas sem \`physicalProfile\`, sem atributos ou sem
   \`combatRole\` continuam renderizando (caminho degradado, nunca quebrado).
8. **Nada do domínio da Operação 04.** Sem tocar economia, loot, fusão, progressão, carreira,
   persistência.

---

## 3. Arquitetura (IMPLEMENTED)

\`\`\`
src/game/visuals/
  math.ts             determinismo: hash FNV-1a, mulberry32, clamp/lerp/smoothstep, quantise
  types.ts            contrato de dados (Pt, BladeStation, WeaponGeometry, viewport, camadas)
  weaponGenome.ts     GENOMA: deriveWeaponVisualGenome(source) → WeaponVisualGenome
  geometry.ts         GENOMA → geometria pura (centro, larguras, ponta, guarda, cabo, pomo, paths)
  materials.ts        liga, seção, chanfros, sangradouro, padrões de aço, oxidação, cabo/guarda/pomo
  ornamentation.ts    incisão rúnica, filigrana, brasões, incrustações do cabo
  qualityMarks.ts     gume, defeitos de forja, trincas, marca do ferreiro
  weaponRenderer.ts   orquestração de camadas, cache de geometria, viewport, calor de forja
  rendererAdapter.ts  ponte opt-in com src/game/swordDraw.ts (modo legacy|dna)
\`\`\`

Fluxo: \`FinishedSword\` → \`deriveWeaponVisualGenome\` → \`buildWeaponGeometry\` (cacheado) →
pipeline de camadas → Canvas 2D.

**Separação de responsabilidades (AGENT-DESIGNED):** \`weaponGenome.ts\` não desenha; \`geometry.ts\`
não desenha; os módulos de superfície desenham mas não decidem forma; \`weaponRenderer.ts\` decide
ordem, oclusão e transformação. Isso permite reconstruir apenas o que muda.

---

## 4. Esquema do genoma (IMPLEMENTED)

\`WeaponVisualGenome\` (versão 1):

| Seção | Campos | Fonte | Papel |
|---|---|---|---|
| \`identity\` | nome, família, perfil, aço, guarda, cabo, pomo, raridade, grau, papel de combate | \`SwordDesign\` + derivados | rótulos e gramática |
| \`quality\` | score, grau, tier, simetria, polimento, warp, cracks, defeitos{hammer,chips,scale,pits,scratches}, edgeWaver, alignmentOffset | \`quality\`, \`warp\`, \`cracks\`, \`physicalProfile\`, \`structuralState\` | execução física |
| \`silhouette\` | comprimento, larguras (base/meio/ponta), distal taper, curvatura/expoente/início, assimetria, perfis de gume/espinha/ponta, ricasso, wobble | família + perfil + forja + atributos | **forma** |
| \`structure\` | seção (flat/diamond/lenticular/hexagonal/fullered/channelled), espinha, crista, sangradouro (estilo/início/fim/largura/offset/profundidade/duplo), chanfros, transições, reforço de raiz | família + \`fullerDepth\`/\`bevelSharpness\` | **volume** |
| \`mount\` | guarda (arquétipo, span, espessura, curva dos quilhões, metal, ornamento, langets), cabo (comprimento, largura, enrolamento, cor, nervuras, ferrules, conicidade), pomo (arquétipo, raio, metal, gema), ornamentos (densidade, fio, incrustação, filigrana) | componentes + qualidade | **montagem** |
| \`surface\` | liga, paleta HSL (base/realce/sombra/gume/reflexo/têmpera), acabamento (rough→mirror), polimento, oxidação, padrão, densidade/fase/contraste, marcas de martelo, lustre, fase do grão | \`STEELS\` + família + qualidade | **material** |
| \`inscriptions\` | texto renderizado (futhark ou latim), símbolo, script, posição, profundidade, largura do sulco, preenchimento, emissão, composição, orientação | \`inscription\`, \`runes\`, \`runeSymbol\`, raridade, qualidade | **inscrição** |
| \`individuality\` | seed, sub-seeds (blade/surface/guard/grip/pommel/inscription/mark), assinatura textual, peculiaridades, marca do ferreiro, artesania | hash da identidade persistente | **identidade** |
| \`provenance\` | ATK/DEF/AGI/DUR, papel, raridade, afixos, perks, flaws, refinos, raridade de componentes, integridade | \`FinishedSword\` | **contexto** |

---

## 5. Derivação determinística (IMPLEMENTED → VERIFIED)

### 5.1 Semente
\`weaponVisualSeed(source) = FNV-1a(visualIdentityKey(source))\`, onde a chave é a **identidade
persistente** já existente: \`id\`, nome, família, perfil, aço, cabo, guarda, pomo, inscrição,
runas/símbolo, comprimento (3 casas), qualidade (inteiro), warp (3 casas), cracks, grau,
estado estrutural.

**Por que esses campos:** são estáveis entre sessões (persistidos) e são exatamente os que o
jogador reconhece como "esta arma". Campos voláteis (recompensas pendentes, flags) não entram.
O \`design\` bruto é usado — não a versão resolvida por componentes — para que trocar um componente
não recrie a microvariação da lâmina.

### 5.2 Nenhum RNG não determinístico
Todo detalhe "orgânico" (fase de dobra, marca do ferreiro, nervura do cabo) sai de
\`makeGenomeRng(subSeed)\` sobre mulberry32. Nenhum \`Math.random()\` no motor.

### 5.3 Sub-seeds por subsistema
\`\`\`
blade       = H(seed | "blade")
surface     = H(seed | "surface")
guard       = H(seed | "guard:"  + design.guard)
grip        = H(seed | "grip:"   + design.wrap)
pommel      = H(seed | "pommel:" + design.pommel)
inscription = H(seed | "inscription:" + design.inscription)
mark        = H(seed | "maker-mark")
\`\`\`
Consequência verificada: a substituição de um componente instalado (guarda, pomo, cabo) altera
apenas os campos de \`mount\` correspondentes e a geometria que deles depende; lâmina, superfície,
padrão de aço e marca do ferreiro permanecem idênticos.

### 5.4 Cache de geometria
\`weaponRenderer\` mantém LRU (240 entradas) indexado por **fingerprint numérico** (FNV sobre os
campos do genoma que realmente movem a geometria). Frames repetidos não reconstroem paths.
\`clearWeaponGeometryCache()\` / \`weaponGeometryCacheSize()\` expostos para testes e profiling.

---

## 6. Gramática geométrica por família (AGENT-DESIGNED → IMPLEMENTED)

Cada família tem uma gramática própria em \`FAMILY_GRAMMAR\` (largura, taper, curvatura/expoente/
início, perfis de gume/espinha/ponta, seção, sangradouro, chanfro, acabamento, oxidação, padrão,
densidade ornamental, metal da guarda/pomo, pool de peculiaridades).

| Família | Silhueta | Seção | Sangradouro | Assinatura material |
|---|---|---|---|---|
| Ferro do Ferreiro | reta, robusta, ponta de lança curta | flat | single raso | ferro fosco, marcas de martelo, oxidação alta |
| Aço do Reino | reta disciplinada, taper limpo, agulha | fullered | single central | aço acetinado, grão fino, simetria |
| Damasco | curva elegante com barriga | lenticular | single | lâminas onduladas seguindo o eixo |
| Oriental | longa, fina, sori a partir de 12% | diamond | bo-hi deslocado à espinha | aço escuro, bandas de grafite, kissaki em cinzel |
| Élfica | folha: cintura em 26%, ventre em 62%, agulha | lenticular | crista (sem sulco) | prata pálida, brilho frio, filigrana fina |
| Rúnica | larga, maciça, ponta diamante | channelled | dois canais profundos | ferro escuro, canais talhados, runas profundas |
| Meteórica | sabre com barriga e clip point | hexagonal | single | inclusões minerais, pontos estelares, veios |
| Imperial | reta simétrica, taper controlado | fullered | duplo com alma | espelho, ouro como detalhe, monograma |
| Antiga / Relíquia | degraus arcaicos, cintura, ponta diamante | hexagonal | canais | liga áurea, veios antigos, restauração visível |

Restrições formais (verificadas por teste): \`halfWidth ≤ 0.076\` unidade, ponta sempre à frente do
corpo, \`guardSpan ≤ 0.26\`, cabo \`0.16–0.38\`, pomo \`0.028–0.052\`, nenhuma largura negativa.

**Cinco armas de referência (USER-APPROVED):** Guarda da Fronteira (Ferro), Cimitarra de Damasco
(Damasco), Lua Silenciosa (Oriental), Folha de Aereth (Élfica), Queda de Asterion (Meteórica).
As nove famílias são cobertas; a prioridade de polimento é dessas cinco.

---

## 7. Regras de material (IMPLEMENTED)

- A liga define **paleta** (hue/sat/luz, realce, sombra, gume, têmpera), **acabamento**
  (rough → forged → satin → polished → mirror), **polimento**, **oxidação** e **padrão**.
- O acabamento é limitado pela qualidade: uma peça de qualidade 40 nunca chega a espelho; uma peça
  de qualidade 96 chega no mínimo a acetinado.
- Padrões: \`damascus-waves\`, \`damascus-ripple\`, \`meteor-stars\`, \`meteor-veins\`,
  \`blacksteel-bands\`, \`ancient-veining\`, \`elven-sheen\`, \`royal-grain\`, \`none\`.
  Todos são **recortados pela silhueta** e seguem o eixo curvo — nenhum padrão flutua fora da lâmina.
- Prata élfica: clara, reflexo frio. Aço negro: grafite, nunca preto plano. Meteorito: escuro com
  inclusões e pontos discretos. Ferro: fosco, honesto, com oxidação.
- Osso/marfim: envelhecido, com irregularidade — nunca branco plástico. Ouro: detalhe, nunca a arma.
- Nenhum ruído uniforme sobre a imagem: os detalhes são estruturais e direcionais.

---

## 8. Regras de runas e inscrição (IMPLEMENTED)

Ordem de incisão (a runa parece **gravada**, não colada):
1. sulco escavado (escuro, com sombra deslocada);
2. realce de parede interna somente em um lado (luz direcional);
3. preenchimento pelo material do genoma (prata, ouro, óxido, vazio);
4. emissão controlada **dentro do canal**, limitada a \`≤ 0.40\`, jamais um halo.

- A inscrição acompanha a curvatura: cada glifo é posicionado e rotacionado pela tangente local.
- Faixa permitida: de 6% a 92% do comprimento; nunca atravessa a guarda.
- Composições: \`single\`, \`triad\` (Magistral+), \`band\` (Lendária), \`straight\` (Relíquia).
- Raridade não significa mais brilho: significa símbolo, precisão, material de preenchimento e
  composição ornamental.
- Runas inativas (qualidade baixa) são gravação física pura, oxidada.

---

## 9. Representação de defeitos (IMPLEMENTED → VERIFIED)

Derivados exclusivamente de dados da simulação, nunca sorteados:
- \`warp\` → curvatura indesejada do eixo (com sinal estável), desalinhamento da ponta;
- \`cracks\` → fissuras ponderadas para a raiz;
- \`physicalProfile.hammerMarksCount\` → cunhagens;
- \`physicalProfile.baseWidth/midWidth/tipWidth/distalTaper\` → seção real forjada;
- \`quality\` → simetria, polimento, chips de gume, manchas de carepa, covas, riscos, gume ondulado;
- \`structuralState\` e \`flaws\` → vocabulário de peculiaridades da identidade.

**Invariante:** se a simulação registrou pouco empenamento, a lâmina **não** é desenhada torta só
para criar variedade.

---

## 10. Performance (IMPLEMENTED → VERIFIED)

- Geometria construída **uma vez** por arma (LRU por fingerprint), não por frame.
- Sem \`Path2D\` global mutável, sem alocação por pixel, sem loops sobre a área do canvas.
- Nenhuma dependência nova. Apenas Canvas 2D.
- Números de referência e procedimento de profiling em \`docs/HANDOFF-DEEPSEEK-WEAPON-DNA.md\`.

---

## 11. Integração (IMPLEMENTED, opt-in)

\`rendererAdapter.ts\` expõe:
- \`resolveWeaponRenderMode()\` — \`?weaponRender=dna\` na URL ou
  \`localStorage["fioforja.weaponRenderMode"]\`; **padrão = "legacy"**.
- \`drawSwordByMode(ctx, sword, viewport, options)\` → \`true\` se DNA desenhou.
- \`drawDnaSwordInBox(ctx, sword, w, h)\` — preview enquadrado (laboratório).
- \`drawLegacySword(...)\` — caminho legado explícito para comparação A/B.

Nenhuma tela é migrada por padrão. \`src/game/swordDraw.ts\` permanece intacto.

---

## 12. Limitações conhecidas

Ver \`docs/HANDOFF-DEEPSEEK-WEAPON-DNA.md\` §Limitações. Em resumo: o motor é maduro para
laboratório/galeria experimental, mas a integração nas telas do jogo é **opt-in e mínima**; não
houve migração de save, nem substituição do renderizador legado.
