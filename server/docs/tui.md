# TUI

A interface de terminal abre com `{{bin}}` sem argumentos ou com
`{{bin}} tui`. Ela exige stdin e stdout em um TTY; fora disso o processo
encerra com exit code 8.

## Início e módulos

A TUI não tem abas. Ela abre no **Início**, um bento grid com um cartão por
módulo. Cada cartão resume o módulo e mostra o número que o abre:

| Cartão | Resumo no Início | O módulo |
| --- | --- | --- |
| 1 Inventário | barra de progresso, itens por status e uma barra por categoria | categorias com nome, contagem `instalados/total` e barra de progresso; ferramentas em blocos de duas linhas (marcador, status e nome em negrito; embaixo, descrição e versões fixada e instalada) com legenda; detalhes ou o plano; botões **Instalar** e **Remover**. `c` seleciona o painel de categorias, `f` o de ferramentas e `Tab` alterna; o painel ativo tem a borda de destaque e a seleção dele vira uma faixa cheia. `j`/`k` movem no painel ativo, `h`/`l` trocam a categoria, `g`/`End` vão ao início e ao fim, `espaço` marca, `i` instala e `r` remove. O primeiro toque (ou clique) mostra o plano e o segundo executa; qualquer outra tecla cancela. As ações rodam o CLI em outro processo. |
| 2 Usuário | usuário, pendências e sudo | checklist agrupada em Permissões, Pastas e SetupVibe, com o aviso dos aliases `cco`, `cxo` e `oco` |
| 3 Doctor | problemas, avisos, init e os principais achados | os achados do `doctor` agrupados, cada um com o comando que resolve; **Aplicar correções seguras** ou `f`; `u` atualiza |
| 4 Logs | última execução e as anteriores | execuções em `~/.setupvibe/logs` e os eventos de cada uma, com o erro abaixo de cada falha |
| 5 Tailscale | estado, IP, tailnet e as máquinas online, atualizados a cada 15 segundos | esta máquina (estado, nome, DNS, IPs, tailnet, MagicDNS, versão, expiração da chave, exit node, tags, rotas, recursos); serviços publicados com serve e Funnel; avisos de saúde; teste de rede com `n` (UDP, IPv4, IPv6, UPnP, NAT-PMP, PCP, NAT difícil, portal cativo e latência por relay); máquinas da tailnet com sistema, IP, conexão direta ou por relay e último contato; detalhes da máquina escolhida (IPs, usuário, endereço direto, tráfego, expiração). Tudo vem do cliente local, sem a API da Tailscale. |
| 6 Máquina | CPU, RAM e disco em barras, carga, rede por segundo e histórico de CPU, atualizados a cada 2 segundos | ao vivo, a cada segundo: sistema (host, distribuição, kernel, virtualização, variação, tempo ligado, usuário, shell, fuso, processos); CPU total, histórico dos últimos 60 segundos, carga, temperatura quando há sensor e uma barra por núcleo; RAM e swap com histórico; rede por interface (recebido e enviado por segundo e totais) com os endereços; discos com uso e leitura e escrita por segundo; os processos que mais usam CPU (PID, nome, CPU, memória, RSS) |
| 7 Sobre | versão, edição, sistema e variação | binário, projeto, licença, créditos e padrões |

Acima dos cartões, o **próximo passo** recomendado; um clique nele abre o
módulo onde ele se resolve.

Dentro de um módulo, o topo mostra o botão **← Voltar**, o nome do módulo e o
que ele mostra; o cabeçalho traz `SetupVibe › módulo`. O botão, o nome
`SetupVibe`, `Esc` ou `Backspace` voltam ao Início.

**Idioma.** A interface fala português por padrão. O seletor `PT · EN` no
cabeçalho (clique) ou a tecla `L` troca para inglês e volta; a escolha fica
em `tui.language` no settings.json e o módulo aberto continua aberto. Quando
`SETUPVIBE_LANG` está definida, ela fixa o idioma.

**Mouse.** Com `tui.mouse` ligado (padrão), clique num cartão para abrir o
módulo, numa categoria, num item, no marcador `◻`, numa máquina da tailnet ou
numa execução. Cada tecla da barra inferior também é um botão, a roda rola as
listas e um clique fora fecha a ajuda. Para selecionar texto, segure `Shift`
ao arrastar. O teclado continua completo.

A TUI abre no Início, ou no módulo de `tui.initialTab` no settings.json ou de
`--tab` (`overview` é o Início; `inventory`, `user`, `doctor`, `logs`,
`tailscale`, `machine` ou `about`). Num terminal com menos de 110 colunas ou 32
linhas, o Inventário estreita as colunas e reduz os espaços; as listas rolam
quando não cabem.

## Teclas

| Tecla | Ação |
| --- | --- |
| `←` `↑` `↓` `→`, `h` `j` `k` `l` | no Início, move entre os cartões |
| `Enter`, `espaço` | abre o cartão selecionado |
| `1` … `7` | abre o módulo de mesmo número, de qualquer lugar |
| `Esc`, `Backspace` | volta ao Início; no Início, `Esc` sai |
| `L` | troca o idioma (PT · EN) |
| `?` | mostra ou esconde a ajuda de teclas |
| `q`, `Ctrl+C` | sai |

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
