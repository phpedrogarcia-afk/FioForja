# FioForja — Estrutura Completa da Galeria
## Arsenal, coleção, progresso e customização

## 1. PROPÓSITO DA GALERIA

A Galeria existe para responder cinco perguntas do jogador:

1. **O que já consegui criar?**
2. **O que já desbloqueei?**
3. **O que ainda existe para conquistar?**
4. **Qual foi minha evolução como ferreiro?**
5. **Qual arma quero usar, customizar ou exibir agora?**

A Galeria não deve parecer um inventário administrativo.

Ela deve parecer uma mistura de:

**arsenal + museu + oficina pessoal.**

---

# 2. ESTRUTURA PRINCIPAL

A Galeria terá seis áreas principais:

### Arsenal
Espadas únicas efetivamente forjadas pelo jogador.

### Compêndio
Modelos e famílias conhecidas ou ainda não descobertas.

### Componentes
Cabos, guardas, pomos e acabamentos desbloqueados.

### Runas
Coleção rúnica e gerenciamento de runas.

### Oficina
Martelos, bigornas, fornalhas e outras ferramentas.

### Legado
Progressão, recordes, feitos e histórico do jogador.

---

# 3. TELA INICIAL DA GALERIA

A primeira tela não deve despejar dezenas de ícones.

Ela deve imediatamente mostrar as peças mais importantes do jogador.

Estrutura conceitual:

```text
GALERIA

[ espada atualmente em destaque ]

JURAMENTO DAS CINZAS
Lendária · Obra-prima · 97

────────────────────────

Arsenal        37
Modelos        18 / 72
Runas          11 / 40
Componentes    29 / 84
Ferramentas     8 / 25

Lendárias       2 / 12
Relíquias       0 / 4

────────────────────────

[ Arsenal ]
[ Compêndio ]
[ Runas ]
[ Oficina ]
[ Legado ]
```

A espada em destaque pode ser:

- favorita;
- última Lendária;
- última espada forjada;
- escolhida manualmente.

---

# 4. ARSENAL

O Arsenal contém **cada espada individual produzida pelo jogador**.

Não apenas o modelo desbloqueado.

Duas espadas do mesmo projeto continuam sendo duas peças diferentes.

Cada uma possui seu próprio:

- nome;
- material;
- aparência;
- qualidade;
- raridade;
- histórico;
- defeitos;
- runas;
- componentes;
- data de fabricação.

---

# 5. VISUALIZAÇÃO DO ARSENAL

Duas visualizações.

## Vitrine

Prioriza estética.

Cards grandes.

Boa para admirar armas.

Exemplo:

```text
┌──────────────────────┐
│                      │
│      [ESPADA]        │
│                      │
│ Juramento            │
│ Lendária · 97        │
└──────────────────────┘
```

## Lista técnica

Prioriza comparação.

Mostra:

- qualidade;
- material;
- raridade;
- família;
- data;
- favorito;
- equipada.

Ideal para jogadores com muitas armas.

---

# 6. FILTROS DO ARSENAL

Filtros úteis:

- Todas
- Favoritas
- Comum
- Incomum
- Rara
- Épica
- Lendária
- Relíquia
- família
- material
- qualidade
- com runas
- sem runas
- mais recentes
- maior qualidade
- mais raras

Não transformar a interface em planilha.

Filtros avançados podem ficar escondidos.

---

# 7. PÁGINA INDIVIDUAL DA ESPADA

Esta é uma das telas mais importantes do jogo.

A espada deve ocupar grande parte da tela.

## Cabeçalho

**JURAMENTO DAS CINZAS**

Lendária

Obra-prima — 97

Damasco

---

## Exibição

Espada grande.

Idealmente:

- zoom;
- pequena rotação;
- inspeção de detalhes;
- visualização do cabo;
- runas;
- padrão do aço.

---

## Informações

```text
Família
Damasco

Projeto
Lâmina Longa

Qualidade
97 — Obra-prima

Raridade
Lendária

Material
Damasco Negro

Empenamento
0,8%

Aquecimento
98

Martelamento
97

Têmpera
96
```

---

# 8. HISTÓRIA DA FORJA

Cada espada importante guarda sua história.

Exemplo:

```text
FORJA

7 golpes perfeitos
1 golpe bom
0 golpes excessivos

Temperatura magistral
Reaquecida 1 vez
Têmpera perfeita

Melhor sequência:
5 Perfect consecutivos
```

Isso transforma a espada em uma memória.

---

# 9. CONQUISTAS DA PEÇA

Uma espada pode possuir marcas especiais.

Exemplos:

**Martelo Impecável**
Nenhum golpe excessivo.

**Fogo Perfeito**
Nenhum erro térmico.

**Mão de Mestre**
5 golpes perfeitos consecutivos.

**Têmpera Absoluta**
Têmpera 100.

