# FioForja — entrada para agentes

FioForja é um jogo de forja medieval no navegador. O protótipo deixa projetar, aquecer, martelar, temperar e guardar espadas; a direção de produto vai além do que está implementado.

Antes de qualquer mudança, confirme a raiz Git, a branch e o estado do worktree. Leia [estado atual](PROJECT-STATE.md) para o snapshot e próximo passo, e [mapa semântico](PROJECT-MAP.md) para localizar o fluxo relevante. Use os arquivos da implementação e seus testes para conferir comportamento. Não altere trabalho experimental de outra branch.

Trabalhe com mudanças estreitas e verificáveis. Preserve a separação entre simulação, Canvas e save; consulte os [invariantes](INVARIANTS.md) antes de mudar o loop ou a persistência. Diferencie fato, hipótese, decisão e desconhecido. Alegações visuais exigem baseline e evidência de renderização; testes periféricos não provam gameplay. Registre aprendizados duráveis com evidência em Project Intelligence e não repita um caminho falsificado sem informação nova.

Para intenção de produto, consulte [Constituição](CONSTITUTION.md), [Conceito](CONCEPT.md), [Invariantes](INVARIANTS.md), [Decisões](DECISIONS.md) e os documentos canônicos de [estética](canon/estetica.md) e [Galeria](canon/galeria.md). [Project Intelligence](../.project-intelligence/README.md) guarda evidências e aprendizados duráveis. Leia apenas o que a missão exigir; mockups e especificações futuras não provam implementação.
