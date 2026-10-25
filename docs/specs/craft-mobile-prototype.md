# Craft mobile — primeiro recorte

**Decisão humana:** 24/10/2026. **Status:** direção aprovada; interface ainda requer avaliação no Poco.

Navegação: Início · Coleção · Forja · Loja · Craft. Perfil, carreira, encomendas e configurações continuam previstos no Início/perfil. Esta atualização substitui apenas o quinto acesso de [MOBILE-UX-001](../DECISIONS.md#fioforja-mobile-ux-001).

O Craft promove o [Crisol híbrido existente](../canon/fusao-hibrida.md). Quatro espadas da mesma **raridade**, com qualidades de fabricação possivelmente diferentes, geram um núcleo, nunca uma espada pronta. Componentes continuam separados por categoria. A influência adicional da qualidade nas propriedades é hipótese, sem alteração das chances publicadas.

## Primeiro protótipo autorizado

- Quatro espaços 2×2, seleção no Arsenal demonstrativo e inspeção antes do sacrifício.
- Probabilidades obtidas de `getFusionOdds`, incluindo a opção de catalisador; 50/42/8 para quatro Raras sem catalisador é configuração provisória existente.
- Confirmação identifica imagem, nome, raridade, qualidade e atributos das quatro doadoras, custo e probabilidades.
- Revelação de núcleo com propriedades e origem; Guardar núcleo mantém apenas a sessão demonstrativa. Forjar agora mostra a preparação, mas não aplica núcleo ou contorna requisitos de fabricação.
- Sem leitura/escrita do save real. Uma quarta Rara e um exemplo protegido derivados das amostras são explicitamente sintéticos.
- Componentes têm acesso e categorias reconhecíveis; sua reconstrução completa não pertence a este recorte.

## Fronteira da integração posterior

**CURRENT:** motor aceita raridades misturadas pela média; a interface nova impõe mesma raridade somente à demonstração. Proteção de favoritas/equipadas não está demonstrada no motor. Tabelas e compensações do cânone e do código têm diferenças históricas; o protótipo usa o código e não aprova novo balanceamento.

**TARGET após aprovação visual:** impor mesma raridade e proteções também nas transações; preservar núcleos antigos sem revalidar retroativamente as doadoras; usar a transação normal de início/finalização de fabricação e validar materiais, projeto e demais requisitos. Nenhuma alteração funcional está autorizada nesta primeira entrega.

**NOT_PROVEN:** balanceamento, aprovação visual, desempenho sustentado e integração persistente. Animações, câmera e experiência tátil da forja pertencem à frente Antigravity; não editar seus mecanismos neste recorte.