**Obra-prima**
Qualidade ≥95.

Esses selos aparecem discretamente.

---

# 10. NOME DA ESPADA

O jogador pode nomear suas armas.

O nome escolhido pelo jogador é diferente do modelo.

Exemplo:

```text
Nome:
JURAMENTO

Modelo:
Véu de Damasco

Família:
Damasco
```

Isso permite possuir duas armas do mesmo projeto com identidades próprias.

---

# 11. ASSINATURA DO FERREIRO

Armas de alta qualidade podem receber um selo pessoal.

Exemplo:

**Forjada por Pedro**

Mais tarde o jogador pode escolher um símbolo próprio.

A assinatura aparece discretamente próxima ao ricasso.

---

# 12. CUSTOMIZAÇÃO

A página da espada possui:

**CUSTOMIZAR**

Entrando nela:

```text
Cabo
Guarda
Pomo
Runas
Inscrição
Acabamento
```

Mas nem toda peça pode ser modificada indefinidamente.

Algumas modificações devem depender da estrutura daquela arma.

---

# 13. REGRA IMPORTANTE DE CUSTOMIZAÇÃO

Customização não deve destruir identidade visual das famílias.

Portanto cada projeto possui:

### Compatível
Peças que combinam naturalmente.

### Especial
Peças desbloqueadas especificamente.

### Incompatível
Peças que fisicamente ou esteticamente não pertencem àquele projeto.

Isso preserva qualidade artística.

---

# 14. COMPONENTES

Área própria para itens reutilizáveis.

Categorias:

```text
Cabos
Guardas
Pomos
Acabamentos
Ornamentos
Materiais especiais
```

Cada componente mostra:

- nome;
- família;
- raridade;
- compatibilidades;
- descoberto ou não.

---

# 15. COMPONENTE NÃO DESCOBERTO

Pode aparecer assim:

```text
????

Raro

Compatível com:
Espadas Orientais

Origem:
Desconhecida
```

Ou completamente oculto quando for conteúdo secreto.

---

# 16. RUNAS

As runas merecem uma seção própria.

Cada entrada mostra:

- símbolo;
- nome;
- escola;
- raridade;
- efeito;
- nível de domínio;
- número possuído.

Exemplo:

```text
ᚠ

RUNA DA BRASA

Rara
Escola do Fogo

A lâmina perde calor
mais lentamente.

Encontrada: 2
Usada: 1
```

---

# 17. INSPEÇÃO DE RUNA

A runa ganha exibição grande.

Pode mostrar:

- desenho completo;
- significado;
- efeito;
- lore;
- onde foi descoberta;
- espadas atualmente usando a runa.

Runas secretas aparecem como:

**???**

com pistas.

---

# 18. SLOTS RÚNICOS

Espadas podem possuir quantidade limitada de slots.

Exemplo:

```text
Comum       0–1
Rara        1
Épica       1–2
Lendária    2–3
Relíquia    especial
```

Isso ainda precisa ser balanceado.

Raridade não deve automaticamente significar mais poder.

---

# 19. COMPÊNDIO

O Compêndio mostra o universo de armas existentes.

Não são necessariamente armas que o jogador possui.

Ele mostra:

- famílias;
- projetos;
- Lendárias;
- Relíquias;
- descobertas.

---

# 20. FAMÍLIAS NO COMPÊNDIO

Exemplo:

```text
FERRO DO FERREIRO
8 / 8

AÇO DO REINO
7 / 12

DAMASCO
4 / 10

ORIENTAL
3 / 9

ÉLFICA
1 / 8

RÚNICA
2 / 9

METEÓRICA
0 / 6

IMPERIAL
1 / 6

RELÍQUIAS
0 / 4
```

Isso imediatamente comunica progressão.

---

# 21. ARMAS AINDA NÃO DESCOBERTAS

Existem três níveis de segredo.

## Conhecida

Mostra:

- nome;
- espada;
- raridade;
- pista de fabricação.

## Misteriosa

Mostra:

- silhueta;
- raridade;
- pista.

## Secreta

Mostra apenas:

```text
???

RELÍQUIA

Ainda não descoberta.
```

---

# 22. LENDÁRIAS

Seção especial dentro do Compêndio:

# OBRAS LENDÁRIAS

Cada uma recebe espaço maior.

Exemplo:

```text
VÉU DE DAMASCO

[ silhueta ]

LENDÁRIA

“Poucos conseguem preservar
o padrão perfeito até a têmpera.”

Não descoberta
```

Quando conquistada:

A silhueta é substituída pelo modelo real.

---

# 23. RELÍQUIAS

Não tratar como itens comuns da grade.

Elas ficam numa seção quase separada.

Talvez algo chamado:

# RELÍQUIAS DA FORJA

Poucos espaços.

Muito mais destaque.

