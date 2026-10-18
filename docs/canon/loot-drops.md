# FioForja — Motor de Drops e Tabelas de Recompensas
## Especificação Canônica do Sistema de Loot e Recompensas Pós-Forja

**Decisão Canônica Aprovada:** `FIOFORJA-LOOT-001`  
**Referência Visual de Saída:** Tela de Recompensas com Baú Dourado e 4 Cartas Iluminadas (`RewardsScreen.tsx`).

---

## 1. Princípio Fundamental do Loot

A recompensa da forja divide-se em duas camadas inseparáveis:
1. **O Troféu Principal:** A espada forjada, cujos atributos, afixos e beleza física dependem 100% da precisão manual do ferreiro.
2. **O Espólio da Vitória (Drops):** Um conjunto dinâmico de 4 itens sorteados a partir de tabelas reais de loot, refletindo o Rank alcançado (S, A, B, C) e o material trabalhado.

As quatro cartas **NUNCA MAIS** serão itens estáticos pré-programados. Cada abertura de baú sorteia itens verídicos entre as seguintes categorias:
- **Materiais e Minérios Nobres:** Lingotes de ferro, aço damasco, pó de meteorito, prata élfica, blocos de madeira escura.
- **Componentes Físicos de Forja:** Guardas com gravuras, empunhaduras de couro especial, pomos de bronze/ouro esculpidos.
- **Runas Sagradas:** Pedras rúnicas com incisões místicas e propriedades elementais.
- **Fragmentos e Catalisadores de Fusão:** Itens indispensáveis para o Crisol de Fusão.
- **Projetos e Receitas Raras:** Manuscritos antigos que desbloqueiam novas famílias e perfis de lâminas no Compêndio.

---

## 2. Tabelas de Probabilidade de Raridade por Rank

A qualidade final da lâmina forjada dita o patamar da tabela de drops:

| Categoria de Raridade | Rank B (Qualidade 75–87) | Rank A (Qualidade 88–94) | Rank S (Qualidade 95–100) | Lâmina Quebrada / Falha |
|---|---:|---:|---:|---:|
| **Comum** | 49.0% | 37.0% | 27.0% | 85.0% (Sucata / Cinzas) |
| **Incomum** | 33.0% | 35.0% | 33.0% | 15.0% (Ferro Básico) |
| **Rara** | 15.0% | 22.0% | 30.0% | 0.0% |
| **Épica** | 3.0% | 5.0% | 8.5% | 0.0% |
| **Lendária** | 0.0% | 1.0% | 1.5% | 0.0% |

*Regra Especial de Relíquias:* Em forjas Rank S utilizando ligas antigas (`ancient_alloy`) ou aço meteórico com alinhamento perfeito (`warp < 0.02`), há uma chance de 0.2% a 0.5% de um dos slots bônus conceder uma **Relíquia Arcaica**.

---

## 3. Estrutura do Item de Loot (`ForgeRewardItem`)

Cada item sorteado é uma estrutura de dados consistente:
```ts
export interface ForgeRewardItem {
  id: string;             // Identificador de instância/catálogo
  catalogKey: string;     // Chave canônica para destino no inventário
  name: string;           // Nome com sonoridade medieval clássica
  category: "material" | "guard" | "pommel" | "wrap" | "rune" | "fusion" | "recipe";
  rarity: RarityGrade;    // Comum | Incomum | Rara | Épica | Lendária | Relíquia
  icon: string;           // Ícone representativo
  description: string;    // Texto descritivo e lore
  quantity: number;       // Quantidade (para itens empilháveis)
  value: number;          // Valor nominal em ouro para venda
  statsModifier?: {       // Modificadores físicos opcionais
    damageBonus?: number;
    defenseBonus?: number;
    agilityBonus?: number;
    durabilityBonus?: number;
  };
}
```

---

## 4. Garantia de Idempotência e Prevenção de Abusos

1. **Token Transacional de Forja (`forgeRunId`):** Cada sessão de forja iniciada recebe um identificador único universal. Quando a lâmina é concluída e os drops são gerados, os dados são atrelados a esse token.
2. **Prevenção de Re-Sorteio (Anti-Reroll):** Recarregar a página da tela de recompensas (`RewardsScreen`) ou reconectar não recalcula os dados nem realiza novo sorteio. O mesmo conjunto é preservado até o clique em `CLAIM REWARDS`.
3. **Registro de Recompensas Coletadas (`claimedForgeRewardIds`):** Ao coletar, o `forgeRunId` é gravado no save persistente. Tentativas subsequentes de requisição ignoram pagamentos repetidos.
4. **Proteção Anti-Exploit de Quebra:** Forjar propositalmente a frio para quebrar a lâmina e coletar recompensas gera exclusivamente sucata de ferro e cinzas de carvão, eliminando qualquer incentivo ao abuso mecânico.
