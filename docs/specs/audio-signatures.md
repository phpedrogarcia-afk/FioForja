# Especificação Técnica — Assinaturas de Áudio Procedural
## FioForja — Síntese Web Audio API Sem Dependências Externas

---

## 1. Princípios da Direção Sonora

O FioForja utiliza síntese em tempo real com osciladores e ruídos via `AudioContext` nativo da Web Audio API. O áudio deve transmitir o peso dos metais, o estalar do carvão e o prestígio das conquistas sem ser estridente ou cansativo.

---

## 2. Novas Assinaturas Sonoras da Missão Arsenal Vivo

### 2.1 Moedas na Forja (`playCoinJingle()`)
- **Frequência:** Par de ondas senoidais em registro agudo (2093 Hz e 2637 Hz, C7 e E7).
- **Envelope:** Ataque ultrarrápido (0.002s) e decaimento exponencial curto (0.12s).
- **Propósito:** Notificar acertos excelentes na bigorna (`+3`, `+8`, `+12 🪙`) sem mascarar o retinir do martelo.

### 2.2 Fanfarras de Loot por Raridade (`playLootFanfare(rarity)`)
- **Comum:** Toque rápido limpo em onda triangular (G5, 784 Hz, 0.15s).
- **Incomum:** Acorde duplo suave (G5 + B5, 0.22s).
- **Rara:** Tríade ascendente cristalina (G5 → B5 → D6, 0.35s).
- **Épica:** Arpejo menor harmônico rico com chorus sutil (D5 → F#5 → A5 → D6, 0.5s).
- **Lendária:** Fanfarra majestosa com corpo de onda quadrada filtrada em passa-baixas simulando metais nobres (C5 → G5 → C6 → E6 com sustentação de 0.8s e vibrato sutil).
- **Relíquia:** Ressonância profunda de bordão arcaico com harmônicos subgraves (110 Hz → 220 Hz com envelope de sino antigo e decaimento de 1.4s).

### 2.3 Crisol de Fusão (`playFusionHum()` e `playFusionSuccess()`)
- **Aquecimento do Crisol:** Ressonância contínua crescente de 180 Hz a 440 Hz com ruído branco filtrado simulando o borbulhar de metal fundido.
- **Transmutação Bem-Sucedida:** Explosão luminosa com acorde ascendente e estalo de forja.
