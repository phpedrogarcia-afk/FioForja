# Operação Codex 08 — revisão da integração DeepSeek

**Base auditada:** `78945e0de9d7a70d14994e80a14b2885998ec9ec`. **Branch:** `codex/mobile-core-review-v1`.
**Resultado:** candidato funcional revisado; aceitação visual humana e integração à main continuam pendentes.

## Decisões executáveis

| Mecanismo | Decisão | Ação comprovada |
|---|---|---|
| Cinco seções, controlador, save e inventário compartilhados | KEEP | Preservados; painéis de seções ocultas deixam de bloquear a seção ativa |
| Catálogo da Loja e normalização do componente | KEEP | A base já deriva efeitos de `article.componentData`; suspeita de autoridade do payload não se reproduziu. Regressões preservam o comportamento |
| Save com backup e retry | ADAPT | Primeiro backup só recebe o candidato após sucesso do primário; compra recusada deixa de reaparecer no reload |
| Fusão híbrida | ADAPT | Reconstruir receita possível do tier para validar custos, núcleo/componente, herança e fragmentos, com as doadoras atuais |
| Ferramentas | ADAPT | Restaurado Equipar para adquiridas e padrão, com persistência antes de refletir sucesso |
| Coleção e inspeção | ADAPT | Painéis respeitam seção ativa, conservando a seleção; preço e delta efetivo do refino vêm da transação |
| Encomendas | ADAPT | Escolha da arma por ID e histórico de entregues recuperados |
| Física, câmera, martelo, áudio, assets e Weapon DNA | KEEP | Nenhum redesenho; frente Antigravity permanece isolada |
| Remoção do GalleryScreen histórico e mudanças amplas de layout | DEFER | Não há necessidade demonstrada de remover/reconstruir neste recorte |
| Troca de fragmentos, balanceamento e progressão prolongada | DEFER | Funcionalidade e equilíbrio completos não são demonstrados por esta revisão |

Nenhum mecanismo precisou ser classificado REPLACE ou DELETE para cumprir o recorte. A implementação DeepSeek foi aproveitada como base; a WIP paralela antiga não foi integrada.

## Evidência automática

`npm test` completo: **475 descobertos / 468 PASS / 7 SKIP / 0 FAIL**.

- JavaScript: 203, sendo 196 PASS e 7 SKIP.
- TypeScript: 272, todos PASS; inclui 41 regressões novas em `src/game/mobile-core-review.test.ts`.
- Os sete SKIP: quatro contratos de skills de autoria ausentes no repositório standalone, um app-env local não distribuído e dois testes de symlink que exigem privilégio elevado no Windows.
- A suíte focal de 123 PASS é sobreposta; não somar ao total.
- Quatro percursos UI adicionais: [RED](ui-regressions-red.json) → [GREEN](ui-regressions-green.json), reproduzíveis por `node --experimental-strip-types experiments/CODEX08-review/ui-regressions.mjs` com Vite mobile em 8953.
- Revisão independente comparou 72 saídas com a base (6 raridades × 2 modos × 2 opções de catalisador × 3 sementes): zero diferenças semânticas, excluídos IDs/datas, e zero saídas legítimas recusadas. Não integra a contagem de `npm test`.
- Typecheck PASS; lint 0 erros/38 avisos; build web PASS. A migração de banco remoto foi SKIP explícito por ausência de `DATABASE_URL`; o fallback PGLite gerencia sua migração.
- Build mobile e APK PASS. Logs detalhados ficam locais/ignorados; resumo e hashes em [verification.json](verification.json).

## Android

**APK:** `0.2.2`, `versionCode 4`, `com.projetofio.fioforja`, 12.129.669 bytes.
**SHA-256:** `d528b890f9f83a2299f105874084bf8e7f8717e5c86a5cf920b74a393fc40f56`.

Destino: `C:\Users\phped\Documents\FioForja\APK\FioForja-teste.apk`, também com cópia `FioForja-debug-v0.2.2.apk`. A versão anterior 0.2.1/código 3 foi preservada, inclusive em `APK\Arquivo-Codex08\FioForja-v0.2.1-code3.apk`, hash `02e7ec2b01badbd848adf4212fc9e2a9abf2ce57aacd093747220cfbd0e8be8d`.

O build usou a base mais alterações revisadas, antes do commit final. `BUILD-INFO.txt` declara alterações não commitadas; não atribuir o binário ao HEAD limpo da base. O manifesto liga o código revisado ao hash do APK. Assinatura debug verificada; nenhum segredo/keystore/APK entra no Git.

### Emulador — percurso completo com fixture declarada

[Resumo Android](android-summary.json): AVD `FioForja_API36_APK`, `emulator-5556`, API36, tela 1080×2400, viewport 412×839/DPR 2,625. Atualização 0.2.1 → 0.2.2 sem limpar dados; aço/catalisador/duas guardas comprados; montagem/troca DEF185 →193 →195 e devolução da anterior; quatro Raras → núcleo Épico com catalisador consumido; aço1 →0, oito golpes, têmpera98, espada Épica Q75; núcleo consumido na conclusão e estado preservado ao reabrir. Recompensas geradas, não coletadas.

Entradas por ADB nativo; CDP usado para leitura e semeadura explícita da fixture antes do percurso, nunca para chamar transações ou simulação. O save anterior do AVD foi preservado. Fixture não é progressão natural. As interrupções/reparos do harness estão registrados sem repetir as transações já comprovadas.

### Poco — reinstalação e recuperação, sem fixture

[Resumo físico](poco-summary.json): M2103K19PG, viewport392×819/DPR2,75. O proprietário confirmou que desinstalou o original voluntariamente por confundi-lo com o companion mais avançado e autorizou a reinstalação. A recuperação aplicou o snapshot do proprietário lido antes da remoção, comparado na escrita. Depois houve uma nova forja local antes do baseline da navegação; esse progresso não foi sobrescrito. Atores dessa atividade não são atribuídos pela observação.

As cinco seções e Voltar Craft → Loja foram operados por toque/tecla nativa; o baseline da navegação permaneceu exatamente igual após background, force-stop e reabertura. Isso prova reinstalação/recuperação e o percurso observado, não atualização por cima no Poco. Compras/fusão não foram executadas sobre o inventário do proprietário nesta prova. Snapshots privados e capturas ficam apenas em `evidence/`, ignorado pelo Git.

## Limites e próximo investimento

- Reconstrução de receita verifica resultados possíveis; não autentica o sorteio original nem toda troca coerente de `usedCatalyst true → false`. Não é proteção absoluta contra edição deliberada do save local.
- Núcleos antigos continuam válidos; as restrições de novas fusões não reavaliam doadoras ausentes.
- A captura imediata da Revelação no AVD mostrou título/atributos com canvas vazio. A captura posterior da inspeção mostrou a arma inteira. Timing versus comportamento do desenho ainda é NOT_PROVEN; não declarar correção nem aprovação desse primeiro frame.
- HUD estreito, câmera, animações e tato pertencem à frente Antigravity e não foram alterados.
- Desempenho sustentado, áudio físico, acessibilidade completa, equilíbrio de longo prazo e aprovação artística permanecem NOT_PROVEN.

Próximo investimento: proprietário jogar o APK funcional e avaliar o primeiro frame da Revelação e o enquadramento da forja; incorporar a frente Antigravity somente depois de sua revisão específica. Não reconstruir novamente navegação/Loja/Craft.

As correções históricas de Raro/Lendário e contagem de testes estão no [registro permanente](../../.project-intelligence/experiments/CODEX08-review.md). Os JSONs históricos da Codex 07 permanecem intactos.
