# FioForja — Sistema Híbrido de Fusão (Opção C)
## Especificação Canônica do Crisol de Fusão do Ferreiro

**Decisão Canônica Aprovada:** `FIOFORJA-FUSION-001`  
**Princípio Central:** *O jogador fabrica o troféu. Loot e fusão ampliam possibilidades; habilidade na bigorna determina o resultado.*

---

## 1. Visão Geral

A fusão no FioForja não é um cassino arbitrário nem um atalho para ignorar a forja. É um ritual de transmutação metalúrgica realizado no **Crisol da Oficina**, onde quatro itens compatíveis do mesmo escalão são combinados com auxílio de calor e catalisadores.

O sistema divide-se estritamente em duas categorias:

### A. Fusão de Componentes
- **Entrada:** Quatro componentes do mesmo tipo (4 cabos, 4 guardas, 4 pomos ou 4 runas) da mesma raridade ou raridades próximas.
- **Processamento:** O fogo do crisol une as ligas e gemas em um componente refinado.
- **Saída:** Um novo componente pronto para uso imediato no projeto de forja ou customização na mesa de veludo.

### B. Fusão de Espadas (O Pilar Híbrido)
- **Entrada:** Quatro espadas concluídas e íntegras do Arsenal do jogador.
- **Processamento:** As lâminas são desfeitas em temperatura extrema; o aço purificado concentra a essência dos materiais doadores em um lingote especial de alta densidade metalúrgica.
- **Saída:** **Uma Oportunidade de Fabricação Superior** (um `Núcleo de Fusão`, `Pré-forma Ancestral` ou `Projeto Especial`).
- **A Regra de Ouro:** A fusão de espadas **NUNCA** entrega uma espada pronta. Ela gera o **Núcleo de Forja**. O jogador é levado (ou convocado) para a bigorna com esse núcleo e deve forjá-lo com maestria manual para dar vida à arma.

---

## 2. Tabelas de Probabilidade da Fusão

### 2.1 Fusão de Componentes (4x Componentes)

| Raridade dos Itens Consumidos | Mesmo Tier (Aprimorado) | Tier Superior (+1) | Tier Máximo (+2) | Compensação por Azar |
|---|---:|---:|---:|---|
| 4x Comum | 40% (Comum Refinado) | 60% (Incomum) | 0% | +1 Fragmento de Fusão |
| 4x Incomum | 45% (Incomum Refinado) | 50% (Raro) | 5% (Épico) | +2 Fragmentos de Fusão |
| 4x Raro | 50% (Raro Refinado) | 42% (Épico) | 8% (Lendário) | +3 Fragmentos de Fusão |
| 4x Épico | 55% (Épico Refinado) | 40% (Lendário) | 5% (Relíquia) | +5 Fragmentos de Fusão |

*Nota de Proteção:* Componentes que não sobem de raridade recebem propriedades aprimoradas (e.g. maior redução de recuo para guarda, melhor aderência para cabo) além dos fragmentos acumuláveis.

### 2.2 Fusão de Espadas (4x Espadas)

| Entrada (4 Espadas) | Núcleo do Mesmo Tier | Núcleo de Tier Superior | Núcleo Lendário / Relíquia | Salva-Vidas (Bad-Luck Protection) |
|---|---:|---:|---:|---|
| 4x Comum | 40% (Núcleo Comum Reforçado) | 60% (Núcleo Incomum) | 0% | 1x Catalisador de Fusão |
| 4x Incomum | 45% (Núcleo Incomum Puro) | 48% (Núcleo Raro) | 7% (Núcleo Épico) | 2x Catalisadores de Fusão |
| 4x Raro | 50% (Núcleo Raro Supremo) | 42% (Núcleo Épico) | 8% (Núcleo Lendário) | 3x Catalisadores + Lingote Nobre |
| 4x Épico | 52% (Núcleo Épico Sagrado) | 43% (Núcleo Lendário) | 5% (Núcleo de Relíquia) | 5x Catalisadores + Metal Estelar |

---

## 3. Herança de Atributos e Tendências dos Núcleos

O Núcleo de Fusão não nasce neutro. Ele herda a memória do metal das 4 espadas consumidas:
1. **Tendência de Ataque (`P.ATK`):** Se as 4 espadas possuíam alto poder de corte (lâminas pesadas, aço meteórico ou damasco), o núcleo gerado recebe afixo `Potencial de Corte Aumentado (+10% a +25% de dano base)`.
2. **Tendência de Agilidade (`AGI`):** Se as espadas eram esguias (sabres, katanas, lâminas élficas), o núcleo confere `Equilíbrio Espectral (+15% a +30% de agilidade)`.
3. **Tendência Defensiva (`DEF` e `DUR`):** Se provinham de espadas com têmpera espessa e guardas maciças, o núcleo adquire `Têmpera Resiliente (redução de estresse na forja e +20 durabilidade)`.

*Trava de Segurança:* Os atributos **não se somam diretamente**. Evita-se assim inflação exponencial ou exploits de ciclos infinitos de fusão.

---

## 4. Proteção contra Frustração (Bad-Luck Protection)

1. **Fragmentos de Fusão (`fusion_fragment`):** Toda fusão que não atinge o tier superior concede fragmentos. 10 fragmentos podem ser trocados na Oficina por um **Catalisador Rúnico Garantido**.
2. **Reaproveitamento de Materiais:** Fusões devolvem uma parcela dos lingotes mais nobres dos itens destruídos.
3. **Transparência de Odds:** A interface do Crisol exibe exatamente as porcentagens de chance antes que o jogador clique em confirmar.

---

## 5. Regras de Segurança e Invariantes da Fusão

1. **Consumo Atômico Transacional:** Os 4 itens são removidos do inventário e o novo item adicionado na mesma operação protegida.
2. **Impedimento de Itens Equipados:** Espadas equipadas ou marcadas como favoritas/protegidas não aparecem no seletor de fusão.
3. **Bloqueio de Lâminas Quebradas:** Lâminas com integridade destruída (`broken: true`) não podem ser usadas para forçar fusões de alto escalão. Elas possuem destinação própria: reciclagem em sucata de ferro na Oficina.
4. **Anti-Duplicação:** Duplo clique ou perda de foco durante a animação do crisol não provocam consumo extra nem multiplicam os resultados.
