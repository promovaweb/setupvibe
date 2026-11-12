# TUI

A interface de terminal abre com `{{bin}}` sem argumentos ou com
`{{bin}} tui`. Ela exige stdin e stdout em um TTY; fora disso o processo
encerra com exit code 8.

## Abas

| Aba | Conteúdo |
| --- | --- |
| Overview | Environment (binary, runtime, platform, terminal, data directory), estado de settings.json e do cofre, settings em vigor e next steps. |
| About | Binary, project, license, credits e standards seguidos. |

A aba inicial vem de `tui.initialTab` em settings.json ou de `--tab`.

## Teclas

| Tecla | Ação |
| --- | --- |
| `←` `→` `[` `]` | aba anterior ou seguinte |
| `Tab` | próxima aba |
| `1` … `9` | ir para a aba de mesmo número |
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
- sem espaços vazios entre painéis vizinhos; padding interno de uma célula;
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
