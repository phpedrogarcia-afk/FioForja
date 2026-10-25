# Coleção real — Arsenal, inspeção e montagem

**Estado:** `[AGENT-IMPLEMENTED]` `[VERIFIED]` no envelope funcional da [revisão Codex 08](../../.project-intelligence/experiments/CODEX08-review.md), base `78945e0` + working tree revisado: testes, navegador e instalação/troca/inspeção no AVD do APK 0.2.2. No Poco, a prova se limita a reinstalação/restauração/navegação com baseline preservado. Candidata à avaliação humana.
**Fonte de dados:** `save.gallery`, `save.inventory` (componentes, runas, núcleos), `catalog.ts` e `blueprints.ts`.

## 1. Seções internas

| Aba | Conteúdo |
|---|---|
| **Arsenal** | cartões 2×2 com arma inteira, raridade, qualidade, P.ATK/DEF/AGI/DUR; filtro por raridade; lâminas quebradas aparecem como fragmentos |
| **Compêndio** | 8 projetos canônicos com estado (bloqueada/pronta/falta metal/fabricada/dominada), requisito literal e estoque do metal |
| **Peças** | guardas, cabos, pomos e runas soltas; bônus reais; instalação numa espada |
| **Runas** | compêndio de runas (escola, raridade, efeito) e quantidade de peças soltas |
| **Núcleos** | núcleos persistidos, raridade, potencial, herança e origem; ação "Preparar na Forja" |
| **Comparar** | duas espadas lado a lado e diferença por atributo |

## 2. Inspeção

Lê a espada **por ID** do estado canônico; não guarda uma cópia divergente. Mostra:

- prévia grande (DNA opt-in, legado como fallback);
- atributos compostos, estado estrutural e durabilidade;
- família, perfil, material, guarda, cabo, pomo, inscrição;
- montagem instalada por categoria (guarda/cabo/pomo/runa), com **Instalar** ou **Trocar**;
- propriedades/afixos, histórico de fusão (núcleo, número de doadoras, data, traços) e origem;
- **Proteger/Desproteger** e **Refinar**: preço da próxima operação e delta efetivo de ATK/DUR, calculados pelo mesmo `getSwordUpgradeQuote` da transação. O custo é 60×(nível+1) ouro, +1 rubi a partir do segundo refino, com máximo de três refinos. O delta exibido respeita o limite real de durabilidade; não promete ganho que o recálculo não entrega.

Os painéis da Coleção só abrem enquanto ela é a seção ativa. Ir da inspeção à Loja remove o portal da tela; ao retornar, a seleção da arma continua preservada.

## 3. Instalação e troca

`executeComponentInstallTransaction` é a única porta:

1. encontra a espada e o componente;
2. recusa lâmina quebrada;
3. remove o componente do inventário;
4. devolve a peça anterior da mesma categoria ao inventário;
5. ajusta o `design` (guarda, cabo, pomo ou runa) e registra o afixo de montagem;
6. recalcula **todos** os atributos por `recalculateSwordStats`;
7. grava antes de devolver sucesso.

A UI relê a galeria após a transação; o painel reflete o novo valor sem inventar delta.

## 4. Proteção mínima (favoritos)

O jogo não possuía favoritos. Esta entrega adiciona **apenas** o campo aditivo `favorite?: boolean` em `FinishedSword`:

- é gravado no save, retrocompatível (ausente = não protegida);
- aparece no cartão e na inspeção;
- `swordFusionBlockReason` e `validateSwordFusionTransaction` recusam a doadora protegida;
- não existe "equipada" nem outro estado simulado.

## 5. Provas

- Instalar guarda: DEF 186 → 194 no percurso de navegador; defesa sobe e o save recarregado mantém a peça.
- Troca devolve a peça anterior ao inventário (teste).
- Lâmina quebrada recusa montagem (teste).
- Proteção bloqueia fusão (teste).
- Operação 08: o percurso [inspeção → Loja → inspeção](../../experiments/CODEX08-review/ui-regressions-green.json) confirma que o portal oculto não intercepta a nova seção e que a inspeção é preservada. O percurso de refino verifica preço e delta limitado antes do débito. Ambos têm controles RED em arquivo separado; não são validação Android.
- Operação 08 no [AVD](../../experiments/CODEX08-review/android-summary.json): instalar/trocar guarda produz DEF 185→193→195 e devolve a antiga; a nova espada Épica Q75 e seus efeitos sobrevivem ao reabrir. A inspeção persistida mostra a arma inteira. O frame imediato da Revelação tem canvas vazio, sem isolamento de timing versus desenho; não foi declarado resolvido.

## 6. Limites

- Compatibilidade de peça é por **categoria**; não há restrição por família/perfil além da montagem existente.
- O histórico de fusão guarda IDs das doadoras; depois do consumo não é possível reabrir seus nomes, apenas o núcleo, a data e os traços.
- A Coleção não pagina; o Arsenal cresce em grade com rolagem interna.
