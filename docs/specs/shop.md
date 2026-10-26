# Loja funcional — catálogo, compra e persistência

**M02A — Loja Essencial (26/10/2026):** apresentação em grade responsiva, duas colunas verificadas em 392×819 e 360×800 CSS px. Os seis materiais iniciais cabem inteiros sem rolagem vertical; descrição e atributos ficam na ficha. Compra e persistência verificadas por UI real em save de teste, 65 testes afetados PASS; APK 0.2.3/código 5 entregue. Avaliação física/visual no Poco pendente. [Comparação e limites](../../experiments/M02A-shop-essential/README.md).

**Estado:** `[AGENT-IMPLEMENTED]` `[VERIFIED]` no envelope funcional da [revisão Codex 08](../../.project-intelligence/experiments/CODEX08-review.md), base `78945e0` + working tree revisado. Normalização já correta da Loja preservada; regressões e acesso a equipamento verificados. APK 0.2.2/código 4 e percurso de compras no AVD PASS; no Poco, a prova foi limitada a reinstalação/restauração/navegação, sem compras. Candidata à avaliação humana.
**Fonte de verdade:** `src/game/shop.ts` (catálogo) e `executeShopPurchaseTransaction` em `src/game/transactions.ts`.

## 1. Catálogo canônico

Cada produto declara:

- `id` canônico (usado pela transação);
- `name`, `category`, `type`;
- `costGold` e, quando aplicável, `costRubies` (moeda);
- `rarity`, `desc`, `stats`;
- `componentData` para guardas, cabos, pomos e runas;
- destino explícito na interface (estoque, inventário, Oficina, Compêndio).

Categorias exibidas, nesta ordem: **Metais e materiais · Ferramentas · Cabos · Guardas · Pomos · Runas · Catalisadores · Projetos e receitas**.

O catálogo histórico do Bazar foi extraído de `GalleryScreen` para `shop.ts` — não há duas listas concorrentes. `GalleryScreen` reexporta os mesmos símbolos para compatibilidade.

## 2. Validação transacional

A transação recusa, sem debitar:

| Código | Condição |
|---|---|
| `INVALID_PURCHASE` | objeto/ID ausente ou tipo não suportado |
| `ITEM_NOT_FOUND` | ID fora do catálogo (produto inexistente) |
| `ITEM_TYPE_MISMATCH` | tipo diverge do catálogo |
| `INVALID_QUANTITY` | quantidade fora de 1–99; item único acima de 1 |
| `PRICE_MISMATCH` | preço/moeda divergentes da etiqueta canônica |
| `ALREADY_OWNED` | ferramenta ou receita já adquirida |
| `INSUFFICIENT_FUNDS` | saldo insuficiente |
| `PERSISTENCE_FAILED` / `QUOTA_EXCEEDED` | falha de gravação |

O preço é multiplicado pela quantidade apenas para materiais. A gravação acontece antes de a UI confirmar sucesso: falha de storage devolve o save original e a Loja mostra falha, nunca item fantasma.

## 3. Destinos reais

- **Material** → `addMaterialStock` sob a chave canônica (`iron` → `iron_ingot`), consumido pela forja.
- **Componente/runa** → `inventory.components` com `componentKey` e `statModifier`; instalável na Coleção.
- **Catalisador** → `materials.catalyst_astral`; selecionável no Craft e consumido uma vez na fusão confirmada.
- **Ferramenta** → `inventory.unlockedTools`; equipável no painel **Equipamento da oficina**, dentro da categoria Ferramentas da Loja. A lista inclui ferramentas compradas e equipamento padrão; permite restaurar o padrão pelo mesmo fluxo.
- **Receita** → `inventory.unlockedBlueprints`; desbloqueia o projeto no Compêndio, sem dispensar o metal.

## 4. UX

Categorias permanecem nos mesmos chips roláveis e na mesma ordem. Cards em grade mostram ícone existente, nome completo, raridade, preço/moeda e possuídos ou “Adquirido”; não exibem descrição. A grade usa duas colunas quando cabem e se adapta à largura disponível. O card inteiro abre a ficha com descrição, atributos, posse, efeito, destino, saldo e botão único de confirmação ("Comprar por X ouro + Y rubis"). A categoria na ficha usa o nome em português. Saldo insuficiente informa a quantidade que falta por moeda, sem sugerir revenda inexistente. A compra continua passando pela transação canônica; sucesso mantém feedback inline e toast existentes.

Na categoria Ferramentas, **Equipar** aplica o equipamento adquirido ou padrão e **Em uso** identifica a seleção atual. O painel de produto só permanece aberto enquanto a Loja é a seção ativa; navegar para outra seção não deixa seu portal bloqueando a tela.

## 5. Provas

`src/game/mobile-integration.test.ts` cobre: compra de guarda, compra de lingote, saldo insuficiente, produto inexistente, preço adulterado, receita repetida, falha de storage e persistência após reload. O percurso de navegador compra uma guarda por 220 ouro (4000 → 3780) e instala a peça.

Na Operação 08, `src/game/mobile-core-review.test.ts` acrescenta regressões de identidade e efeitos canônicos, quantidade de materiais, item único e chave do catalisador. A normalização já passava na base e foi preservada (`KEEP`). A falha de backup inicial foi reproduzida e corrigida no writer compartilhado: uma compra recusada não reaparece ao recuperar um save fresco. O percurso adicional [comprar, equipar e restaurar ferramenta](../../experiments/CODEX08-review/ui-regressions-green.json) passou após o controle RED correspondente; não é prova Android.

No [AVD](../../experiments/CODEX08-review/android-summary.json), compras nativas de aço, catalisador e duas guardas abasteceram os estoques; instalação e troca deram DEF 185→193→195, com devolução da guarda antiga. Houve fixture sintética anterior ao percurso; não é progressão orgânica nem prova de compra no Poco.

## 6. Limites

- Não há venda de itens de volta à Loja.
- Quantidade múltipla existe na transação para materiais, mas a UI mobile compra uma unidade por vez.
- Preços de receitas e ferramentas são decisão desta integração, não balanceamento canônico validado pelo proprietário.
