# Invariantes do FioForja

Estas propriedades governam todas as mudanças de código e design. Qualquer implementação que viole um destes invariantes é considerada inválida.

1. **Habilidade não é substituída por RNG:** Sorte amplia oportunidades (drops, núcleos raros, projetos especiais), mas jamais corrige execução insuficiente nem concede sozinha prestígio ou vitória.
2. **Qualidade deixa marca física visível:** A nota da forja (0–100) deve alterar perceptivelmente a geometria, alinhamento, gume, reflexo e acabamento da arma. Uma nota alta sem diferença visual é uma falha de produto.
3. **Qualidade e raridade são eixos distintos:** Uma peça comum perfeitamente forjada é uma obra-prima de sua categoria; uma arma de material raro mal forjada exibirá trincas, empenamento e imperfeições.
4. **Conteúdo raro exige gates de execução:** Lendárias e Relíquias exigem maestria, dificuldade elevada e condições especiais de forja.
5. **Customização preserva identidade estética:** Componentes, materiais e runas respeitam a silhueta e a herança visual de sua família (Bíblia Estética). Não há armas cobertas de neon ou puramente coloridas por rótulos de raridade.
6. **Cada arma conserva identidade individual:** Duas armas do mesmo projeto mantêm instâncias distintas com histórico de forja, atributos físicos (`P.ATK`, `DEF`, `AGI`, `DUR`), afixos e marcas de fabricação.
7. **Simulação e apresentação mantêm fronteira explícita:** A física de temperatura, estresse e deformação reside em `sim.ts`; a renderização em `ForgeCanvas.tsx` e `swordDraw.ts`; a interface em componentes React dedicados.
8. **THE PLAYER FORGES THE TROPHY (Fusão Híbrida — Opção C):** A fusão de espadas gera um núcleo, pré-forma ou projeto superior que exige forjamento manual na bigorna. A fusão nunca entrega uma espada Lendária pronta sem a execução da forja.
9. **Integridade Econômica e Transacional:** Cada evento de recompensa (moedas na bigorna, drops pós-forja, compra na oficina, consumo de 4 itens na fusão) possui chave de idempotência e transação atômica. Recarregar a página, duplo clique ou re-renderizações não duplicam pagamentos nem itens.
10. **Prevenção de Exploração por Fratura:** Lâminas quebradas propositalmente (`broken: true`) rendem apenas escória ou ferro bruto. Quebrar armas não pode se tornar estratégia rentável de obtenção de itens de alto escalão.
11. **Preservação de Dados do Jogador:** Migrações de save devem ser retrocompatíveis. Nenhuma versão nova de schema pode deletar, truncar ou corromper espadas, moedas ou inventário pré-existentes.
12. **Isolamento de Branches:** Desenvolvimento experimental ocorre em branch dedicada. A branch `main` nunca é modificada sem autorização explícita e validação total.
