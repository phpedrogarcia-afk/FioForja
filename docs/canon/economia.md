# FioForja — Economia, Moedas e Oficina
## Especificação Canônica da Circulação de Recursos e Recompensas

**Decisão Canônica Aprovada:** `FIOFORJA-ECONOMY-001`  
**Princípio Central:** *Uma economia de artesão vivo: recompensas imediatas pelo ritmo do martelo e preços sustentáveis sem inflação descontrolada.*

---

## 1. As Três Moedas do FioForja

1. **🪙 Moedas de Ouro (Gold):** Moeda corrente da forja medieval. Utilizada para aquisição de aços básicos, contratação de insumos na oficina, afiações de bancada e taxas de operação do crisol.
2. **💎 Rubis Lapidados (Rubies):** Moeda de corte nobre e gemas de encante. Conquistada em forjas Rank A e S, afiações mestre e fusões de alto nível. Utilizada em upgrades de bancada avançados e ligas nobres.
3. **🔷 Diamantes Estelares (Diamonds):** Moeda sagrada e arcaica. Obtida exclusivamente em obras-primas lendárias (Rank S de ligas raras), fusões excepcionais e feitos de Legado. Utilizada em ferramentas de mestre e catalisadores místicos.

---

## 2. Ganho de Moedas em Tempo Real na Bigorna

O jogador é recompensado financeiramente durante o ato do forjamento. Cada golpe certeiro gera moedas que se manifestam imediatamente em áudio e texto flutuante:

| Avaliação do Golpe | Condição Metalúrgica | Ouro Concedido | Feedback Audiovisual |
|---|---|---:|---|
| **Golpe Fraco / Desalinhado** | Fora da janela térmica ou força insuficiente (<0.3) | `0 🪙` | Som oco de ferro frouxo |
| **Golpe Bom** | Dentro da faixa plástica com força média | `+3 🪙` | Tilintar metálico limpo |
| **Golpe Perfeito** | No centro da janela ideal com força sincronizada | `+8 🪙` | `+8 🪙` flutuante dourado e duplo jingle cristalino |
| **Golpe Magistral (Zona Crítica)** | Acerto de ponta ou ricasso em alta velocidade e calor máximo | `+12 🪙` | `+12 🪙` com brilho áureo e ressonância harmônica |

### Regras de Integridade de Transação dos Golpes:
- **Deduplicação de Eventos:** Cada golpe possui um `strikeIndex` incremental na sessão da forja. O sistema só credita o ouro na primeira vez que o golpe é computado pelo simulador.
- **Prevenção de Abuso:** Ficar segurando a barra de espaço ou clicando em áreas mortas não gera ouro. Somente transições validadas pelo `stepSim` emitem eventos monetários.

---

## 3. Recompensas Financeiras na Conclusão da Forja

Substituindo os valores excessivos anteriores, a escala balanceada de ouro e gemas ao abrir o baú é:

| Performance / Rank | Ouro Concedido | Rubis | Diamantes | Justificativa Econômica |
|---|---:|---:|---:|---|
| **Rank S (95–100%)** | 480 – 620 | 18 – 24 | 12 – 16 | Cobre ferramentas avançadas e 3 upgrades de bancada |
| **Rank A (88–94%)** | 280 – 380 | 10 – 15 | 6 – 8 | Permite aquisição de novos aços e insumos médios |
| **Rank B (75–87%)** | 160 – 220 | 4 – 8 | 2 – 4 | Sustenta custos de novas forjas normais |
| **Rank C (40–74%)** | 50 – 90 | 1 – 2 | 0 | Garante subsistência sem inviabilizar o jogo |
| **Lâmina Quebrada** | 15 – 25 | 0 | 0 | Valor residual simbólico de sucata vendida |

---

## 4. Tabela de Preços e Sinks de Moeda na Oficina

Para garantir que o ouro continue desejado ao longo da progressão, a Oficina e os sistemas consom moedas continuamente:

### 4.1 Refino de Bancada (Mesa de Veludo)
- Nível +1 (+8 ATK, +2 DUR): `60 Ouro`, `2 Rubis`
- Nível +2 (+16 ATK, +4 DUR): `120 Ouro`, `5 Rubis`
- Nível +3 (+24 ATK, +6 DUR): `180 Ouro`, `10 Rubis`, `2 Diamantes`

### 4.2 Ferramentas Equipáveis de Oficina
- **Marreta Pesada (`hammer_sledge`):** `250 Ouro`, `8 Rubis`
- **Bigorna de Mestre (`anvil_master`):** `750 Ouro`, `25 Rubis`, `10 Diamantes`
- **Fornalha das Chamas Azuis (`furnace_bluefire`):** `950 Ouro`, `35 Rubis`, `15 Diamantes`
- **Bacia de Têmpera em Óleo (`quench_oil`):** `600 Ouro`, `20 Rubis`, `5 Diamantes`

### 4.3 Taxa de Operação do Crisol de Fusão
- Fusão de Componentes Comuns/Incomuns: `40 Ouro`
- Fusão de Componentes Raros/Épicos: `120 Ouro`, `5 Rubis`
- Fusão de Espadas (Oportunidade Superior): `250 Ouro`, `12 Rubis`, `4 Diamantes`
