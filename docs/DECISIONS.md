# Registro de decisões

Este registro separa decisões de produto fornecidas pelo usuário de hipóteses e do comportamento que apenas existe hoje no código.

## Decisões de produto

- A forja manual baseada em habilidade permanece no centro; maior complexidade deve recompensar domínio.
- Qualidade alta deve produzir uma arma claramente mais bela. Qualidade numérica e raridade são eixos distintos.
- Raridade é conquistada. RNG não supera falta de habilidade; Lendárias são difíceis e prestigiosas; Relíquias são excepcionais e ligadas a condições especiais ou descobertas.
- Conteúdo raro deve ser conhecido e perseguível pelo jogador; maestria deve aparecer em feedback visual, sonoro e mecânico.
- Famílias precisam de identidade visual reconhecível pela silhueta; raridade não é só cor ou glow; procedural requer curadoria estética.
- A Galeria é um sistema central. Cada espada individual deve preservar identidade e história; Arsenal, Compêndio, Componentes, Runas, Oficina e Legado estão especificados em [canon/galeria.md](canon/galeria.md).
- A direção completa de materiais, formas, runas e acabamento está em [canon/estetica.md](canon/estetica.md). Consulte a fonte em vez de duplicar seus detalhes aqui.

## Decisões técnicas observadas, não decisões de produto

- A simulação atual é calculada em `src/game/sim.ts`; a cena e os HUDs são apresentados separadamente.
- Projeto e arsenal são gravados localmente; o modelo atual limita o Arsenal a 24 instâncias.
- O catálogo e os limiares atuais são valores de implementação do protótipo. Não foram aprovados como balanceamento final.

## Não decidido

- Fórmulas e limiares finais de qualidade, raridade, maestria, desbloqueios ou dificuldade.
- Número final de famílias, Lendárias, Relíquias, slots, componentes ou ferramentas.
- Como migrar do limite atual do Arsenal e qual modelo persistente deve guardar eventos da forja.
- Como resolver o recorte de composição em telas estreitas e a divergência da tecla `R` anunciada no README.
- Quais efeitos ou propriedades rúnicas existirão.

Exemplos, mockups e nomes marcados como provisórios nas fontes de design não fecham essas decisões.
