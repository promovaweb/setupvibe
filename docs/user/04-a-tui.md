# A TUI

A interface de terminal existe para responder a três perguntas sem digitar
comando: em que estado a máquina está, o que falta, e o que acontece enquanto
uma instalação roda. Ela não substitui o CLI. Cada ação da TUI executa o mesmo
comando em outro processo, e o resultado aparece no mesmo `~/.setupvibe/` que o
CLI lê.

Abra com `setupvibe` sem argumentos, num terminal interativo:

```bash
setupvibe
```

Fora de um terminal, o binário imprime a ajuda e sai com 2. O comando explícito
`setupvibe tui` sem TTY sai com 8, `NO_TTY`.

## Início

A TUI não tem abas. Ela abre no **Início**, um painel com sete cartões, um por
módulo. Acima dos cartões fica o próximo passo recomendado: migrar uma máquina
do SetupVibe 1, concluir o `init`, corrigir item com falha, atualizar versões ou
instalar o que falta. Um clique no passo abre o módulo onde ele se resolve.

| Cartão | O que resume |
| --- | --- |
| Inventário | barra de progresso, itens por status e uma barra por categoria |
| Usuário | usuário, pendências da checklist e estado do sudo |
| Doctor | problemas, avisos, estado do `init` e os primeiros achados |
| Logs | última execução, eventos com falha e as execuções anteriores |
| Tailscale | estado, IP, tailnet e máquinas online, a cada 15 segundos |
| Máquina | CPU, RAM, disco, carga, rede e histórico de CPU ao vivo |
| Sobre | versão, edição, sistema detectado e aviso de versão nova |

`u` relê o estado depois de uma mudança feita no CLI, e `1` a `7` abrem o módulo
do número correspondente, de qualquer lugar.

## Cabeçalho, rodapé e idioma

A primeira linha é uma faixa com o selo, a versão, o módulo atual, o sistema
detectado, o seletor `PT · EN` e um relógio. O rodapé mostra as teclas do módulo
aberto e, depois de um separador, as globais. `?` abre a ajuda com as duas
listas, e `q` sai. Quando a largura não comporta todas as teclas, as do fim
saem; `?` e `q` ficam sempre.

`L` alterna o idioma e grava em `tui.language`. `T` alterna entre o tema escuro
(`night`) e o claro (`day`), grava em `tui.theme` e pode ser acionado pelo ícone
de lua ou sol no cabeçalho. Com `SETUPVIBE_LANG` definida, o idioma fica fixo nas
próximas execuções.

## Teclas

| Tecla | Ação |
| --- | --- |
| `1` a `7` | abre o módulo do número |
| `←` `→` `↑` `↓` | move entre os cartões do Início |
| `Enter` ou `espaço` | abre o cartão selecionado |
| `Esc` ou `Backspace` | volta ao Início; no Início, sai |
| `L` | troca o idioma |
| `T` | troca o tema |
| `u` | relê o estado |
| `?` | mostra ou esconde a ajuda |
| `q` ou `Ctrl+C` | sai |

Dentro de um módulo, `Esc` e o botão **← Voltar** retornam ao Início. O rodapé é
clicável: cada tecla exibida também funciona como botão.

## Inventário

O módulo abre com as categorias à esquerda e as ferramentas à direita. Cada
categoria mostra `instalados/total` e uma barra; cada ferramenta mostra nome,
status e versão, com a borda colorida quando o estado é instalado,
desatualizado ou falhou.

| Tecla | Ação |
| --- | --- |
| `c` e `f` | levam o foco às categorias e às ferramentas |
| `Tab` | alterna o foco entre os dois painéis |
| `j` `k` ou `↓` `↑` | move no painel com foco; nas categorias, troca de categoria |
| `h` `l`, `[` `]`, `←` `→` | troca de categoria |
| `g` e `End` | vão ao primeiro e ao último item |
| `espaço` | marca ou desmarca o item |
| `a` | marca todas as ferramentas que ainda podem ser instaladas; de novo, desmarca |
| `s` | alterna o filtro: todos, para instalar, instalados, com problema |
| `i` | instala os itens marcados, ou o item atual quando nada está marcado |
| `r` | remove os itens marcados, ou o item atual |

