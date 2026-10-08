# M01-R3B — Tela ideal da forja

**Status:** especificação canônica do alvo para implementação experimental futura; não descreve funcionalidade já entregue nem aprova o candidato M01-R2 para `main`. Detalhes de perspectiva, evolução da peça, identidade das famílias e persistência estão nos modelos de [forja](forge-visual-model.md), [identidade](weapon-identity-model.md) e [arma terminada](finished-weapon-state.md). A [Constituição](../CONSTITUTION.md) e os [invariantes](../INVARIANTS.md) governam este alvo.

## 1. Propósito e evidência

A tela da forja é a **experiência jogável central**. Em cada momento deve sustentar simultaneamente: imersão (“estou fabricando uma arma”), clareza (“sei o que fazer agora”), tensão (“um erro sério pode destruir esta tentativa”), maestria (“minhas decisões mudam a peça”) e antecipação (“quero descobrir o resultado”). **THE WEAPON IS THE HERO.** O jogador olha sobretudo para a peça; interface e efeitos a explicam sem disputar protagonismo.

**CURRENT — HEAD `1a390c9`:** [ForgeCanvas](../../src/game/ForgeCanvas.tsx) usa cena lateral 1280×720 com recorte `cover`; o foco retrato na fase de calor e a elevação da mão em repouso são o candidato M01-R2. [sim.ts](../../src/game/sim.ts) executa `heat → forge → quench`, força por segurar/soltar, reaquecimento numérico dentro de `forge`, até oito golpes, `shape`, `warp` e nota. Erros reduzem forma/nota ou aumentam empenamento, mas **não existe dano estrutural, risco de quebra, peça quebrada ou derrota terminal**; a têmpera encerra a partida e salva uma `FinishedSword`. [ForgeHud](../../src/game/screens/ForgeHud.tsx) mostra calor, forma, golpes/qualidade, medidor de força e controles de fase; não mostra risco de quebra nem percurso espacial. [swordDraw](../../src/game/swordDraw.ts) não representa dano estrutural. O [estado M00](../PROJECT-STATE.md) é um snapshot histórico anterior aos experimentos, não substitui este HEAD.

**EVIDÊNCIA / LIMITE:** [M01-R1](../../experiments/M01-R1-visual-baseline.md) mediu peça fora do calor em retrato, oclusão alta no repouso e expressão fraca de `quality`. [M01-R2](../../experiments/M01-R2-forge-composition.md) levou a peça aquecida a 100% de presença no recorte retrato e o repouso a cerca de 31% de sobreposição, dentro da amostra. A revisão humana fornecida aceita mão/atmosfera, mas considera câmera, colocação, legibilidade da peça no fogo, fluxo e espadas finais insuficientes. Percentuais de máscara não provam leitura humana.

## 2. Cena, câmera e hierarquia

Hierarquia contínua: **1 peça/espada → 2 bigorna e região ativa de contato → 3 mão/martelo → 4 fornalha, banho e oficina → 5 HUD**. O martelo pode dominar *brevemente* na carga final e no impacto; em repouso deixa visíveis eixo, gume e ponta. Preservar a sensação de peso e o gesto em primeira pessoa já úteis no protótipo.

**TARGET:** ferreiro diante da bigorna, câmera ligeiramente elevada e oblíqua para baixo, mostrando o **topo** da superfície de trabalho e a profundidade da lâmina. A posição de trabalho precisa revelar comprimento, forma aproximada, ponto de contato e trajetória do martelo. A câmera acompanha estações quando necessário, mas a mesma peça permanece rastreável; corte ou reposicionamento só são aceitáveis se a origem e o destino forem inequívocos. A solução exata de trajetória/interpolação é **UNKNOWN** e deve ser experimentada. Não fixar coordenadas finais de pixels neste documento.

