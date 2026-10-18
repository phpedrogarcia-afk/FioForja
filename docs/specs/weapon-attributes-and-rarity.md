# Especificação Técnica — Atributos e Raridade das Armas
## FioForja — Separação entre Projeto, Atributos Físicos e Qualidade

**Decisão Referência:** `FIOFORJA-WEAPON-INDIVIDUALITY-001`

---

## 1. Os Quatro Atributos Físicos de Combate

Cada espada forjada no FioForja possui quatro estatísticas primárias derivadas da sua geometria, dos materiais constituintes e da precisão metalúrgica:

### 1. `P.ATK` (Poder de Ataque Físico)
- **Definição:** Dano de corte e penetração causado pela lâmina.
- **Fatores Físicos Determinantes:**
  - *Dureza do Aço (`steel.hardness`):* Aço meteórico, damasco e blacksteel possuem maior retenção e limite de tensão.
  - *Largura e Massa do Perfil (`profile.width`):* Espadas largas (claymore, falchion) acumulam maior energia cinética.
  - *Afiação do Bisel (`physicalProfile.bevelSharpness`):* Quanto mais golpes centrados no gume, maior a nitidez de corte.
  - *Qualidade da Forja e Martelo:* A precisão dos golpes na zona central e de ponta modula o fator de corte.
- **Fórmula de Cálculo:**
  $$\text{P.ATK} = \text{round}\left((100 + \text{hardness} \times 140 + \text{width} \times 60) \times (0.75 \times \frac{Q}{100} + 0.25 \times \frac{\text{forgeScore}}{100})\right) + \text{upgradeBonus}$$

### 2. `DEF` (Capacidade Defensiva e Aparo)
- **Definição:** Capacidade da lâmina de absorver impactos, aparar golpes inimigos e manter rigidez sem flexão excessiva.
- **Fatores Físicos Determinantes:**
  - *Espessura da Lâmina e Ricasso:* Golpes na base reforçam a integridade da guarda.
  - *Têmpera Térmica (`quenchScore`):* A formação correta de martensita confere resiliência contra deformação.
  - *Penalidade de Empenamento (`warp`):* Lâminas tortas sofrem penalidade drástica de defesa.
- **Fórmula de Cálculo:**
  $$\text{DEF} = \text{round}\left((60 + \text{width} \times 75 + \frac{\text{quenchScore}}{100} \times 55) \times \frac{Q}{100} \times \max(0.4, 1 - \text{warp} \times 0.5)\right)$$

### 3. `AGI` (Agilidade e Manejo de Manuseio)
- **Definição:** Velocidade de recuperação, controle dinâmico e resposta no punho do combatente.
- **Fatores Físicos Determinantes:**
  - *Comprimento e Leveza:* Espadas mais curtas ou com afilamento distal correto (`distalTaper`) são mais rápidas.
  - *Alinhamento Espinhal (`warp`):* Uma lâmina desalinhada perde o centro de gravidade neutro.
  - *Presença de Sangradouro (`fullerDepth`):* O canal central reduz a massa da lâmina mantendo a rigidez, conferindo bônus direto de AGI.
- **Fórmula de Cálculo:**
  $$\text{AGI} = \max\left(15, \text{round}\left((75 + \text{lightness} \times 45) \times \text{alignmentBonus} \times (0.65 + Q \times 0.0035)\right)\right)$$

### 4. `DUR` (Durabilidade Estrutural)
- **Definição:** Resistência à fadiga e quebra em combate prolongado (0 a 100).
- **Fatores Físicos Determinantes:**
  - Têmpera uniforme, ausência de trincas e afiações de bancada no punho.
- **Fórmula de Cálculo:**
  $$\text{DUR} = \max\left(15, \min\left(100, \text{round}\left(\text{quenchScore} \times 0.55 + Q \times 0.45 - \text{warp} \times 30\right) + \text{upgradeDurBonus}\right)\right)$$

---

## 2. A Lógica de Raridade

Raridade não é uma cor pintada sobre qualquer espada. Existem quatro dimensões de raridade:
1. **Raridade de Projeto:** A classe natural da família (e.g. Ferro do Ferreiro é natural Comum → Rara; Damasco é Rara → Lendária; Élfica é Rara → Relíquia).
2. **Raridade do Material e Componentes:** Materiais nobres (Meteoro, Prata Élfica, Liga Antiga) elevam o teto do projeto.
3. **Qualidade de Execução (Rank):** A nota da forja (Defeituosa 0–39, Regular 40–59, Boa 60–74, Superior 75–87, Magistral 88–94, Obra-prima 95–100).
4. **Raridade Resultante da Arma:** Determinada pela combinação do projeto + materiais + maestria da execução:
   - Para ser **Lendária**, a arma exige material nobre (`meteor`, `damascus`, `elven_silver`, `blacksteel` ou famílias `imperial`/`oriental`) **E** execução de Obra-prima ($Q \ge 95$).
   - Para ser **Relíquia**, a arma exige liga mitológica (`ancient_alloy`) ou núcleo de fusão arcaico **E** execução Magistral ($Q \ge 88$).
   - Uma espada de Ferro comum nunca atinge Lendária apenas por tirar nota 96; ela atinge sua expressão máxima como **Rara de Obra-prima** (honesta, perfeita em sua classe).
