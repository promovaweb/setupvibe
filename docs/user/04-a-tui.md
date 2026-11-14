# A TUI

A interface de terminal mostra o estado da máquina e os itens que faltam, além
do progresso da instalação. Cada ação executa um comando do CLI em outro
processo e grava o resultado em `~/.setupvibe/`, a mesma pasta consultada pelo CLI.

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

Depois de uma mudança feita no CLI, use `u` para reler o estado. As teclas `1`
a `7` abrem o módulo correspondente a partir de qualquer tela.

## Cabeçalho, rodapé e idioma

O cabeçalho identifica o binário pela versão, pelo módulo atual e pelo sistema
detectado. A mesma faixa traz o selo do produto, o seletor `PT · EN` e o relógio.
No rodapé, as teclas do módulo aparecem separadas das globais. Use `?` para
consultar a lista completa ou `q` para sair. Esses dois controles permanecem
visíveis quando o terminal fica estreito e as últimas teclas deixam de caber.

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
categoria mostra `instalados/total` e uma barra. Cada ferramenta mostra nome,
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
mostra os passos na tela. A segunda confirma a execução ou cancela com outra tecla. Essa
divisão evita que um clique instale algo que você não leu.

Durante a execução, o painel de detalhes mostra uma barra com os passos
concluídos e o tempo decorrido em segundos. Os últimos passos aparecem com
`✓`, `✗` ou `↷`, acompanhados da mensagem de cada falha. Esses indicadores
usam o log da execução. Ao terminar, a borda fica verde ou vermelha e você pode
pressionar qualquer tecla para voltar aos detalhes.

## Doctor e Logs

O módulo Doctor agrupa os mesmos achados do `setupvibe doctor`: problemas,
avisos e itens aprovados, cada um com o comando que resolve. `f` aplica as
correções seguras (pastas, modo da pasta de estado e bloco do shell) e deixa as
demais para você decidir. Um `[f]` ao lado do comando indica que a correção é
segura. `u` refaz a checagem.

O módulo Logs lista as execuções de `~/.setupvibe/logs`, da mais nova para a mais
antiga, com os eventos de cada uma: tempo, status, item e ação. A mensagem de
erro aparece abaixo de cada falha. Sem execução, o painel explica o que vai
aparecer ali.

## Tailscale e Máquina

O módulo Tailscale consulta o cliente local para mostrar esta máquina, os
serviços publicados com `serve` e Funnel e os avisos de saúde. A lista da
tailnet identifica cada máquina pelo sistema e pelo IP, com o tipo de conexão
(direta ou por relay) e o último contato.

Use `n` para testar a rede: o diagnóstico inclui UDP, IPv4, IPv6, UPnP,
NAT-PMP, PCP, NAT difícil, portal cativo e latência por relay. Para recarregar
as informações do módulo, use `u`.

O módulo Máquina atualiza a cada segundo as informações do sistema e o uso
dos recursos. A seção de CPU exibe um histórico de 60 segundos, a carga e uma
barra por núcleo. As demais seções mostram memória e swap, rede por interface,
atividade dos discos e processos com maior uso de CPU. Use `u` para forçar uma
leitura nova.

## Tema, ícones e mouse

Duas paletas definem os temas: `night` (o padrão) e `day`. As
cores têm nome de papel (`accent`, `textDim`, `border`), então a troca de paleta
não muda as telas. A escolha fica em `tui.theme`.

Os ícones vêm da Nerd Font, instalada pelo SetupVibe. Num terminal sem a fonte,
desligue com `setupvibe config set tui.icons false` ou `SETUPVIBE_ICONS=0`: a
interface usa símbolos que dispensam a Nerd Font.

Com `tui.mouse` ligado, que é o padrão, você pode clicar nos controles para
navegar pelos módulos, selecionar itens e consultar detalhes de execuções ou
máquinas da tailnet. Use a roda para rolar as listas e segure `Shift` ao arrastar
para selecionar texto no terminal. Todas essas ações também têm acesso pelo teclado.

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

A interface mostra o estado e usa o CLI para gravar a configuração. O capítulo
[Shell e terminal](05-shell-e-terminal.md) mostra os blocos que o SetupVibe
escreve no shell e indica onde ficam as suas personalizações.
