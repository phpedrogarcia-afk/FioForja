# M03A — Da escolha à bigorna

**Resultado:** implementação e verificações técnicas concluídas; versão instalada e observada no Poco; **aceitação humana pendente**. Branch `codex/forge-preparation-m03a`, base `2ac3cf58686f71f14510b82bb2ec2a096f5b1912`, que contém M02B `653694b` e a M03A anterior. A frente Antigravity `67ab141` permaneceu separada. Sem merge ou push.

## O que mudou

- A lista de projetos disponíveis ganhou miniaturas desenhadas pelo mesmo `WeaponPreview` usado no jogo, no modo Clássico ou Weapon DNA. Projetos bloqueados ficam em grupo expansível; cada requisito pode ser consultado sem habilitar a seleção. As miniaturas representam os padrões do projeto; a prévia grande representa as escolhas atuais.
- Trocar projeto ou família mantém o metal e as personalizações válidas; campos não personalizados recebem os padrões existentes. Nome, perfil, guarda, cabo, pomo, comprimento, inscrição e runas continuam disponíveis. A tela informa o insumo, bloqueios e acesso à Loja.
- `id` e `customizedFields` são **campos opcionais adicionais no objeto design**, persistidos na estrutura v5 existente. A versão do save não mudou. Eles preservam a identidade do projeto e escolhas explícitas mesmo após reabrir. Saves antigos sem marca permanecem aceitos: se uma escolha antiga já era igual ao padrão, não existe evidência para distinguir intenção; diferenças em relação ao padrão anterior são preservadas quando identificáveis.
- Com um ID canônico explícito, a verificação também exige desbloqueio de outro projeto identificado simultaneamente por família e perfil. É um **endurecimento observável do gate** para esses designs, necessário para evitar um bypass demonstrado; não é equivalência universal de comportamento. Para designs antigos sem ID, o matching histórico foi mantido. O Compêndio reconhece o ID da arma personalizada, evitando creditar outro projeto por colisão de nome. Limiares de progressão, consumo, preços e física não mudaram.
- Núcleos exibem raridade e número de espadas de origem; família, perfil e metal continuam bloqueados, e o núcleo continua pré-forma para forja. A seleção de qual núcleo preparar ainda vive somente na sessão antes de iniciar a tentativa; após reabrir, é preciso selecioná-lo novamente do inventário. O checkpoint da tentativa iniciada continua canônico.

## Comparação antes/depois

Mesmo save inicial sintético, renderer Clássico, navegador DPR 1. Antes é a M03A 0.2.5; depois é o refinamento desta missão. As dimensões são CSS, não equivalem a um teste humano.

| Medida | 360 × 800 | 392 × 819 |
|---|---:|---:|
| Canvas principal antes e depois | 326 × 282 px | 358 × 289,6 px |
| Excesso rolável com lista fechada, antes/depois | 0 / 0 px | 0 / 0 px |
| Excesso com projetos abertos, antes/depois | 343 / 176 px | 332 / 165 px |
| Caracteres visíveis amostrados, lista fechada, antes/depois | 264 / 264 | 264 / 264 |
| Caracteres visíveis amostrados, lista de projetos aberta, antes/depois | 305 / 213 | 305 / 213 |

O teste usa um save inicial com um projeto disponível; usuários com outros desbloqueios verão mais cards. Caracteres são contagem aproximada de elementos textuais visíveis, incluindo carteira/barra, não OCR nem medida de compreensão. A área informada é o canvas, não a área opaca da lâmina. Nas capturas inspecionadas a arma aparece inteira: **100% visualmente observado nas amostras**, sem afirmar cobertura universal de pixels/efeitos.

Quando projeto e metal já estão válidos, começar usa **um toque**, como na base. Escolher ambos explicitamente usa **cinco toques**: abrir/selecionar projeto, abrir/selecionar metal e começar. São três decisões principais, mas a meta orientativa de até três **toques** para escolher ambos não foi atingida. Os requisitos de projeto bloqueado exigem abrir a lista, o grupo de bloqueados e o detalhe. A escolha priorizou imagens, acesso aos requisitos e preservação da transação.

### Evidência visual

