# FioForja — AI Start Here

Leia este mapa antes de propor mudanças. Ele separa direção de produto, comportamento observado e trabalho ainda hipotético.

## Leitura curta

1. [Constituição](CONSTITUTION.md): missão, princípios e sinais de sucesso ou falha.
2. [Conceito](CONCEPT.md): promessa do jogo e fronteira entre protótipo atual e direção futura.
3. [Estado do projeto](PROJECT-STATE.md): evidências verificadas no commit auditado e desconhecidos.
4. [Invariantes](INVARIANTS.md): propriedades que mudanças futuras precisam preservar.
5. [Glossário](GLOSSARY.md): termos de produto e equivalentes reais no código.
6. [Decisões](DECISIONS.md): decisões aceitas, hipóteses e escolhas ainda abertas.
7. Documentos de design canônicos: [Bíblia Estética](canon/estetica.md) e [Estrutura da Galeria](canon/galeria.md).

## Evidência e implementação

Para dizer o que existe hoje, confira o código e os testes. Um documento de design descreve intenção; não prova implementação. Use `KNOWN`, `OBSERVATION`, `HYPOTHESIS`, `UNKNOWN` e `NOT_PROVEN` quando a distinção mudar uma decisão. Não converta exemplos, nomes provisórios ou números de mockup em balanceamento aprovado.

O núcleo jogável está em `src/game/`: `sim.ts` calcula a forja, `ForgeCanvas.tsx` apresenta a cena, `swordDraw.ts` desenha a arma e `save.ts` persiste o arsenal local. A aplicação ao redor também contém infraestrutura de autenticação, banco e conectores; isso não significa que esses serviços sejam sistemas de gameplay.

Registre aprendizados duráveis em [Project Intelligence](../.project-intelligence/README.md), com evidência e limites. Não repita verificações sem mudança de estado ou hipótese.

Na auditoria de 2026-10-06 não havia `AGENTS.md` no checkout; `.gitignore` ignora `AGENTS.md` e `AGENTS.project.md`. Verifique instruções locais ignoradas ao iniciar uma tarefa neste ambiente.