O filtro aparece no título do painel, com a contagem de itens visíveis sobre o
total. `s` percorre os quatro estados e volta ao primeiro.

Instalar e remover usam duas etapas. A primeira monta o plano com `--dry-run` e
mostra os passos na tela. A segunda executa; qualquer outra tecla cancela. Essa
divisão evita que um clique instale algo que você não leu.

Durante a execução, o painel de detalhes vira o progresso ao vivo: barra, passos
concluídos sobre o total, segundos decorridos, os últimos passos com `✓`, `✗` ou
`↷` e a mensagem de cada falha. O conteúdo vem do log da execução, não de uma
contagem paralela. No fim, a borda fica verde ou vermelha e qualquer tecla
volta aos detalhes.

## Doctor e Logs

O módulo Doctor agrupa os mesmos achados do `setupvibe doctor`: problemas,
avisos e itens aprovados, cada um com o comando que resolve. `f` aplica as
correções seguras (pastas, modo da pasta de estado e bloco do shell) e deixa as
demais para você decidir; um `[f]` ao lado do comando indica que a correção é
segura. `u` refaz a checagem.

O módulo Logs lista as execuções de `~/.setupvibe/logs`, da mais nova para a mais
antiga, com os eventos de cada uma: tempo, status, item e ação. A mensagem de
erro aparece abaixo de cada falha. Sem execução, o painel explica o que vai
aparecer ali.

## Tailscale e Máquina

O módulo Tailscale lê o cliente local, sem chamar a API. Mostra esta máquina,
serviços publicados com `serve` e Funnel, avisos de saúde, teste de rede com `n`
(UDP, IPv4, IPv6, UPnP, NAT-PMP, PCP, NAT difícil, portal cativo e latência por
relay) e as máquinas da tailnet com sistema, IP, conexão direta ou por relay e
último contato. `u` recarrega.

O módulo Máquina atualiza a cada segundo: sistema, kernel, virtualização, tempo
ligado, usuário e shell; CPU com histórico de 60 segundos, carga e uma barra por
núcleo; RAM e swap; rede por interface; discos com uso, leitura e escrita; e os
processos que mais consomem CPU. `u` força uma leitura nova.

## Tema, ícones e mouse

Duas paletas vivem em `shared/core/tui/theme.ts`: `night`, o padrão, e `day`. As
cores têm nome de papel (`accent`, `textDim`, `border`), então a troca de paleta
não muda as telas. A escolha fica em `tui.theme`.

Os ícones vêm da Nerd Font, instalada pelo SetupVibe. Num terminal sem a fonte,
desligue com `setupvibe config set tui.icons false` ou `SETUPVIBE_ICONS=0`: a
interface passa a usar símbolos que toda fonte tem.

Com `tui.mouse` ligado, que é o padrão, clique abre cartão, módulo, categoria,
item, marcador, máquina da tailnet, execução e botão; a roda rola as listas.
Para selecionar texto no terminal, segure `Shift` ao arrastar. O teclado
continua completo.

## Abrir num módulo e em terminal estreito

A TUI abre no Início, ou no módulo de `tui.initialTab`. A option `--tab` tem
prioridade:

```bash
setupvibe --tab inventory
setupvibe config set tui.initialTab logs
```

Os valores são `overview`, `inventory`, `user`, `doctor`, `logs`, `tailscale`,
`machine` e `about`. O nome `tab` ficou do modelo antigo por compatibilidade:
`tui.initialTab` e `--tab` continuam com esse nome, mas a interface não tem
abas.

Em terminal com menos de 110 colunas ou 32 linhas, o Inventário estreita as
colunas, encurta o painel de detalhes e reduz os espaços. As listas rolam
quando não cabem.

## Próximo passo

A interface mostra o estado, mas quem grava configuração é o CLI. O capítulo
[Shell e terminal](05-shell-e-terminal.md) mostra os blocos que o SetupVibe
escreve no `.zshrc`, no Starship e no tmux, e onde ficam as suas linhas.
