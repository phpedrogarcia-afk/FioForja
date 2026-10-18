# Win: Conquistas Técnicas e de Design — Arsenal Vivo Hardening

**Data:** 18 de Outubro de 2026  
**Contexto:** Hardening estrutural e consolidação de sistemas (Missão 01.1)  
**Módulos:** `src/game/fusion.ts`, `src/game/sim.ts`, `src/game/screens/FusionStationScreen.tsx`, `src/game/screens/RevealScreen.tsx`, `src/game/GameApp.tsx`

---

## 1. Salto Excepcional (+2 Rarity Tiers) com Probabilidades Canônicas
- **Conquista:** O Crisol de Fusão agora implementa 3 patamares de transmutação em vez de apenas 2:
  - **Refinado (Mesmo Tier):** Núcleo com bônus de qualidade aprimorado (+5% a +8%).
  - **Superior (+1 Tier):** Subida de um rank de raridade (e.g. Incomum → Rara, Rara → Épica, Épica → Lendária).
  - **Excepcional (+2 Tiers):** Salto de dois ranks de raridade sob bênção de catalisador astral (e.g. 4 Raras transmutadas diretamente em Núcleo Lendário com bônus de qualidade de +15%).
- **Evidência:** 5.000 fusões executadas no simulador de Monte Carlo com distribuição estatística exata à tabela canônica de `docs/canon/fusao-hibrida.md`. Probabilidades canônicas exibidas de forma reativa na interface (`FusionStationScreen.tsx`).

---

## 2. Herança Genética Completa do FusionCore na Bigorna
- **Conquista:** Quando o jogador seleciona um núcleo forjado e o leva para a fornalha, o núcleo não atua apenas como um selo estático. Ele injeta ativamente:
  - Herança de perks ancestrais das 4 espadas doadoras (`inheritedPerks`).
  - Bônus físico aditivo de qualidade (`bonusQuality`) somado à nota de forja.
  - Patamar de raridade garantido como piso estrutural.
  - Registro de pedigree em `FusionHistory` (`coreId`, `parentIds`, `inheritedRarity`), permitindo rastrear a linhagem da arma na Galeria.

---

## 3. Bancada Interativa de Montagem na Inspeção de Veludo
- **Conquista:** A mesa de inspeção em veludo azul-escuro (`RevealScreen.tsx`) foi estendida com a "Bancada de Montagem & Personalização", permitindo equipar diretamente guardas, pomos, empunhaduras e runas do inventário na arma inspecionada.
- **Impacto Visual e Físico:** Cada instalação altera instantaneamente a geometria renderizada no canvas (via `swordDraw.ts`) e recalcula os atributos de combate (`P.ATK`, `DEF`, `AGI`, `DUR`), preservando imutáveis a qualidade da forja, marcas de têmpera e eventuais trincas.

---

## 4. Ouro por Golpe Resiliente e Anti-Exploit
- **Conquista:** Os ganhos de ouro durante a forja na bigorna utilizam IDs determinísticos únicos com escopo de execução `${forgeRunId}:${strikeIndex}` e rastreamento em `claimedStrikeRewardIds`.
- **Efeito:** Jogadores não podem duplicar moedas retendo cliques ou recarregando o canvas. O som procedural e o feedback visual de moedas flutuantes permanecem sincronizados com os dados persistidos na carteira.
