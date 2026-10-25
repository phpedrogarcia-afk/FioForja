# Loja funcional — catálogo, compra e persistência

**Estado:** `[AGENT-IMPLEMENTED]` `[VERIFIED]` (testes + navegador).
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
- **Ferramenta** → `inventory.unlockedTools`; equipável na Oficina.
- **Receita** → `inventory.unlockedBlueprints`; desbloqueia o projeto no Compêndio, sem dispensar o metal.

## 4. UX

Categoria em chips roláveis; cards com ícone, nome, raridade, descrição curta, preço, saldo e possuídos. Tocar abre um painel com efeito, destino, saldo e botão único de confirmação ("Comprar por X ouro + Y rubis"). Feedback de sucesso é do próprio painel e não substitui a mensagem de erro global.

## 5. Provas

`src/game/mobile-integration.test.ts` cobre: compra de guarda, compra de lingote, saldo insuficiente, produto inexistente, preço adulterado, receita repetida, falha de storage e persistência após reload. O percurso de navegador compra uma guarda por 220 ouro (4000 → 3780) e instala a peça.

## 6. Limites

- Não há venda de itens de volta à Loja.
- Quantidade múltipla existe na transação para materiais, mas a UI mobile compra uma unidade por vez.
- Preços de receitas e ferramentas são decisão desta integração, não balanceamento canônico validado pelo proprietário.