| Elemento físico | Papel obrigatório na leitura |
|---|---|
| Fornalha | Fonte visível de calor; boca e peça ocupam o mesmo espaço compreensível durante aquecimento/reaquecimento. |
| Bigorna | Superfície central e âncora de câmera/impacto; a lâmina repousa sobre ela, sem parecer flutuar diante do cenário. |
| Banho de têmpera | Recipiente reconhecível dentro da oficina; destino da lâmina quente, com contato e imersão visíveis. |
| Mão e martelo | Objeto de ação em primeiro plano, vindo da direita/superior direita; peso, arco e impacto legíveis, sem oclusão permanente. |
| Peça | Objeto contínuo entre estações; comprimento, base/espiga e futura ponta rastreáveis mesmo quando ainda é tarugo. |

Retrato pode usar enquadramento próprio e HUD comprimido; desktop pode mostrar mais oficina. Ambos preservam a mesma escala hierárquica e fantasia. Nenhuma informação decisiva pode ficar fora da área visível. O fundo medieval/fantasia é quente e ativo, sem apagar bordas do metal. O [modelo visual M01-R3A](forge-visual-model.md) detalha a composição sem tornar seu ângulo sugerido um número irrevogável.

## 3. Ciclo e evolução legíveis

**HEAT → RETIRAR DO FOGO → MARTELAR → DECIDIR CONTINUAR OU REAQUECER → MARTELAR → TÊMPERA → REVELAÇÃO.** Reaquecimento mantém a mesma peça, danos e forma; ela retorna fisicamente ao fogo e depois à bigorna. Não é um reset de barra ou uma fase solta. O jogador deve perceber temperatura, lugar e maturidade de forma sem depender exclusivamente do HUD.

| Estado visual da peça | Sinal mínimo reconhecível |
|---|---|
| Tarugo | Metal bruto alongado, com direção de espiga e futura ponta; não é espada pronta nem mancha oval luminosa. |
| Esboço de lâmina | Comprimento e afilamento emergem; ainda grosso e incompleto. |
| Lâmina bruta | Silhueta da espada já clara, com bordas e superfície irregulares. |
| Lâmina refinada | Perfil mais alinhado e limpo; defeitos de execução continuam onde ocorreram. |
| Arma terminada | Metal frio e componentes montados; forma, marcas e danos do processo sobrevivem na Revelação e Galeria. |

A passagem é gradual; aquecer, retirar ou reaquecer não substitui instantaneamente a peça por outra. O estado final e suas lacunas de dados seguem o [modelo da arma terminada](finished-weapon-state.md). Quebra encerra uma tentativa, não gera uma espada perfeita com nota baixa.

### Calor

Na fornalha, metal e boca do fogo compartilham perspectiva; coloração térmica respeita material e não apaga o contorno. O jogador distingue **frio → aquecendo → trabalhável → ideal → quente demais**, sem limiares finais aqui. `CALOR` comunica faixa e tendência; o ambiente e a peça mostram a mesma mudança. Decidir retirar cedo/tarde tem consequência compreensível. A janela térmica atual do código é implementação do protótipo, não balanceamento aprovado.

### Bigorna e martelo

Preservar como hipótese operacional o gesto atual **segurar para carregar, soltar para golpear**. A interface primária da ação é `FORÇA DO GOLPE`, próxima da área inferior e legível sem encobrir a lâmina. O jogador percebe carga, antecipação, contato e consequência na forma/risco. Acertos excelentes recebem resposta breve e contida: ressonância mais limpa, hit-stop/contato preciso, alteração visível da peça. `GOOD`, `PERFECT` e `MAGISTRAL` são possibilidades de linguagem futura; **`MAGISTRAL` não é categoria implementada**, e nenhum limiar é definido aqui. Martelar frio, forte demais ou repetidamente mal deve produzir efeitos físicos e risco, não só perda abstrata de pontos.

### Têmpera e saída

