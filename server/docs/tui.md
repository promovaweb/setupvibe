# TUI

A interface de terminal abre com `{{bin}}` sem argumentos ou com
`{{bin}} tui`. Ela exige stdin e stdout em um TTY; fora disso o processo
encerra com exit code 8.

## Início e módulos

A TUI não tem abas. Ela abre no **Início**, um bento grid com um cartão por
módulo. Os números seguem a ordem dos módulos, não a posição no grid.

| Número e módulo | Onde fica no grid | O que o cartão resume |
| --- | --- | --- |
| 1 Inventário | primeira linha, à esquerda | barra de progresso, itens por status e uma barra por categoria |
| 2 Usuário | segunda linha | usuário, pendências da checklist e o estado do sudo |
| 3 Doctor | primeira linha, ao centro | problemas, avisos, estado do `init` e os três primeiros achados, os mesmos do módulo e traduzidos |
| 4 Logs | segunda linha | última execução, eventos com falha, uma faixa com as últimas 16 execuções e a lista das anteriores |
| 5 Tailscale | segunda linha | estado, IP, tailnet e as máquinas online, atualizados a cada 15 segundos |
| 6 Máquina | primeira linha, à direita | CPU, RAM, disco raiz, carga, rede por segundo e histórico de CPU, atualizados a cada 2 segundos |
| 7 Sobre | segunda linha, à direita | versão, edição, estado da atualização, itens desatualizados, sistema e idioma |

Acima dos cartões, o **próximo passo** recomendado: migrar o SetupVibe 1,
concluir o `init`, corrigir itens com falha, atualizar versões ou instalar o
que falta. Um clique nele abre o módulo onde o passo se resolve.

**Cabeçalho.** A primeira linha é uma faixa com o selo `▲ SetupVibe`, a versão,
onde você está (`Início` ou `› módulo`, com o ícone dele), o sistema detectado,
o seletor `PT · EN`, o botão de tema (lua ou sol) e um relógio atualizado a
cada 15 segundos.

Dentro de um módulo, o topo mostra o botão **← Voltar**, o ícone, o nome do
módulo e o que ele mostra. O botão, o selo `SetupVibe`, `Esc` ou `Backspace`
voltam ao Início.

**Rodapé.** A barra inferior mostra primeiro as teclas do módulo e, depois de
um `│`, as globais. Quando a largura não comporta todas, as do fim saem, mas
`?` (ajuda, que lista as teclas do módulo aberto primeiro e depois as globais) e
`q` ficam sempre. Cada tecla da barra também é um botão.

**Ícones.** Módulos, categorias, painéis e estados têm ícones da Nerd Font,
instalada pelo SetupVibe. Num terminal sem essa fonte, desligue com
`config set tui.icons false` ou `SETUPVIBE_ICONS=0`: a TUI passa a usar
símbolos que toda fonte tem.

**Idioma.** A interface fala português por padrão. O seletor `PT · EN` no
cabeçalho (clique) ou a tecla `L` troca para inglês e volta; a escolha fica em
`tui.language` no `settings.json` e o módulo aberto continua aberto. Quando
`SETUPVIBE_LANG` está definida, ela fixa o idioma nas próximas execuções; a
troca vale para a sessão atual e a escolha continua gravada.

**Mouse.** Com `tui.mouse` ligado (padrão), clique num cartão para abrir o
módulo, numa categoria, num item, no marcador `◻`, numa máquina da tailnet, no
nome de uma execução ou num botão. A roda rola as listas e um clique fora fecha
a ajuda. Para selecionar texto, segure `Shift` ao arrastar. O teclado continua
completo.

A TUI abre no Início, ou no módulo de `tui.initialTab` no `settings.json` ou de
`--tab` (`overview` é o Início; `inventory`, `user`, `doctor`, `logs`,
`tailscale`, `machine` ou `about`). Num terminal com menos de 110 colunas ou 32
linhas, o Inventário estreita as colunas, encurta o painel de detalhes e reduz
os espaços; as listas rolam quando não cabem.

## Teclas globais

| Tecla | Ação |
| --- | --- |
| `←` `↑` `↓` `→`, `h` `j` `k` `l` | no Início, move entre os cartões |
| `Enter`, `espaço` | abre o cartão selecionado |
| `1` a `7` | abre o módulo de mesmo número, de qualquer lugar |
| `Esc`, `Backspace` | volta ao Início; no Início, `Esc` sai |
| `L` | troca o idioma (PT · EN) |
| `T` | troca entre as paletas `night` e `day` |
| `?` | mostra ou esconde a ajuda de teclas |
| `q`, `Ctrl+C` | sai |

## Teclas por módulo

