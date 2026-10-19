# Codex 05 — callbacks não eram identidade física

**Data:** 18/10/2026. **Fonte original:** gameplay `0663f4e5`.

**OBSERVED:** um golpe premiado passava por recordStrike e strikeReward; o contador chegava a 2 para uma ocorrência. Finish aceitava simulação sem vínculo estrito; a rota de núcleo não criava tentativa/reserva. Reload recuperava identidade e criava nova metalurgia. Treino cancelado dava sucata e conclusão dava ajuda ilimitada.

**Evidência:** [RED e controles negativos](../../experiments/M03-cross-agent-integration/evidence/gameplay-red.txt), [dupla contagem](../../experiments/M03-cross-agent-integration/evidence/gameplay-strike-red.txt), [GREEN integrado](../../experiments/M03-cross-agent-integration/evidence/integrated-test.txt).

**ADAPT:** transação única por checkpoint físico run+sequência; finalizar pelo estado confirmado; núcleo no mesmo início; snapshot físico versionado. Treino cancelado não paga; recuperação para quando existe acesso básico à forja.

**Limite:** valida ciclo local e replay de callbacks; não é anti-cheat de servidor nem prova de concorrência entre abas. Testes anteriores verdes não cobriam a UI nem esses caminhos; contagem de testes não substitui contraexemplo.