O vazio deve ser perceptível.

---

# 24. OFICINA

Mostra ferramentas conquistadas.

Categorias:

- Martelos
- Bigornas
- Fornalhas
- Tenazes
- Pedras de amolar
- Banhos de têmpera
- Ferramentas especiais

---

# 25. MARTELos

Cada martelo mostra:

- aparência;
- nome;
- raridade;
- comportamento;
- domínio.

Exemplo:

```text
MARTELO DE PRECISÃO

Raro

Carga:
Lenta

Controle:
Alto

Impacto:
Médio
```

Equipamentos devem modificar estilo de jogo, não simplesmente dar bônus numérico.

---

# 26. BIGORNAS

Exemplo:

```text
BIGORNA DO MESTRE

Épica

Estabilidade:
Alta

Reposicionamento:
Médio

Especial:
reduz vibração após golpes fortes.
```

---

# 27. EQUIPAMENTO ATIVO

A Galeria também mostra a oficina atualmente equipada.

```text
OFICINA ATIVA

Martelo:
Martelo de Precisão

Bigorna:
Bigorna Pesada

Fornalha:
Forja de Pedra III

Têmpera:
Óleo Negro
```

---

# 28. LEGADO

Área destinada à carreira do jogador.

Não precisa ser um RPG tradicional de níveis.

Mostra domínio real.

---

# 29. ESTATÍSTICAS DE FERREIRO

Exemplo:

```text
ESPADAS FORJADAS
147

OBRAS-PRIMAS
12

LENDÁRIAS
2

RELÍQUIAS
0

MAIOR QUALIDADE
99

MAIOR COMBO PERFECT
7

TÊMPERA PERFEITA
9
```

---

# 30. MAESTRIA POR MATERIAL

Exemplo:

```text
Ferro        96%
Aço          82%
Damasco      61%
Liga Élfica  27%
Meteorito    08%
```

Maestria não precisa simplesmente conceder bônus.

Ela pode desbloquear:

- projetos;
- técnicas;
- informações;
- dificuldades maiores.

---

# 31. MAESTRIA POR FAMÍLIA

Também podemos registrar:

```text
Longas
█████████░

Orientais
██████░░░░

Élficas
██░░░░░░░░
```

Assim fica claro onde o jogador já tem experiência.

---

# 32. RECORDES

Alguns recordes:

- melhor qualidade;
- maior número de Perfect;
- maior sequência Perfect;
- melhor aquecimento;
- melhor têmpera;
- menor empenamento;
- espada mais valiosa;
- espada mais rara;
- maior dificuldade concluída.

---

# 33. LINHA DO TEMPO

Opcional, mas muito interessante.

Uma história da oficina.

```text
Primeira espada

↓

Primeira Rara

↓

Primeira Obra-prima

↓

Primeira Épica

↓

Primeira Lendária

↓

Primeira Relíquia
```

Cada marco mostra a espada envolvida.

Isso transforma progresso abstrato em história.

---

# 34. FAVORITOS

O jogador pode marcar armas favoritas.

Favoritos podem:

- aparecer primeiro;
- ocupar pedestal especial;
- aparecer na tela inicial da Galeria.

---

# 35. PEDESTAIS

Uma funcionalidade futura interessante:

O jogador possui alguns espaços de exposição.

Exemplo:

# SALÃO DO FERREIRO

Escolha 5 armas para exibir.

Isso cria uma seleção pessoal dentro de uma coleção grande.

---

# 36. DUPLICATAS

Pode existir mais de uma espada do mesmo modelo.

Isso é importante.

Uma pode ter:

```text
Véu de Damasco
Qualidade 88
Épica
```

Outra:

```text
Véu de Damasco
Qualidade 98
Lendária
```

O jogador vê a própria evolução.

Não substituir automaticamente a antiga.

---

# 37. COMPARAÇÃO

Na página da arma:

**COMPARAR**

Seleciona outra espada.

Exemplo:

```text
                  Juramento   Aurora

Qualidade             97        91
Martelamento           99        86
Têmpera                96        94
Empenamento           0.8%      2.1%
Raridade          Lendária     Épica
```

Visualmente também mostrar as duas.

---

# 38. VALOR EMOCIONAL

Evitar incentivar o jogador a deletar imediatamente armas antigas.

A primeira espada pode ser ruim, mas representa um marco.

Podemos permitir:

**Arquivar**

em vez de simplesmente destruir.

---

# 39. ITEM NOVO

Quando algo é descoberto:

```text
NOVA DESCOBERTA

Cabo Élfico de Prata

Raro
```

Depois aparece discretamente marcado como **NOVO** na Galeria.

Não manter dezenas de badges irritantes.

---

# 40. DESCOBERTA LENDÁRIA

Quando uma Lendária é criada pela primeira vez:

