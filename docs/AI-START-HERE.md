# FioForja — AI Start Here

Leia este mapa antes de propor ou implementar mudanças. Ele organiza a direção de produto aprovada, as evidências verificadas do código e as regras inegociáveis.

---

## 1. Documentação Essencial de Leitura Rápida

1. [Constituição](CONSTITUTION.md): missão, princípios de design (*The Weapon is the Hero*, *The Player Forges the Trophy*) e sinais de falha.
2. [Estado Atual do Projeto](PROJECT-STATE.md): estado real, evidências comprovadas do commit mais recente, o que existe e lacunas conhecidas.
3. [Invariantes](INVARIANTS.md): 12 regras inegociáveis que nenhuma alteração de código ou agente pode violar.
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
- [Estado da Lâmina Terminada](specs/finished-weapon-state.md): preservação de empenamento, trincas e marcas de martelamento.

---

## 4. Evidência, Código e Testes

- O núcleo jogável reside em `src/game/`:
  - `materials.ts`: chaves primárias de insumos metalúrgicos, consumo atômico e refundição de sucata.
  - `blueprints.ts`: máquina de estados (6 estados explícitos de projetos) e critérios de desbloqueio.
  - `commissions.ts`: catálogo de encomendas da guilda e validação estrita de critérios de entrega.
  - `transactions.ts`: executores de transações atômicas fail-closed (fusão, forja, compra, entrega, refino).
  - `sim.ts`: física de deformação multi-zona, termodinâmica, trincas e cálculo de atributos.
  - `ForgeCanvas.tsx`: cena da forja, duas mãos de ferreiro com tenazes e martelo, bigorna, fornalha e bacia de têmpera.
  - `swordDraw.ts`: renderizador paramétrico de lâminas, guardas, cabos, pomos e incisões rúnicas.
  - `save.ts`: persistência com backup atômico, retry seguro, sanitização e migração de saves.
  - `loot.ts`: motor dinâmico de drops e tabelas de recompensas ponderadas.
  - `fusion.ts`: motor de transmutação do Crisol de Fusão (Opção C).
  - `audio.ts`: sintetizador procedural de áudio sem dependências externas.
- Testes automatizados executam via `npm test` e `npm run typecheck`. Não presuma funcionalidade sem verificação real.
