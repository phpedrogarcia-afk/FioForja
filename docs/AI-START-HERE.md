# FioForja — AI Start Here

Leia este mapa antes de propor ou implementar mudanças. Ele organiza a direção de produto aprovada, as evidências verificadas do código e as regras inegociáveis.

---

## 1. Documentação Essencial de Leitura Rápida

1. [Constituição](CONSTITUTION.md): missão, princípios de design (*The Weapon is the Hero*, *The Player Forges the Trophy*) e sinais de falha.
2. [Estado Atual do Projeto](PROJECT-STATE.md): estado real, evidências comprovadas do commit mais recente, o que existe e lacunas conhecidas.
3. [Invariantes](INVARIANTS.md): 12 regras de produto e integridade que nenhuma alteração de código ou agente pode violar.
4. [Registro de Decisões](DECISIONS.md): decisões canônicas aprovadas (incluindo `FIOFORJA-FUSION-001`), hipóteses e itens em avaliação.
5. [Glossário](GLOSSARY.md): termos canônicos de produto e seus correspondentes exatos no código TypeScript.
6. [Handoff para o Codex](HANDOFF-CODEX.md): contrato completo de transição e continuidade entre agentes de IA.

---

## 2. Documentos Canônicos de Design (`docs/canon/`)

- [Bíblia Estética](canon/estetica.md): regras visuais das lâminas, acabamento de metal, incisão rúnica chanfrada e as 9 famílias canônicas.
- [Estrutura da Galeria](canon/galeria.md): os 8 pilares canônicos (Arsenal, Compêndio, Componentes, Runas, Oficina, Crisol de Fusão, Legado e Encomendas).
- [Sistema Híbrido de Fusão (Opção C)](canon/fusao-hibrida.md): regras do Crisol de Fusão de componentes e espadas (núcleos que exigem forja).
- [Motor de Loot e Drops](canon/loot-drops.md): tabelas reais de recompensas, categorias, probabilidades por rank e integridade de sorteio.
- [Economia e Moedas](canon/economia.md): ganhos em tempo real na bigorna (+3/+8/+12 ouro), prêmios balanceados, insumos e encomendas.

---

## 3. Especificações Técnicas (`docs/specs/`)

- [Atributos Físicos e Lógica de Raridade](specs/weapon-attributes-and-rarity.md): cálculo de `P.ATK`, `DEF`, `AGI`, `DUR`, afixos e separação estrita entre nota de forja e raridade.
- [Persistência v5 e Migração](specs/save-persistence-v5.md): schema v5, migração retrocompatível de v1–v4, idempotência transacional e capacidade do Arsenal.
- [Assinaturas de Áudio Procedural](specs/audio-signatures.md): síntese procedural via Web Audio API para moedas, fanfarras de loot e crisol.
- [Modelo de Identidade das Armas](specs/weapon-identity-model.md): características das famílias e anatomia das armas.
- [Weapon Visual DNA](specs/weapon-visual-dna.md): contrato do motor opt-in; correções de integração na seção inicial.
- [Estado da Lâmina Terminada](specs/finished-weapon-state.md): preservação de empenamento, trincas e marcas de martelamento.

---

## 4. Evidência, Código e Testes

- O núcleo jogável reside em `src/game/`:
  - `materials.ts`: chaves primárias de insumos metalúrgicos, consumo atômico e refundição de sucata.
  - `blueprints.ts`: máquina de estados (6 estados explícitos de projetos) e critérios de desbloqueio.
  - `commissions.ts`: catálogo de encomendas da guilda e validação estrita de critérios de entrega (incluindo papel Defensiva do Capitão Valerius).
  - `transactions.ts`: executores de transações atômicas fail-closed (ciclo de vida de tentativas, cancelamento justo, fusão, forja, compra, entrega, refino).
  - `sim.ts`: física de deformação multi-zona, termodinâmica, trincas, atributos e snapshots físicos versionados. O isolamento econômico do treino é aplicado pelas transações.
  - `ForgeCanvas.tsx`: cena da forja com tenazes, martelo, bigorna, fornalha, têmpera e rastreamento de tentativas ativas.
  - `swordDraw.ts`: renderizador legado, ainda padrão; `visuals/`: Weapon DNA opt-in para armas acabadas, cache geométrico e miniaturas. A bigorna mantém seu renderizador físico.
  - `save.ts`: persistência com backup atômico, retry seguro, sanitização, migração de saves e segregação de `trainingGallery`.
  - `loot.ts`: motor dinâmico de drops e tabelas de recompensas ponderadas.
  - `fusion.ts`: motor de transmutação do Crisol de Fusão (Opção C) com blindagem contra armas de treino e encomendas.
  - `audio.ts`: sintetizador procedural de áudio sem dependências externas.
- A evidência desta branch, com contagens e limites, está no [relatório da Operação Codex 05](../experiments/M03-cross-agent-integration/README.md). Testes de API, cenários preparados e partidas reais têm escopos distintos.
- [Handoff DeepSeek](HANDOFF-DEEPSEEK-WEAPON-DNA.md) e [laboratório M02](../experiments/M02-weapon-dna/README.md) preservam a entrega do doador; não são o estado atual da integração.
- Implementação atual e direção futura permanecem distintas; os thresholds de notas do código não substituem os thresholds estéticos da Bíblia.
