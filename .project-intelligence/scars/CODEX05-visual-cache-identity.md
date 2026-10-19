# Codex 05 — cache exige identidade semântica e controle de pixels

**Data:** 18/10/2026. **Doador:** DNA `a2fa0025`.

**OBSERVED:** fingerprint numérico usava comprimentos de nomes, omitia propriedades e arredondava parâmetros. Troca real de componente alterava design e rerrolava a lâmina. URL legacy perdia para storage dna.

**ADAPT:** chave completa da geometria; seed físico sem montagem/nome/inscrição; parsing por tokens de catálogo; URL válida primeiro; miniaturas raster por genoma completo/dimensões/DPR, com LRU limitado.

**Evidência:** [regressões DNA](../../experiments/M03-cross-agent-integration/evidence/dna-red.txt), [testes integrados](../../experiments/M03-cross-agent-integration/evidence/integrated-test.txt), [prova controlada](../../experiments/M03-cross-agent-integration/evidence/visual-proof-controlled-final.txt).

**Controle negativo:** a primeira exigência de igualdade exata falhou por diferenças de 1 nível/canal. Repetir desenho direto, sem cache, reproduziu as mesmas diferenças. A comparação final exige pixels cacheados idênticos ao desenho direto contemporâneo e registra a diferença contra a leitura inicial; não mascara a diferença como zero.

**Limite:** benefício é repintura com cache quente; rasterização fria custa mais. Benchmark com readback não equivale a FPS apresentado, primeiro paint ou desempenho móvel. Arte permanece AGENT-DESIGNED.