| Módulo | Tecla | Ação |
| --- | --- | --- |
| Início | `u` | relê o estado local e atualiza os cartões |
| Inventário | `c` | leva o foco ao painel de categorias |
| Inventário | `f` | leva o foco ao painel de ferramentas |
| Inventário | `Tab` | alterna o foco entre categorias e ferramentas |
| Inventário | `j` `k`, `↓` `↑` | move no painel com foco; no painel de categorias, troca de categoria |
| Inventário | `h` `l`, `[` `]`, `←` `→` | troca de categoria |
| Inventário | `g`, `Home` | vai ao primeiro item |
| Inventário | `End` | vai ao último item |
| Inventário | `espaço` | marca ou desmarca o item |
| Inventário | `a` | marca todos os itens visíveis que podem ser instalados ou corrigidos; de novo, desmarca |
| Inventário | `s` | alterna o filtro entre todos, para instalar, instalados e problemas |
| Inventário | `i` | instala os itens marcados, ou o item atual quando nada está marcado |
| Inventário | `r` | remove os itens marcados, ou o item atual quando nada está marcado |
| Usuário | nenhuma | módulo de leitura; as teclas globais bastam |
| Doctor | `f` | aplica as correções seguras |
| Doctor | `u` | refaz a checagem |
| Logs | `j` `k`, `↓` `↑` | troca a execução mostrada à direita |
| Tailscale | `j` `k`, `↓` `↑` | escolhe a máquina da tailnet |
| Tailscale | `n` | roda o teste de rede (`netcheck`) |
| Tailscale | `u` | recarrega o estado do cliente local |
| Máquina | `u` | recarrega a leitura do sistema |
| Sobre | nenhuma | módulo de leitura |

No Inventário, a primeira tecla `i` ou `r` monta o plano com `--dry-run` e
mostra os passos; a segunda executa. Qualquer outra tecla cancela o plano. As
ações rodam o CLI em outro processo, então a TUI e o CLI seguem um único
caminho de código.

## Dentro de cada módulo

**Inventário.** Categorias com nome, contagem `instalados/total` e barra fina à
esquerda; ferramentas em blocos de duas linhas à direita, com faixas alternadas:
marcador, nome em negrito e status à direita; embaixo, a descrição e a versão
fixada (ou instalada → fixada). Instalado, desatualizado e falhou pintam a
borda esquerda do bloco, e só desatualizado e falhou aparecem em selo cheio.
Acima da lista ficam as contagens da categoria e quantos itens estão marcados.
O filtro `s` reduz a lista a `todos`, `para instalar`, `instalados` ou
`com problema`, e o título mostra `visíveis/total` quando o filtro não é `todos`.
O painel com foco tem a borda de destaque e a seleção dele ganha fundo tingido;
`c`, `f` e `Tab` trocam o foco. O painel de detalhes mostra nome, id, descrição,
versão fixada, versão instalada, método, status e o site do item, ou o caminho
da outra cópia quando a ferramenta vem de outro gerenciador. Os botões
**Instalar** e **Remover** ficam no painel de detalhes. Durante `i` ou `r`, o
mesmo painel vira o progresso da execução: barra com passos concluídos e total,
segundos decorridos, os últimos passos com `✓` (ok), `✗` (falha) e `↷` (pulado),
e a mensagem de erro de cada falha, lida do log da execução. Ao terminar, a
borda fica verde ou vermelha; qualquer tecla volta aos detalhes.

**Usuário.** Dois painéis: quem é o usuário (usuário, edição, sistema, variação
e a pasta de dados) e a checklist agrupada em Permissões, Pastas e SetupVibe,
com o estado do grupo `sudo` ou `wheel`, do sudo sem senha, do modo de
`~/.setupvibe`, de `~/.ssh` e de `authorized_keys`, do `init` e dos aliases
`cco`, `cxo` e `oco`.

**Doctor.** Os mesmos achados do `doctor`, agrupados em problemas, avisos e
itens aprovados, com o comando que resolve cada um. O texto dos achados e das
correções segue o idioma da TUI. `f` aplica as correções
seguras (pastas e bloco do shell) e deixa as demais para você decidir; um `[f]`
ao lado do comando indica que a correção é segura.

**Logs.** As execuções em `~/.setupvibe/logs`, da mais nova para a mais antiga,
e os eventos de cada uma, com tempo, status, item e ação. A mensagem de erro
aparece abaixo de cada falha. Sem execução, o painel de eventos explica que
cada execução que muda a máquina grava um log com um evento por passo e pede
para escolher uma execução à esquerda.

**Tailscale.** Esta máquina (estado traduzido, nome, DNS, IPs, tailnet, MagicDNS, versão,
expiração da chave, exit node, tags, rotas e recursos); serviços publicados com
serve e Funnel; avisos de saúde; teste de rede com `n` (UDP, IPv4, IPv6, UPnP,
NAT-PMP, PCP, NAT difícil, portal cativo e latência por relay); máquinas da
tailnet com sistema, IP, conexão direta ou por relay e último contato; detalhes
da máquina escolhida (IPs, usuário, endereço direto, tráfego e expiração).
Tudo vem do cliente local, sem a API da Tailscale.