A peça sai da bigorna para o banho reconhecível. Vapor e chiado recompensam a imersão, mas não escondem um resultado perigoso. Uma tentativa íntegra segue para Revelação com marcas persistidas; uma peça **BROKEN** termina com feedback de falha e suas causas, sem ser tratada como arma forjada bem-sucedida. Guardar histórico de falhas/fragmentos no Legado ou na Galeria é decisão futura separada.

## 4. Falha real e risco estrutural

**Nova direção de produto, ainda não implementada:** o jogador pode perder a tentativa por suas decisões. A sequência conceitual é **STABLE → DEFORMED → DAMAGED → CRACKED → BROKEN**. São estados de comunicação, não números nem uma ordem que todo erro precise percorrer: deformação pode ser corrigível; dano acumulado e trinca elevam o perigo; quebra é terminal. A peça deve mudar visivelmente conforme o estado, e o risco não deve existir apenas como UI. A possibilidade de recuperar um estado e o peso de cada decisão ficam abertos para experimento.

Contribuintes plausíveis: força excessiva, sequência de golpes ruins, martelamento fora da faixa térmica, dano estrutural acumulado e decisão térmica perigosa na têmpera. **A mesma sequência de projeto, estado e ações deve produzir o mesmo desfecho relevante**; RNG arbitrário não quebra a espada nem salva uma execução ruim. O sistema futuro deve ligar cada subida de risco a causa observável e oferecer uma decisão útil antes do estado irreversível quando o jogador puder agir. Uma falha mostra causa principal e histórico curto: “metal frio”, “força excessiva”, “deformação acumulada” ou “dano repetido”, conforme o que realmente ocorreu. Não dizer apenas “falhou” nem atribuir causa não registrada.

`RISCO DE QUEBRA` comunica **perigo estrutural acumulado**, não progresso rumo a uma recompensa. Faixas conceituais **baixo / moderado / alto / crítico** ajudam decisão; nem todos os golpes precisam mudar a faixa. Em crítico, a peça pode mostrar trinca, o metal pode soar tenso e a UI intensificar discretamente. O indicador precisa ser consistente com a peça e com as causas; uma barra piscante sem diagnóstico é insuficiente. Fórmulas, thresholds, recuperação e curva de dificuldade permanecem **OPEN**.

## 5. Arquitetura da informação e feedback

| Região preferencial | Informação e prioridade |
|---|---|
| Topo/centro | Percurso **Fogo → Bigorna → Têmpera**; fase atual e próximo gesto. Deve orientar sem virar faixa dominante. |
| Agrupamento esquerdo | `CALOR`, `FORMA`, `RISCO DE QUEBRA`, com estado semântico e tendência quando útil; mostrar primeiro o que muda a decisão atual. |
| Área inferior de ação | `FORÇA DO GOLPE` durante martelamento; ação contextual de retirar/reaquecer/temperar e microfeedback causal curto. Não cobrir a peça. |
| Direita/secundária | Identidade da arma em progresso (família/projeto quando existir). Espaço futuro para `ATK / DEF / AGI`, ocultável em interações críticas; nunca concorre com a peça. |

HUD com linguagem medieval/fantasia contida, contraste legível e poucos elementos. Evitar painel genérico de jogo móvel, ícones em excesso, números flutuantes enormes, glow e cores de raridade sobre a espada. Em retrato, regiões podem se rearranjar ou se recolher, preservando calor/risco/ação quando decisivos; não exigir o mesmo arranjo geométrico de desktop. Texto, forma e som devem redundar sinais importantes para que cor isolada não carregue risco.

Áudio direcional: fogo com estalo/fluxo de ar; martelo com massa metálica e transiente forte; acerto excepcional com ressonância limpa e confirmação visual breve; perigo com tensão discreta; têmpera com chiado/vapor marcantes; quebra com som estrutural inequívoco. São alvos, não novos assets aprovados.

**Atributos futuros — hipótese leve:** `ATK / DEF / AGI` pode servir como resumo provisório, mas sua ontologia e fórmulas são **OPEN**. Gume/geometria/dureza podem contribuir para ataque; retidão/integridade para estabilidade defensiva; distribuição de massa/equilíbrio para agilidade. Essas relações são exemplos para uma fase de combate ainda não definida, não stats desta tela. Identidade visual e consequência física vêm antes dos números; ver [memorando M01-R3A](weapon-identity-model.md).

