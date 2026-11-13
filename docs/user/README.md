# SetupVibe

Uma máquina de desenvolvimento se degrada por acúmulo. Cada pessoa instala o
runtime de que precisa na versão do dia, acrescenta um CLI para resolver um
problema da semana e ajusta o `.zshrc` até o prompt ficar aceitável. Seis meses
depois, duas máquinas da mesma equipe rodam versões diferentes de Node e
ninguém sabe qual linha do shell veio do instalador e qual veio de um teste.

O SetupVibe 2 trata esse preparo como parte do projeto. Um binário único lê uma
lista de itens com versões fixadas, instala o que você marcar, registra o que
fez em `~/.setupvibe/` e confere depois se a máquina continua com o que foi
combinado. A mesma abordagem atende um notebook e um servidor, e a lista que o
binário segue vem embutida nele, sem serviço externo.

## Um binário, três modos

O mesmo executável atende três públicos, sem três bases de código.

| Modo | Como entrar | Para quem |
| --- | --- | --- |
| TUI | `setupvibe` sem argumentos em um terminal interativo | pessoas que querem ver o estado e agir pelo teclado |
| CLI | `setupvibe <command> [options]`, com saída em texto ou `--json` | pessoas, scripts e agentes |
| MCP | `setupvibe mcp`, servidor Model Context Protocol via stdio | agentes de IA que operam a máquina |

Os três leem a mesma identidade, a mesma configuração, o mesmo cofre de
credenciais e a mesma tabela de exit codes. Um comando novo entra no mesmo
registro e chega ao `--help`, ao `--json`, à descrição OpenCLI e à referência
gerada, sem uma segunda implementação.

## Duas edições, dois binários

| Binário | Edição | Sistemas |
| --- | --- | --- |
| `setupvibe` | desktop: ambiente de desenvolvimento, local ou remoto | macOS, Ubuntu, Debian, Mint, Zorin, Arch, Omarchy, Windows e WSL |
| `setupvibe-server` | server: infraestrutura com Docker Swarm | Ubuntu e Debian |

As duas edições usam a mesma pasta `~/.setupvibe/` e o mesmo prefixo
`SETUPVIBE_` nas variáveis. Elas são exclusivas: o `init` recusa uma máquina
que já tem a outra edição preparada, porque só um binário fica instalado por
máquina.

## Versões fixadas, não versões do dia

Cada item da lista carrega a versão, ou a política de versão, que o SetupVibe
instala. `setupvibe check` compara o que está na máquina com essa versão e
devolve o exit code correspondente. `setupvibe update` troca só os itens cuja
versão fixada mudou desde o binário que você tem. Ferramentas fora da lista
entram pelo mise com `install --external`, também com versão fixada.

## Como ler este guia

O guia tem três partes. Se é a sua primeira vez com o SetupVibe, leia a Parte 1
na ordem e siga a Parte 2 como consulta operacional. A Parte 3 é referência,
para quando você precisa da lista exata de uma opção, de um arquivo de estado
ou de um exit code.

### Parte 1. Primeiro uso

O produto, o binário no lugar, o preparo da máquina, a instalação sem perguntas
e o controle do que entra e sai.

| Capítulo | Pergunta que responde |
| --- | --- |
| [Visão geral](00-visao-geral.md) | De que peças o SetupVibe é feito e o que cada uma guarda? |
| [Instalação e primeiro uso](01-instalacao-e-primeiro-uso.md) | Como instalar o binário, preparar a máquina e instalar os primeiros itens? |
| [Instalação automática](02-instalacao-automatica.md) | Como preparar uma máquina sem perguntas, com perfil, respostas e plano? |
| [Itens e versões fixadas](03-itens-e-versoes.md) | O que a lista controla e como instalar, remover, atualizar e conferir? |

### Parte 2. Operação

O uso que continua depois da instalação: interface, shell, manutenção,
servidor, agentes de IA, Windows, migração e falhas.

| Capítulo | O que você aprende |
| --- | --- |
| [A TUI](04-a-tui.md) | os sete módulos, as teclas, o mouse, o idioma e o tema |
| [Shell e terminal](05-shell-e-terminal.md) | o que muda no `.zshrc`, no Starship e no tmux, e onde ficam as suas linhas |
| [Manutenção](06-manutencao.md) | `doctor`, `upgrade`, `report`, `config export` e os logs |
| [Servidor e segurança](07-servidor-e-seguranca.md) | `setupvibe-server`, usuário de trabalho, UFW, fail2ban e Swarm |
| [Agentes de IA e MCP](08-agentes-e-mcp.md) | como um agente lê o estado e executa o SetupVibe por MCP |
| [Windows e WSL](09-windows-e-wsl.md) | o installer do Windows, o WSL 2 e o que o binário preserva |
| [Vindo do SetupVibe 1](10-vindo-do-setupvibe-1.md) | o que o `migrate` converte, o que ele pergunta e o que conferir |
| [Problemas comuns e glossário](11-problemas-e-glossario.md) | sintoma, causa, comando e exit code, termo por termo |

### Parte 3. Referência

Os apêndices são gerados na compilação a partir da documentação embutida no
binário, que outros agentes mantêm. No repositório, a coluna da direita leva à
fonte.

| Apêndice | Conteúdo | Fonte |
| --- | --- | --- |
| CLI | convenções, opções globais, saída em texto e JSON, referência de cada command | [desktop/docs/cli.md](../../desktop/docs/cli.md) |
| Configuração e estado | `settings.json`, arquivos de estado, cofre, master key e variáveis | [desktop/docs/configuration.md](../../desktop/docs/configuration.md) |
| Códigos de saída | a tabela completa e como tratar cada classe de falha | [desktop/docs/exit-codes.md](../../desktop/docs/exit-codes.md) |
| MCP | tools, resources, prompts e configuração nos clientes | [desktop/docs/mcp.md](../../desktop/docs/mcp.md) |

## A máquina de exemplo

Os comandos do guia vêm de um host Debian 13 x64, com 20 GB de RAM e 74 GB
livres, que já tinha passado pelo SetupVibe 1. Isso permite mostrar o mesmo
comando em dois estados: com o item ausente e com o item já instalado na
máquina por outro gerenciador.

Os blocos `text` foram copiados de execuções reais do binário com dois ajustes:
a pasta pessoal aparece como `~` e as listas longas aparecem cortadas com `…`.
Números de memória, de disco e de versão mudam de máquina para máquina, e cada
bloco diz de qual máquina veio.

Commands, opções, keys e campos do `--json` ficam em inglês, como o binário
escreve. O texto em volta é em português do Brasil.

## O que este guia não ensina

O guia não substitui a documentação do mise, do Docker Swarm, do Model Context
Protocol nem do Git. Ele mostra o que o SetupVibe faz com essas ferramentas e
aponta a fonte oficial quando o assunto fica fora do escopo do produto. Também
não ensina a especificação interna: o código de `shared/` e o documento da
especificação ficam no repositório, para quem mantém o SetupVibe.

## Documentação relacionada

- `setupvibe --skill` imprime a documentação embutida no binário, escrita para
  agentes lerem sem o repositório. `setupvibe docs` aceita os mesmos tópicos e
  mais `inventory`, gerado da lista embutida.
- [Repositório](https://github.com/promovaweb/setupvibe): código, releases,
  changelog e os installers.
- [Site](https://setupvibe.dev): apresentação, edições e downloads.

## Próximo passo

A [visão geral](00-visao-geral.md) mostra as peças e o vocabulário que o resto
do guia usa. O capítulo seguinte instala o binário e prepara a primeira
máquina.