- [Antes, projetos em 360](evidence/before-projects-360.jpg) e [depois, projetos em 360](evidence/projects-refined-360.jpg); [antes em 392](evidence/before-projects-392.jpg) e [depois em 392](evidence/projects-refined-392.jpg).
- [Preparação final em 360](evidence/after-360.jpg) e [392](evidence/after-392.jpg); [requisito de bloqueado](evidence/bloqueados-refined-392.jpg).
- [Weapon DNA em 360](evidence/dna-refined-360.jpg), [curva em 360](evidence/dna-curva-360.jpg) e [392](evidence/dna-curva-392.jpg); [Clássico em 360](evidence/classico-curva-360.jpg) e [392](evidence/classico-curva-392.jpg).
- [Núcleo sem metal](evidence/core-sem-metal-392.jpg), [núcleo após Loja](evidence/core-pronto-392.jpg), [forja e recuperação em build web](evidence/build-forja-392.jpg).
- [Medições da base e primeira grade](evidence/comparison.json); [medidas finais com bloqueados agrupados](evidence/refined-metrics.json). A primeira grade expunha todos os bloqueados e exigia 811/780 px de excesso rolável; o agrupamento reduziu esse custo. Essas alternativas foram medidas na mesma sessão, não em experimento controlado de usabilidade.

## Verificação

- **190 testes relevantes PASS**, incluindo progressão, transações, Craft/Coleção, save, preparação e renderer. O teste geométrico DNA cobre oito projetos × dois comprimentos × duas áreas (**32 combinações**, incluídas em um teste); não prova pixels, antialias ou todos os efeitos.
- **6 testes de Android/assets PASS**; typecheck PASS; lint **0 erros / 38 avisos herdados**. Regressões novas foram observadas falhar antes das correções para preservação, bloqueio por família/perfil, persistência de intenção e reconhecimento do projeto na galeria.
- UI com saves sintéticos: projeto/metal, bloqueio e requisito, customização → troca → Loja → retorno/reabertura, escolha explícita igual ao padrão após reload, falta de material, núcleo e identidade travada. No build web para Android: fabricação e retomada de tentativa iniciada, inclusive com núcleo, sem usar dados do proprietário.
- Revisão independente identificou bypass de gate e falha de identificação no Compêndio; ambos corrigidos com testes. Em auditoria focal de 1.792 combinações sem ID, o revisor reportou nenhuma diferença do helper em relação à base; isso não prova todas as variantes de save ou núcleo. A escolha de identidade explícita foi testada apesar da consulta Kev reportar evidência insuficiente (`cfb00a45...`); o caso concreto e os testes prevaleceram, sem atribuir eficácia à consulta.

## Android e dispositivo

APK **0.2.7 / código 9**, 12.130.249 bytes, SHA-256 `d47dcf2cce21551867afc724c6f21360690e1fb2c101033e4ece01224d45d20b`. Entregue em `C:\Users\phped\Documents\FioForja\APK\FioForja-teste.apk` e cópia versionada. Package ID `com.projetofio.fioforja`, certificado anterior `29896d7ad281e0f642a44d513b2b277a3e1723de2df0d796ea0eff1a8af195bc`, 11 assets locais e ausência de permissão INTERNET verificados. Build com fontes não commitadas declaradas; hashes de blobs em `verification.json`.

As versões 0.2.5 e 0.2.6 foram preservadas antes das substituições. No Poco, atualização final **0.2.6 → 0.2.7** com a mesma assinatura: dez arquivos de Local Storage idênticos antes/depois da instalação, antes de abrir. Backup privado dos dados e do APK anterior em `C:\Users\phped\Documents\FioForja\APK\Backups\poco-M03A-refinado-20261027-205833`. O app abriu com dados existentes; prévia e seleção de projetos foram observadas no aparelho. Sem compra, mudança de projeto ou forja no save do proprietário.

Emulador isolado em modo de leitura, Wi-Fi e dados desativados e **nenhuma rede padrão ativa**: APK 0.2.7 abriu, comprou aço no save de teste, retornou à preparação e entrou no aquecimento com cena carregada. Isso comprova esse trecho offline, não uma partida inteira. O primeiro processo do emulador encerrou inesperadamente após abrir a versão intermediária; a segunda execução com renderer de software permitiu a prova. O broadcast direto de modo avião foi negado pelo Android; não foi usado para afirmar ausência de rede, que foi conferida via conectividade. Evidência detalhada permanece em `APK/evidence/M03A-offline-avd`, ignorada pelo Git, por conter o estado de teste preexistente do AVD.

## Limites e próxima etapa

**NOT_PROVEN:** aceitação humana, desempenho sustentado das miniaturas no Poco, teclado virtual, ciclo completo offline, áudio e fabricação física com o estoque do proprietário. O objetivo de até três toques para alterar projeto e metal não foi atingido. A compatibilidade estética entre famílias e metais não tem matriz implementada; não foi inventada. A prova de prévia cobre capturas selecionadas e limites geométricos, não toda variação de pixels.

O documento fornecido sobre intuitividade propõe tutorial contextual, feedback térmico e de golpes e revelação; essas ideias ficam para planejamento de M04A/M04B/M05, coordenado com Antigravity. Nenhum tutorial, efeito, câmera ou martelo foi implementado nesta missão.
