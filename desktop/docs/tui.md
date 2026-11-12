# TUI

A interface de terminal abre com `{{bin}}` sem argumentos ou com
`{{bin}} tui`. Ela exige stdin e stdout em um TTY; fora disso o processo
encerra com exit code 8.

## Abas

As abas são numeradas, e a tecla com o número vai direto para a aba. O
texto da interface segue `SETUPVIBE_LANG` e, sem ela, `LANG`: português ou
inglês, como a documentação embutida.

| Aba | Conteúdo |
| --- | --- |
| 1 Início | Máquina (sistema, variação, arquitetura, edição), estado (init, usuário, canal), itens por status com uma barra de progresso, a última execução, o próximo passo recomendado e os atalhos principais. |
| 2 Inventário | Categorias à esquerda com a contagem `instalados/total`; à direita, os itens da categoria em colunas (status, nome, versão fixada, versão instalada) e a legenda dos símbolos; embaixo, os detalhes do item ou o plano. `h`/`l` (ou `[`/`]`) trocam a categoria, `j`/`k` movem, `g`/`End` vão ao início e ao fim, `espaço` marca, `i` instala e `r` remove os itens marcados (ou o atual). O primeiro toque mostra o plano; o segundo toque na mesma tecla executa, e qualquer outra tecla cancela. As ações rodam o CLI em outro processo. A linha de status resume os itens por status ou mostra o resultado da última ação. |
| 3 Usuário | Usuário de trabalho, edição, sistema e variação, e a checklist agrupada em Permissões (grupo sudo, sudo sem senha), Pastas (`~/.setupvibe`, `~/.local/bin` no PATH, `~/.ssh`, `authorized_keys`) e SetupVibe (init e o aviso dos aliases `cc`, `cx` e `oc`, que pulam as confirmações de permissão). O título mostra quantas pendências existem. |
| 4 Doctor | Os mesmos achados do `doctor`, agrupados em Problemas, Avisos e Em ordem, cada um com o comando que resolve. `f` aplica as correções seguras (`doctor --fix`), marcadas com `[f]`; `u` atualiza a tela. |
| 5 Logs | Execuções em `~/.setupvibe/logs`, da mais recente para a mais antiga, com data, hora e comando; à direita, os eventos de cada uma, com a mensagem de erro abaixo de cada falha. |
| 6 Sobre | Binário com sistema e variação detectados, projeto, licença, créditos e padrões seguidos. |

A aba inicial é Início, ou a que estiver em `tui.initialTab` no
settings.json ou em `--tab` (`overview`, `inventory`, `user`, `doctor`,
`logs` ou `about`). Num terminal com menos de 110 colunas ou 32 linhas, o
Inventário estreita as colunas e reduz os espaços; as categorias e os itens
rolam quando não cabem.

## Teclas

| Tecla | Ação |
| --- | --- |
| `←` `→` `[` `]` | aba anterior ou seguinte |
| `Tab` | próxima aba |
| `1` … `6` | ir para a aba de mesmo número |
| `?` | mostrar ou esconder o help de teclas |
| `q` `Esc` `Ctrl+C` | sair |

Cada screen pode declarar teclas próprias em `keys` e tratá-las em `onKey`.
Elas aparecem na barra inferior antes das teclas globais.

## Tema

Duas paletas em `shared/core/tui/theme.ts`: `night` (padrão) e `day`. A escolha vem
de `tui.theme`. As cores têm nomes de papel (`accent`, `textDim`, `border`),
não de matiz, para que uma troca de paleta não exija tocar nas screens.

Princípios do visual, no estilo modern unix:

- bordas arredondadas com título na própria borda;
- rótulos apagados à esquerda e valores em cor plena à direita;
- uma cor de accent para o que está ativo, uma secundária para links e
  origens externas; verde, âmbar e vermelho só para estado;
- barra de status com teclas em blocos invertidos;
- duas colunas de respiro entre painéis vizinhos e uma linha entre faixas; padding interno de uma célula e uma linha vazia antes do conteúdo;
- texto que quebra continua alinhado ao texto, não ao símbolo da linha;
- nada pisca, nada rola sozinho.

## Como criar uma screen

1. Copie `template/screen/example.ts` para `shared/core/tui/screens/<id>.ts`.
2. Preencha `id`, `title`, `description` e `mount(ctx)`. Use os componentes
   de `shared/core/tui/components.ts` (`panel`, `keyValueTable`, `list`, `heading`,
   `dim`) e as cores de `ctx.theme`.
3. Se a screen precisar de atualização periódica, inicie o timer em
   `onEnter` e limpe em `onLeave`.
4. Registre em `shared/core/tui/screens/index.ts`. A ordem da lista é a ordem das abas.
   O stub exporta a factory `createExampleScreen()`: registre o `Screen` que
   ela devolve, para que seleção e renderables fiquem por instância.
5. Se o `id` for uma opção válida de aba inicial, acrescente-o em
   `tui.initialTab` (`shared/core/config/settings.ts`) e em `--tab`
   (`shared/core/cli/commands/tui.ts`).

A TUI roda sobre o OpenTUI (`@opentui/core`). Use `BoxRenderable`,
`TextRenderable`, `TabSelectRenderable`, `ScrollBoxRenderable` e os demais
renderables do pacote. Sempre devolva o terminal com `renderer.destroy()`;
`mountTui()` já cuida disso para `q`, `Esc` e `Ctrl+C`.

## Testar sem terminal

`tests/tui.test.ts` monta a interface com `createTestRenderer` de
`@opentui/core/testing`, pressiona teclas com `mockInput.pressKey` e confere
o frame com `captureCharFrame`. `mountTui` aceita qualquer renderer;
`startTui` cria o renderer real.

## Lista com seleção

`listPanel(renderer, theme, { title, items, onSelect })` monta uma lista
com `ScrollBoxRenderable`. O item atual recebe `theme.surfaceHigh` no fundo
e `theme.accent` no texto. A rolagem acompanha o item selecionado.

| Retorno | Uso |
| --- | --- |
| `box` | Adicione ao layout; `handleKeyPress` trata up/down, j/k e Enter. |
| `move(delta)` | Move o destaque sem chamar `onSelect`; respeita os limites. |
| `selected()` | Retorna o índice atual, ou -1 para lista vazia. |
| `select(index)` | Destaca o índice e chama `onSelect(index)`. |

Na screen, trate up/k com `move(-1)`, down/j com `move(1)` e Enter com
`select(selected())` dentro de `onKey`. A tecla `r` pode voltar ao primeiro
item com `move(-selected())`. Declare essas teclas em `keys` para aparecerem
na barra inferior. O exemplo completo está em `template/screen/example.ts`.
Não encaminhe a mesma tecla pelo foco de `box` e por `onKey` simultaneamente.