**Máquina.** Ao vivo, a cada segundo: sistema (host, distribuição, kernel,
virtualização, variação, tempo ligado, usuário, shell, fuso e processos); CPU
total, histórico dos últimos 60 segundos, carga, temperatura quando há sensor e
uma barra por núcleo; RAM e swap com histórico; rede por interface (recebido e
enviado por segundo, totais e endereços); discos com uso, espaço livre e leitura
e escrita por segundo; os processos que mais usam CPU (PID, nome, CPU, memória e
RSS). O cartão do Início atualiza a cada 2 segundos; o módulo, a cada segundo.

**Sobre.** Binário, projeto, licença, créditos em duas linhas (nome e link; a
função embaixo) e os padrões que o binário segue (OpenCLI, MCP, exit codes
fixos, formato dos arquivos de dados). A descrição e os padrões seguem o idioma
da TUI.

## Tema

Duas paletas em `shared/core/tui/theme.ts`: `night` (padrão) e `day`. A tecla
`T` ou o botão do cabeçalho trocam e gravam a escolha em `tui.theme`. As cores
têm nomes de papel (`accent`, `textDim`, `border`),
não de matiz, para que uma troca de paleta não exija editar as screens.

Princípios do visual, no estilo modern unix:

- bordas arredondadas com título na própria borda;
- rótulos apagados à esquerda e valores em cor plena à direita;
- uma cor de accent para o que está ativo, uma secundária para links e
  origens externas; verde, âmbar e vermelho só para estado;
- barra de status com teclas em blocos invertidos;
- duas colunas de respiro entre painéis vizinhos e uma linha entre faixas;
  padding interno de uma célula e uma linha vazia antes do conteúdo;
- texto que quebra continua alinhado ao texto, não ao símbolo da linha;
- nada pisca, nada rola sozinho.

## Como criar um módulo

1. Copie `shared/tests/template/screen/example.ts` para um arquivo novo em
   `shared/tui/` ou em `shared/core/tui/screens/`.
2. Preencha `id`, `title`, `description` e `mount(ctx)`. Use os componentes de
   `shared/core/tui/components.ts` (`panel`, `keyValueTable`, `list`, `heading`,
   `dim`, `spacer`) e as cores de `ctx.theme`.
3. Declare as teclas próprias em `keys` e trate-as em `onKey`. Elas aparecem na
   barra inferior antes das globais. Devolva `true` só para a tecla tratada.
4. Se o módulo precisar de atualização periódica, inicie o timer em `onEnter` e
   limpe em `onLeave`. O `onLeave` também roda quando a TUI fecha.
5. Registre o módulo em `shared/core/tui/screens/index.ts`. A ordem da lista
   define o número de cada módulo.
6. Acrescente o módulo ao `BENTO` em `shared/tui/home.ts`, senão ele ganha
   número e tecla, mas não ganha cartão no Início.
7. Acrescente os textos em `shared/tui/i18n.ts`, incluindo `sub.<id>` para o
   subtítulo do módulo nos dois idiomas.
8. Se o `id` for uma opção válida de módulo inicial, acrescente-o em
   `tui.initialTab` (`shared/core/config/settings.ts`) e em `--tab`
   (`shared/core/cli/commands/tui.ts`).

A TUI roda sobre o OpenTUI (`@opentui/core`). Use `BoxRenderable`,
`TextRenderable` e `ScrollBoxRenderable`, e os demais renderables do pacote.
Sempre devolva o terminal com `renderer.destroy()`; `mountTui()` já cuida disso
para `q`, `Esc` e `Ctrl+C`.

A interface não tem abas: `tui.initialTab` e `--tab` mantêm o nome `tab`, e os
textos de ajuda chamam cada tela de módulo. `Tab` continua alternando o foco
entre categorias e ferramentas no Inventário.

## Testar sem terminal

`shared/tests/tui.test.ts` monta a interface com `createTestRenderer` de
`@opentui/core/testing`, pressiona teclas com `mockInput.pressKey` e confere
o frame com `captureCharFrame`. `mountTui` aceita qualquer renderer;
`startTui` cria o renderer real.

## Lista com seleção

`listPanel(renderer, theme, { title, items, onSelect })` monta uma lista
com `ScrollBoxRenderable`. O item atual recebe `theme.surfaceHigh` no fundo
e `theme.accent` no texto, e a rolagem acompanha o item selecionado.

| Retorno | Uso |
| --- | --- |
| `box` | adicione ao layout; `handleKeyPress` trata up/down, j/k e Enter |
| `move(delta)` | move o destaque sem chamar `onSelect`; respeita os limites |
| `selected()` | retorna o índice atual, ou -1 para lista vazia |
| `select(index)` | destaca o índice e chama `onSelect(index)` |

Na screen, trate up/k com `move(-1)`, down/j com `move(1)` e Enter com
`select(selected())` dentro de `onKey`. A tecla `r` pode voltar ao primeiro
item com `move(-selected())`. Declare essas teclas em `keys` para aparecerem
na barra inferior. O exemplo completo está em
`shared/tests/template/screen/example.ts`. Não encaminhe a mesma tecla pelo
foco de `box` e por `onKey` ao mesmo tempo.
