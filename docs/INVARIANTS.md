# Invariantes do FioForja

Estas propriedades governam mudanças futuras. “Regra” não significa que o protótipo já a satisfaça completamente; veja o estado e as lacunas em [PROJECT-STATE.md](PROJECT-STATE.md).

1. **Habilidade não é substituída por RNG.** Sorte não pode corrigir uma execução insuficiente nem conceder sozinha prestígio raro.
2. **Qualidade precisa deixar uma marca perceptível na arma.** A nota deve corresponder a forma, alinhamento e acabamento que o jogador consiga observar.
3. **Qualidade e raridade permanecem conceitos distintos.** Uma peça bem executada não se torna automaticamente Lendária, e uma classe rara não prova qualidade de execução.
4. **Conteúdo raro exige gates de execução.** Lendárias e Relíquias precisam de conquista; Relíquias também dependem de condições especiais ou descoberta.
5. **Customização preserva identidade estética.** Componentes, materiais e runas precisam respeitar ou justificar compatibilidade com a família e a silhueta.
6. **Cada arma forjada conserva identidade própria.** Repetições do mesmo projeto não substituem automaticamente uma à outra; história e resultados da peça devem continuar associados a ela.
7. **Simulação e apresentação mantêm fronteira explícita.** A lógica de forja não deve depender do desenho em Canvas; o padrão atual separa `sim.ts`, `ForgeCanvas.tsx` e `swordDraw.ts`.
8. **Mudanças no core loop são comparadas a um baseline.** Medir resultados observáveis antes e depois; um único sucesso não demonstra confiabilidade. Ainda não há baseline registrado para a simulação atual.
