# Preparação intuitiva — M03A

**Estado:** implementada na branch `codex/intuitive-preparation-m03a`, sobre M02B `653694b`. Verificação técnica e comparação em navegador; instalada e observada posteriormente no Poco, com avaliação humana pendente. [Relatório e capturas](../../experiments/M03A-intuitive-preparation/README.md).

## Caminho principal

Escolher projeto → confirmar metal → **Começar a fabricar**. Os dois seletores expandem listas inline dentro dos controles; nenhum portal ou picker nativo cobre a arma. A prévia completa fica fora da rolagem, proporcional à altura disponível. A lista expandida pode rolar, mantendo a espada e a ação principal visíveis.

O projeto aplica suas propriedades canônicas e **mantém o metal já escolhido**. A seleção informa estoque e o rodapé explicita o consumo de uma unidade. Não há fallback automático para outro insumo nem compra/consumo ao selecionar. Um projeto salvo personalizado continua válido; não é substituído ao abrir a tela. Projetos/metais bloqueados permanecem identificáveis, com seleção desabilitada. Na ausência de material, aparece acesso à Loja; o retorno mantém a preparação.

**Personalizar espada** expande os ajustes existentes: nome, família, perfil, cabo, guarda, pomo, comprimento, inscrição e runas; o metal permanece no controle principal. Trocar família mantém o metal. Treino e reciclagem continuam acessíveis em seus contextos. A reciclagem informa ferro e só é oferecida quando ele é o insumo necessário.

## Fonte de verdade e persistência

- `preparation.ts` compartilha a identificação de projeto e os gates metalúrgicos existentes com `executeStartForgeTransaction`. Os thresholds foram extraídos da transação sem alteração; o helper não substitui validação de núcleo, estoque, tentativa ativa ou persistência atômica da transação.
- `GameApp` mantém o único estado. Edições explícitas gravam `lastDesign` pelo `writeSave` já existente; erro de gravação é comunicado. Schema v5, economia, catálogo e inventário preservados.
- Núcleos continuam pré-formas: família, perfil e metal bloqueados; material exigido visível; consumo do núcleo apenas na conclusão canônica. O fluxo Loja → retorno mantém o núcleo armado em memória.
- Limitação preexistente: a seleção de **qual** núcleo preparar (`prepCore`) não é persistida antes de iniciar a tentativa. Ao reabrir nessa fase, o núcleo permanece no inventário e deve ser novamente selecionado pela Coleção/Craft. Não inferir sua identidade somente de um `lastDesign` parecido. Após iniciar, a recuperação segue o checkpoint canônico com núcleo.

## Limites da entrega

Nenhuma alteração em câmera, martelo, simulação, aquecimento, Loja, Coleção ou Craft. Compatibilidade significa as regras atualmente implementadas; a missão não implementa restrições estéticas adicionais da Bíblia. A renderização compartilhada continua intacta, incluindo Weapon DNA opt-in; a comparação visual desta rodada usou o modo Clássico. Teclado virtual, área segura física e aceitação humana no Poco não são provados por um viewport de navegador.
