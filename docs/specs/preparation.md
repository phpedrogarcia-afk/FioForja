# Preparação intuitiva — M03A

**Estado:** refinamento implementado na branch `codex/forge-preparation-m03a`, sobre `2ac3cf5` (M03A anterior). Instalado e observado no Poco; aceitação humana pendente. [Relatório e capturas](../../experiments/M03A-choice-to-anvil/README.md). A [rodada anterior](../../experiments/M03A-intuitive-preparation/README.md) permanece histórica.

## Caminho principal

Escolher projeto → confirmar metal → **Começar a fabricar**. Os dois seletores expandem listas inline dentro dos controles; nenhum portal ou picker nativo cobre a arma. A prévia completa fica fora da rolagem, proporcional à altura disponível. A lista expandida pode rolar, mantendo a espada e a ação principal visíveis.

Os projetos disponíveis aparecem com miniaturas feitas pelo renderer ativo; bloqueados ficam em grupo expansível, com requisitos sob demanda. As miniaturas mostram o padrão canônico; a prévia principal reflete as escolhas atuais. O projeto aplica padrões não personalizados e **mantém o metal e os ajustes manuais**. A seleção informa estoque e o rodapé explicita o consumo de uma unidade. Não há fallback automático para outro insumo nem compra/consumo ao selecionar. Projetos/metais bloqueados permanecem identificáveis, com seleção desabilitada. Na ausência de material, aparece acesso à Loja; o retorno mantém a preparação.

**Personalizar espada** expande os ajustes existentes: nome, família, perfil, cabo, guarda, pomo, comprimento, inscrição e runas; o metal permanece no controle principal. Trocar família mantém metal e ajustes explícitos; campos não personalizados recebem o padrão da família. Treino e reciclagem continuam acessíveis em seus contextos. A reciclagem informa ferro e só é oferecida quando ele é o insumo necessário.

## Fonte de verdade e persistência

- `preparation.ts` compartilha identificação de projeto e gates com `executeStartForgeTransaction`. Nos designs com ID canônico, também verifica projeto distinto identificado por família e perfil: esse endurecimento fecha um bypass identificado na revisão. Designs antigos sem ID mantêm o matching anterior. Os thresholds não foram alterados; estoque, núcleo, tentativa ativa e escrita seguem na transação.
- `GameApp` mantém o único estado. `lastDesign` usa o `writeSave` existente; erro de gravação é comunicado. O JSON v5 agora aceita `id` e `customizedFields` opcionais dentro do design, sem mudar a versão do save. Saves antigos continuam legíveis; uma escolha antiga igual ao padrão não carrega prova de intenção e não pode ser inferida. Escolhas explícitas feitas nesta versão passam a ser registradas.
- Núcleos continuam pré-formas: raridade e quantidade de espadas de origem aparecem; família, perfil e metal ficam bloqueados; material exigido visível; consumo do núcleo apenas na conclusão canônica. O fluxo Loja → retorno mantém o núcleo armado em memória.
- Limitação preexistente: a seleção de **qual** núcleo preparar (`prepCore`) não é persistida antes de iniciar a tentativa. Ao reabrir nessa fase, o núcleo permanece no inventário e deve ser novamente selecionado pela Coleção/Craft. Não inferir sua identidade somente de um `lastDesign` parecido. Após iniciar, a recuperação segue o checkpoint canônico com núcleo.

## Limites da entrega

Nenhuma alteração em câmera, martelo, simulação, aquecimento, Loja, Coleção ou Craft. Compatibilidade significa as regras atualmente implementadas; a missão não implementa restrições estéticas adicionais da Bíblia. Clássico e Weapon DNA foram comparados em navegador; o teste geométrico cobre 32 combinações, não todos os pixels e efeitos. A tela foi observada no Poco, mas ergonomia, desempenho sustentado, teclado virtual e aceitação humana ainda exigem avaliação.
