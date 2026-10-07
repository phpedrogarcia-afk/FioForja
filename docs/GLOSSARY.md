# Glossário

Termos de produto não devem ser confundidos com os tipos atualmente existentes no código.

| Termo | Significado no produto | Estado / equivalente no código |
|---|---|---|
| **Sword / Weapon Definition** | Projeto ou modelo reutilizável de arma. | Não há entidade `WeaponDefinition`. O catálogo fornece perfis, aços e opções; `SwordDesign` é a escolha concreta de projeto. |
| **Forged Weapon** | Uma peça individual produzida pelo jogador, mesmo quando repete um modelo. | `FinishedSword`: projeto, nota, parcelas de resultado, empenamento, ID e data. Não guarda sequência completa de golpes. |
| **Family** | Linguagem visual reconhecível por silhueta, construção e compatibilidade. | Não há tipo `Family`; `ProfileId` é perfil geométrico e `SteelId` é aço. Não os trate como taxonomia de famílias. |
| **Material** | Substância que muda aparência e comportamento. | `SteelId` parametriza o metal da lâmina; cabo, guarda e pomo têm opções próprias. Não há entidade genérica `Material`. |
| **Quality** | Resultado da execução da forja, expresso por nota e acabamento. | `quality`, `grade`, `heatScore`, `forgeScore`, `quenchScore` e `warp` em `FinishedSword`. Não é raridade. |
| **Rarity** | Prestígio ou classe de conquista, independente da qualidade numérica. | Não existe campo, enum ou gate de raridade implementado. |
| **Mastery** | Domínio acumulado do jogador sobre técnicas, materiais ou famílias. | Não há estado de maestria no modelo atual. |
| **Forge Phase** | Etapa da simulação. | `ForgePhase`: `heat`, `forge`, `quench`. |
| **Strike** | Golpe de martelo controlado pela força e pelo timing. | `StrikeKind`: `weak`, `good`, `perfect`, `hard`; são resultados do protótipo. |
| **Perfect Strike** | Golpe no ponto ideal de força enquanto o metal está em condição útil. | `gradeStrike` classifica a força perto do centro da janela; tolerância atual é ajuste de código, não balanceamento canônico. |
| **Legendary** | Arma rara com identidade e prestígio próprios. | Direção futura; não há raridade ou entidade Lendária no código. |
| **Relic** | Descoberta excepcional, reconhecível como peça única. | Direção futura; não implementada. |
| **Component** | Cabo, guarda, pomo, acabamento ou ornamento combinável. | Opções de projeto existem; coleção desbloqueável e compatibilidade não existem ainda. |
| **Rune** | Inscrição física com escola, efeito e domínio próprios. | Hoje `SwordDesign.runes` é booleano e `renderInscription` translitera caracteres; não há itens, slots ou efeitos rúnicos. |
| **Tool** | Equipamento da oficina que pode mudar o estilo da forja. | Há arte/uso cênico de mão, martelo e bigorna; não há modelo de equipamento ativo. |
| **Arsenal** | Espadas individuais já forjadas. | Campo `gallery` em save local, limitado às 24 mais recentes. |
| **Compendium** | Catálogo de modelos conhecidos, ocultos e descobertos. | Não implementado. |
| **Gallery** | Espaço de coleção, inspeção e legado do ferreiro. | A tela atual é uma lista simples do Arsenal; as seis áreas planejadas estão em [canon/galeria.md](canon/galeria.md). |
| **Collection** | Estado de descoberta e desbloqueio de definições e componentes, separado das peças forjadas. | Não há modelo `PlayerCollection` separado. |
