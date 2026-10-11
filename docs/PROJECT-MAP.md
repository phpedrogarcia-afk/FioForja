# Mapa semântico do FioForja

Este mapa orienta leitura e mudanças. Código e testes prevalecem sobre descrições históricas do comportamento atual; `docs/CONSTITUTION.md`, `docs/INVARIANTS.md` e `docs/canon/` governam a intenção de produto.

## Fluxo jogável

`src/routes/index.tsx` monta `src/game/GameApp.tsx`. `GameApp` coordena **título → projeto → forja → revelação → galeria**, recebe a arma concluída e atualiza o arsenal. As telas ficam em `src/game/screens/`.

Na forja, `ForgeCanvas.tsx` mantém o loop de quadros e o desenho Canvas, envia entrada para `sim.ts` e apresenta o estado via `ForgeHud.tsx`. `sim.ts` calcula calor, golpes, têmpera e resultado; `types.ts` define o estado; `catalog.ts` contém opções e limiares atuais. `swordDraw.ts` desenha arma e componentes; `assets.ts` carrega imagens e `audio.ts` trata áudio. Preserve a fronteira simulação/apresentação de `docs/INVARIANTS.md`.

`GameApp.tsx` chama `save.ts` para carregar/gravar projeto, preferências e até 24 armas no `localStorage` do navegador. Alterações no formato ou limite de save exigem exame de migração e perda de dados antes de implementação.

## Aplicação e suporte

`src/router.tsx` e `src/routes/` compõem a aplicação TanStack. `src/routes/__root.tsx` inclui `AuthProvider` e ponte de preview; `src/lib/auth/`, `src/lib/app-data/`, `src/lib/db.ts`, `migrations/`, `server/` e `scripts/` dão suporte a autenticação, dados, preview, build e verificações. Sua existência não prova que login ou banco façam parte do loop jogável. `public/game/` contém arte usada pela cena.

## Fontes e verificação

`AGENTS.md` na raiz é somente uma ponte de descoberta; `docs/AI-START-HERE.md` continua a entrada canônica e contém as regras operacionais curtas. `docs/PROJECT-STATE.md` guarda o estado do snapshot documentado. `docs/DECISIONS.md` registra escolhas e pendências; `docs/CONCEPT.md`, `docs/CONSTITUTION.md`, `docs/INVARIANTS.md`, `docs/GLOSSARY.md` e `docs/canon/` orientam produto. `.project-intelligence/` preserva aprendizados com evidência; seus registros devem citar commit/execução e limites. O `.gitignore` ainda exclui novos arquivos com nome `AGENTS.md`; esta ponte foi adicionada explicitamente ao versionamento sem mudar essa regra.

`package.json` é a fonte dos comandos `dev`, `typecheck`, `test`, `lint` e `build`. Os testes presentes cobrem `scripts/`, autenticação e app-data; não há arquivo de teste em `src/game/` neste snapshot. O build executa também migração de banco. Antes de afirmar regressão visual ou qualidade de gameplay, use evidência de navegador e baseline adequado, além dos testes existentes.