## 6. Aceite do futuro protótipo e cortes de implementação

Sem explicação externa, o jogador deve conseguir responder: **onde está minha peça; em que fase estou; o metal está trabalhável; meu golpe foi adequado; estou danificando a arma; preciso reaquecer; a tentativa está ficando excepcional ou perigosa?** Deve sentir “estou fazendo esta arma”. Rejeitar um protótipo se a peça não for reconhecível, a vista continuar lateral, o martelo ocultá-la em repouso, o aquecimento se separar do fogo, a quebra parecer sorte, o HUD dominar a cena, as fases parecerem minijogos desconexos ou a arma revelada apagar as consequências.

Cada corte abaixo é uma hipótese independente para branch/experimento futuro, não autorização para implementá-lo agora. Medir contra [M01-R1](../../experiments/M01-R1-visual-baseline.md) e [M01-R2](../../experiments/M01-R2-forge-composition.md) quando pertinente; usar observação humana para compreensão e sensação, pois mask não mede isso.

| Corte | Hipótese; intervenção mínima | Sucesso observável | Risco principal |
|---|---|---|---|
| **A — câmera e bigorna** | Vista oblíqua do topo + reposição da peça tornam eixo, ponta e contato identificáveis; mudar só composição/âncoras necessárias. | Em retrato e desktop, observadores apontam peça, ponta e área de golpe sem instrução; martelo conserva peso e repouso legível. | Perder presença da mão ou cortar fornalha/peça em retrato. |
| **B — tarugo a esboço** | Geometria gradual torna o objeto aquecido reconhecível como metal destinado a lâmina; prototipar apenas formas iniciais de uma família. | Jogadores distinguem tarugo de lâmina bruta e acompanham a mesma peça sem salto de silhueta. | Parecer espada pronta cedo demais ou manter o “blob” atual. |
| **C — circulação entre estações** | Transferência visual para fogo e retorno dá sentido ao reaquecimento já acionável; prototipar movimento/câmera antes de mudar custos. | Jogadores acompanham ida e volta e explicam quando/por que reaquecer. | Salto de câmera, tempo morto ou perda da relação espacial. |
| **D — quebra determinística** | Estado estrutural mínimo e um caminho causal de dano permitem falha real; introduzir uma classe de erro rastreável antes de expandir regras. | Mesma sequência repete resultado; perigo e causa são perceptíveis antes/depois da quebra; há caminho de execução que quebra e um que não quebra. | Falha inevitável, arbitrária ou impossível de entender; regressão do ritmo. |
| **E — HUD** | Reordenar fase, calor/forma/risco e ação libera a peça e melhora decisão; não criar painel de stats. | Jogador encontra informação decisiva sem buscar fora da cena; peça mantém prioridade em retrato/desktop. | Sobrecarga visual ou controles inacessíveis. |
| **F — continuidade do resultado** | Persistir e renderizar um subconjunto pequeno de marcas reais faz a Revelação/Galeria refletirem a execução; seguir o [estado terminado](finished-weapon-state.md). | Duas execuções distintas do mesmo projeto produzem diferenças estáveis em ambas as telas. | Inventar defeitos sem sinal, quebrar saves antigos ou reduzir tudo novamente a `quality`. |

**M01-R2 = ADAPT, doador do próximo protótipo.** Conservar o aprendizado de enquadramento próprio para retrato, mão móvel e ganho de sobreposição (~78% → ~31% no repouso) por mudança localizada. A revisão humana rejeitou a suficiência do enquadramento lateral, da posição da peça e da leitura no fogo; por isso não promover a câmera M01-R2 como solução final. Escolher o próximo corte por maior informação, preservando o candidato e `main` até decisão explícita.
