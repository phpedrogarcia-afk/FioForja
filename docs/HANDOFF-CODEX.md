# Handoff — integração Codex 05

## Recuperação curta

1. Comece pelo [mapa](AI-START-HERE.md) e pelo [estado atual](PROJECT-STATE.md).
2. Confira branch/HEAD/status reais. A branch desta entrega é `codex/cross-agent-integration-v1`, baseada em `0663f4e5` com integração seletiva do doador `a2fa0025`.
3. Leia o [relatório da rodada](../experiments/M03-cross-agent-integration/README.md): rastreabilidade, comandos reproduzíveis, falhas preservadas, percursos e limites. Esse é o índice de evidências, sem duplicar a Bíblia.
4. O [handoff DeepSeek](HANDOFF-DEEPSEEK-WEAPON-DNA.md) e o [laboratório M02](../experiments/M02-weapon-dna/README.md) são históricos, com PNGs/build originais preservados.

## Contratos implementados

- `transactions.ts`: início, checkpoint físico, finalização e claim persistem antes de avançar o estado econômico. Um golpe usa `forgeRunId:sequência`; replay não paga novamente. APIs antigas de callback foram mantidas como rejeição explícita.
- `sim.ts`: snapshot físico versão 1 e relógio acumulado. Nenhum RNG físico oculto foi encontrado no stepping atual; o estado determinante é preservado. Partículas/áudio ficam fora do snapshot.
- `ForgeCanvas.tsx`: checkpoint em golpe, fase, ferramenta/zona, intervalos de 0,75 s ativos e `pagehide`. Erro de escrita pausa e repete o mesmo checkpoint. Não promete continuidade entre frames não confirmados.
- Núcleo continua **4 espadas → núcleo → forja manual → arma final**. O metal é reservado no início; o núcleo é consumido no fim. Treino ignora núcleo e usa ferro canônico.
- Auxílio de treino: ver política exata em `needsTrainingRecovery`; cancelamento de treino é zero sucata. A rota de recuperação continua disponível ao falido.
- Weapon DNA: `?weaponRender=dna`; `?weaponRender=legacy` ganha de storage `dna`. Sem opção válida, legado. Miniaturas estáticas usam pixels cacheados; inspeção conserva luz interativa. A bigorna conserva seu renderizador.
- Instalação altera só montagem pertinente e proveniência; não recria semente da lâmina. O seed experimental corrigido muda imagens em relação ao DeepSeek; não é migração de save.

## Retomar verificações somente se o estado relevante mudar

```powershell
npm.cmd test
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run build
node experiments/M03-cross-agent-integration/browser-proof.mjs --run --serve --port 8947
node experiments/M03-cross-agent-integration/visual-proof.mjs
```

Os harnesses usam contextos Chromium descartáveis, dependências existentes e evidências em M03. `--preflight` verifica preparação sem alegar execução. O comparador visual exige build do doador exato; veja o protocolo no relatório para reconstruí-lo em outro ambiente. Aceita `--donor-root=CAMINHO` caso o diretório temporário padrão não exista. Não apague saves/perfis existentes.

## Continuidade e autoridade

- Não fazer merge em `main` nem mudar o padrão visual sem autorização humana.
- Preservar branches e experimentos anteriores; não fazer force push.
- Não iniciar minigame, monetização, nova arquitetura de memória ou outra campanha como parte desta entrega.
- Próximo passo: revisão humana da branch, das três comparações visuais e dos limites registrados. QA móvel e balanceamento longo são posteriores, ainda não provados.
