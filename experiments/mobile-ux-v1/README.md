# FioForja — protótipo mobile navegável v1

**Status:** pronto para avaliação humana; não aprovado para integração ao jogo.
**Data:** 24/10/2026. **Branch:** `codex/mobile-ux-prototype-v1`. **Base:** `cca050e4911d3dd22001cc6ddcd11f8639bf39be`.
**Autoridade:** [FIOFORJA-MOBILE-UX-001](../../docs/DECISIONS.md#fioforja-mobile-ux-001).

## Abrir e revisar

No Poco, abrir **FioForja Protótipo**. É um aplicativo separado, pacote `com.projetofio.fioforja.prototype`, versão `0.1.0-prototype`. O FioForja original continua instalado com outra identidade e outro UID Android.

Prévia no computador: `http://127.0.0.1:8951/`. Para iniciar novamente, na raiz deste worktree:

```powershell
node node_modules/vite/bin/vite.js --config experiments/mobile-ux-v1/vite.config.ts
```

Para compilar o companion usando o SDK/JDK21 e projeto Capacitor já preparados neste ambiente:

```powershell
node experiments/mobile-ux-v1/build-demo-apk.mjs
```

Saída: `APK/FioForja-prototipo-ux.apk`. A receita reutiliza os arquivos nativos versionados e a sincronização Capacitor já existente; não substitui `npm run apk`. Em um checkout recém-preparado, é necessário instalar as dependências do lockfile e sincronizar primeiro o alvo Android conforme a [receita existente](../../docs/specs/android-apk.md). Os intermediários do companion ficam exclusivamente em `APK/mobile-ux-native/`.

O fluxo inicial de encaminhamento USB/abertura no navegador foi rejeitado pela revisão automática. A alternativa executada foi um companion local, offline e com identidade própria; instalação e abertura foram confirmadas no aparelho. Nenhuma alteração de rede global foi necessária.

## Recorte entregue

- **Preparação:** prévia superior persistente, ajustada pelo `fitWeaponViewport` existente; etapas Projeto, Material e Montagem; escolha de projeto/metal/perfil/guarda/empunhadura atualiza o desenho. O catálogo é demonstrativo e não promete os desbloqueios do save real.
- **Fabricação:** modo sem barra inferior, topo da bigorna em perspectiva oblíqua com asset R4B existente, mão em repouso à direita e HUD fora do canvas. Toque de segurar/soltar, regiões de golpe, calor, reaquecimento, têmpera e conclusão usam `createSim/stepSim` existentes em memória.
- **Coleção:** dois itens por página nesta hipótese visual, nome/raridade/qualidade/ATK/DEF/AGI/DUR, filtros de raridade, inspeção e comparação de duas armas. Quantidade de itens por página não é decisão final.
- **Revelação:** resultado demonstrativo com imagem grande e dados da própria simulação. Quebra usa os fragmentos do renderizador legado, sem remontar uma arma íntegra. A barra aparece na Revelação nesta variante, sujeita à avaliação humana.
- **Início, Loja, Jogador e categorias secundárias da coleção:** acessos identificados como demonstração, sem reconstrução integral. A barra contém as cinco seções aprovadas.

## Reuso e isolamento

Prévia, coleção e armas íntegras usam o Weapon DNA existente; a forja física e os fragmentos usam o renderizador legado. Isso não altera o modo padrão do jogo. Fundo, bigorna e mão são os assets existentes; não foram criadas novas artes nem aplicadas deformações falsas de perspectiva.

`specimens.ts` contém quatro armas produzidas pelas ações reais da prova do emulador `2026-10-24T18-23-16-188Z-21288`. São exemplos fixos, não leitura do inventário do proprietário. O saldo de 850 é rotulado como exemplo. A tentativa demonstrativa usa `isTraining: true`; sua conclusão não é adicionada ao Arsenal de exemplos nem ao save real.

Não há chamadas de transações, `loadSave`, `writeSave`, `setItem`, compra, consumo de itens ou recompensa persistida. O app original instalado foi lido por `sha256sum`: hash **d9b7825342a2bc08bd65924bda4f193278d8485d27d9826d25e4ac86914d8b97**, idêntico à entrega anterior. UIDs observados: original `10264`, companion `10295`. As capturas do companion registraram `storageKeys: []`. Isso evidencia isolamento no percurso observado; não é um ensaio geral de durabilidade do save original.

## Evidência no Poco

Medidas físicas observadas: **1080×2400**, **440 dpi**, navegação por gestos, recorte superior de **103 px**. WebView do companion: **392×819 CSS**, DPR **2,75**. O viewport visual fracionário do app original era 392,727×819,273; a API `innerWidth/innerHeight` informa inteiros. As medidas não vieram da resolução comprimida do vídeo.

Capturas nativas e observações DOM/CDP ficam em `evidence/` (ignoradas no Git; os artefatos finais também foram entregues nas pastas APK). `observe-device.mjs SERIAL NOME` lê apenas o companion em execução e recusa screenshot de outro aplicativo em primeiro plano. Os toques de verificação foram enviados por ADB a partir de controles observados, usando o deslocamento e DPR medidos; não houve injeção de estado React ou de save.

| Verificação | Evidência e envelope |
|---|---|
| Preparação e montagem | Capturas `final-preparation`, `final-assembly`; prévia inteira, margens de pixels pintados positivas |
| Fabricação imersiva | `final-forge`; `navigation: false`, canvas central, controles fora da cena |
| Orientação térmica | `release-forge-cold`, `cold-warning`; aviso textual e ação de reaquecimento destacada |
| Segurar/soltar | `strike-after-reheat`; contador avançou e HUD registrou bom golpe por gesto físico |
| Coleção | `final-collection`; nome, atributos, raridade, duas imagens inteiras e navegação visível |
| Paginação/inspeção/comparação | `navigation-check.json`, `collection-page-2`, `inspection`, `comparison`; PASS no percurso registrado |
| Saída da fabricação | `final-exit-dialog`, `final-return`; modal explícito e retorno à preparação |
| Quebra preservada | `review-regression.json`, `release-broken`; quatro golpes frios físicos, renderer `legacy-broken`, fragmentos sem corte |
| Rolagem global | `document` igual ao viewport nas telas centrais observadas; detalhes podem ter rolagem local |
| Tipos/lint/build | TypeScript e ESLint focados sem erros; bundle Vite e APK companion compilados |

Uma revisão independente por leitura de código encontrou dois problemas materiais, corrigidos somente no experimento: imagem íntegra após quebra e reaquecimento oferecido fora do intervalo aceito pelo motor. O caso de quebra foi reexecutado fisicamente; o guard térmico foi comparado com a simulação existente em Damasco a 60% e 57%.

O lint global inicialmente incluiu JS gerado pelo Gradle em `android/app/build/` (1.496 erros em arquivos gerados). O ajuste de desenvolvimento exclui esse intermediário, `APK/` e `.build/` do protótipo; não suprime regras de código-fonte. Nenhuma dependência foi atualizada.

## Limites preservados

- **Aceitação visual e game feel:** pendentes de avaliação do proprietário. Capturar as telas não aprova câmera, escala do martelo, materiais ou composição final.
- **Arte/processo:** a forma bruta e suas marcas continuam as do renderizador existente. O contato animado do martelo, a circulação entre estações e o banho ainda são uma adaptação experimental, sem aprovação estética final.
- **Regra térmica existente:** Damasco considera ideal a partir de 62%, mas o motor só aceita reaquecimento abaixo de 58%. A UI explicita o limite e desabilita a ação fora dele. Alterar essa regra requer decisão própria; não foi feito neste recorte.
- **Áudio, economia, progressão, persistência, recompensas e desbloqueios:** não validados por este companion; o percurso é demonstrativo. Não substituir o APK de jogo por este arquivo.
- **Dispositivos:** observação em um Poco, em retrato. Desempenho sustentado, acessibilidade completa, outros aparelhos, paisagem e continuidade após fechamento do companion não foram demonstrados. O estado do protótipo é descartável.
- **Navegação completa:** compras, carreira, encomendas e gestão de equipamentos ainda não foram reconstruídas. Não interpretar seus acessos demonstrativos como funções entregues.

Próximo passo: o proprietário avaliar preparação, fabricação e coleção no Poco. Ajustar esse recorte conforme evidência antes de integrar o padrão às demais telas. Sem merge ou push nesta entrega.