```text
NOVA OBRA LENDÁRIA

VÉU DE DAMASCO

1 / 12 Lendárias descobertas
```

Isso deve ter apresentação especial.

---

# 41. PROGRESSO VISÍVEL

A Galeria deve mostrar constantemente que ainda existem coisas importantes por descobrir.

Exemplo:

```text
Coleção geral
38%

Espadas
24 / 72

Runas
11 / 40

Ferramentas
8 / 25

Lendárias
2 / 12

Relíquias
0 / 4
```

Mas nunca transformar o jogo numa lista de tarefas.

---

# 42. MOBILE FIRST

Como o FioForja funciona bem em celular, a Galeria precisa ser desenhada pensando primeiro em tela vertical.

Página de espada:

```text
NOME

RARIDADE

[ ESPADA GRANDE ]

QUALIDADE

[ CUSTOMIZAR ]

Detalhes

História da Forja

Runas

Conquistas
```

Nada de miniaturas minúsculas.

---

# 43. DESKTOP

No desktop:

```text
┌──────────────┬─────────────────────────────┐
│              │                             │
│  coleção     │        ESPADA               │
│              │                             │
│ filtros      │                             │
│              ├─────────────────────────────┤
│              │ informações                 │
└──────────────┴─────────────────────────────┘
```

Permite inspeção muito mais rica.

---

# 44. TRANSIÇÕES

A Galeria deve ser calma.

A forja é intensa.

A Galeria é contemplativa.

Transições:

- lentas;
- suaves;
- discretas;
- metal;
- madeira;
- iluminação quente.

Nada piscando sem necessidade.

---

# 45. SOM

Som ambiente muito discreto.

Talvez:

- fogo ao fundo;
- madeira;
- metal distante.

Ao selecionar uma arma:

pequeno som metálico.

Lendárias podem possuir uma assinatura sonora extremamente sutil.

---

# 46. REGRA DE PRESTÍGIO

A Galeria precisa comunicar:

> “isso foi conquistado.”

Lendárias e Relíquias não podem parecer itens comprados numa loja genérica.

A página deve mostrar:

**Forjada em**
data

**Qualidade**
97

**Maior sequência**
7 Perfect

**Condição**
Martelo Impecável

Isso comprova a conquista.

---

# 47. MODELO CONCEITUAL DOS DADOS

A Galeria precisa distinguir quatro entidades.

### WeaponDefinition
O projeto/modelo existente no jogo.

Exemplo:
`veil_of_damascus`

### ForgedWeapon
A espada específica criada pelo jogador.

Exemplo:
`Juramento`, qualidade 97.

### CollectibleDefinition
Cabos, runas, ferramentas etc.

### PlayerCollection
O que já foi descoberto/desbloqueado pelo jogador.

Não misturar esses conceitos.

Isso será importante na implementação.

---

# 48. O QUE NÃO FAZER

A Galeria não deve virar:

- loja;
- lista infinita de ícones;
- inventário de MMORPG cheio de quadradinhos;
- planilha de estatísticas;
- feed de notificações;
- tela cheia de moedas;
- coleção onde raridade é apenas cor.

A arma deve continuar sendo protagonista.

---

# 49. HIERARQUIA VISUAL

Em qualquer tela:

**1º arma**

**2º nome**

**3º raridade / qualidade**

**4º história e detalhes**

Nunca começar pela estatística.

---

# 50. NORTE DA GALERIA

O jogador deve conseguir abrir a Galeria depois de muitas horas e literalmente ver sua trajetória:

```text
Primeiras armas
↓
armas melhores
↓
primeira Rara
↓
primeira Épica
↓
primeira Obra-prima
↓
Damasco
↓
Élficas
↓
Lendárias
↓
Relíquias
```

O objetivo não é mostrar apenas:

**“quanto conteúdo foi desbloqueado.”**

O objetivo é mostrar:

> **“olha o ferreiro que eu me tornei.”**

---

# LEIS DA GALERIA

1. **THE WEAPON IS THE HERO.**
   A arma é protagonista da interface.

2. **PROGRESS MUST BE VISIBLE.**
   O jogador precisa enxergar sua evolução.

3. **LOCKED CONTENT MUST CREATE DESIRE.**
   Conteúdo ainda bloqueado deve provocar curiosidade.

4. **LEGENDARIES NEED PRESTIGE.**
   Lendárias precisam de tratamento especial.

5. **EVERY GREAT SWORD HAS A HISTORY.**
   Toda grande espada deve preservar sua história de fabricação.

6. **COLLECTION IS NOT INVENTORY.**
   Coleção não é apenas armazenamento.

7. **CUSTOMIZATION MUST PRESERVE IDENTITY.**
   Customização não pode destruir a identidade estética da arma.

8. **THE GALLERY IS THE PLAYER'S LEGACY.**
   A Galeria é o legado do jogador.