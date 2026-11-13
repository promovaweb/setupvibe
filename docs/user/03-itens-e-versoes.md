# Itens e versões fixadas

O SetupVibe não instala o que estiver na versão mais nova do repositório de cada
fornecedor. Ele instala o que está na lista embutida no binário, com a versão
que aquela lista fixa, e confere depois. A lista é o arquivo
`desktop/inventory.json` na edição desktop e `server/inventory.json` na server,
compilado dentro do executável.

Cada item dessa lista declara o id, o nome, a categoria, a versão, a política de
versão, as dependências, o método de instalação por sistema e o comando que
verifica o resultado. Quando você instala `node`, o binário não procura a
última versão: ele usa a entrada de `node` na lista, instala pelo método
daquele sistema e confere com o comando de verificação que a entrada declara.

## O que a versão de um item significa

A política de versão decide como o item é instalado e conferido.

| Política | Como funciona | Exemplo |
| --- | --- | --- |
| `exact` | versão fixada, instalada e conferida exatamente | Node 24.22.3 |
| `series` | pacote nativo preso em `major.minor` | PHP 8.5 |
| `minimum` | ferramenta que se atualiza sozinha; a verificação exige o piso | Claude Code |
| `commit` | fonte Git presa a um commit | ferramenta instalada por clone |
| `repository` | última estável de um repositório preso por impressão digital da chave | pacote de repositório APT |
| `distro` | pacote que vem do sistema | `build-essential` |
| `managed` | o instalador do fornecedor escolhe a versão | instalador oficial |
| `system` | configuração sem versão | bloco de configuração do WSL |

O `list` mostra a versão fixada, não a versão que está instalada. Para comparar
com a máquina, use `check`.

## Instalar

`setupvibe install <itens>` instala os itens citados e as dependências deles, na
ordem que a lista define. Um item que já passa na verificação é pulado, e o
motivo aparece na saída.

```bash
setupvibe install docker
```

Numa máquina que vai receber dois runtimes e as ferramentas de terminal, o
`--dry-run` mostra as dependências que entram junto e o que já está pronto:

```bash
setupvibe install node php bat eza jq --dry-run
```

O plano mostra o método de cada item. Em Debian e Ubuntu, um pacote nativo passa
pelo APT com a chave do repositório conferida contra a impressão digital da
lista; uma ferramenta de versão fixa passa pelo mise; um release binário é
baixado, conferido contra o SHA-256 e extraído. A ordem de resolução do método
é o sistema, a família (`debian-family` ou `arch-family`), `linux`, `unix` e
`all`.

Quando o item já está instalado por outro gerenciador, o comando avisa o caminho
e instala a cópia do SetupVibe numa pasta própria. As duas convivem, e o `PATH`
decide qual responde. Para substituir a instalação existente por completo,
remova a outra cópia depois de conferir a versão que ficou ativa.

`--force` reinstala um item que já passa na verificação. É o caminho para
reparar uma instalação quebrada sem mexer no resto da seleção:

```bash
setupvibe install node --force
```

## Remover

`remove` tira o que foi instalado no espaço do usuário e atualiza a seleção.
Pacote do sistema só sai com `--include-native`, e item adotado pelo `init` só
sai com `--force`.

```bash
setupvibe remove go
setupvibe remove docker --include-native --dry-run
```

Antes de remover, o comando verifica se outro item selecionado depende daquele.
Se depende, ele recusa e explica; `--force` remove mesmo assim. Sem terminal, a
confirmação precisa vir de `--yes`. A resposta negativa ou um `Ctrl+C` termina
com 130, sem remover nada.

O que o SetupVibe não instalou fica. Item que veio do sistema, item do módulo de
segurança e item marcado como `initOnly` não são removidos por `remove`, e o
motivo aparece no texto. Para desfazer a preparação inteira, existe
`self uninstall`, no capítulo de manutenção.

## Atualizar

`update` não consulta a internet. Ele compara a seleção com a lista do binário
que está rodando e reinstala só os itens cuja versão fixada mudou. Isso amarra a
atualização à versão do binário: binário antigo conhece versões antigas.

```bash
setupvibe update --dry-run
```

O plano lista cada item com a versão de origem e a de destino. Depois de
`setupvibe upgrade`, o `update` seguinte aplica o que a versão nova do binário
trouxe:

```bash
setupvibe upgrade
setupvibe update
```

Item instalado com `--external` não entra no `update`; ele é atualizado pela
própria ferramenta ou por um novo `install --external`.

## Conferir

`check` roda o comando de verificação de cada item selecionado. A saída é uma
linha por item, com `✓` ou `✗`, a saída do comando e a versão esperada.

```bash
setupvibe check
setupvibe check node php --json
```

Sem argumentos, ele usa a seleção. Sem seleção, usa o perfil `essencial`. Itens
`initOnly`, do módulo de segurança e sem instalação possível neste sistema não
entram na verificação. O exit code é 0 quando tudo confere e 10 quando algum
item falha, o que permite usar o comando num pipeline sem interpretar texto:

```bash
setupvibe check --json | jq '.data.results[] | select(.status=="fail")'
setupvibe check node || echo "rode: setupvibe install node"
```

`list --check` junta as duas leituras: a lista completa, com o resultado da
verificação ao lado de cada item selecionado. É útil para ver o que está fora da
versão sem rodar `check` duas vezes.

## Ferramenta fora da lista

Uma ferramenta que não está na lista entra pelo mise, com a versão resolvida na
hora e gravada em `~/.setupvibe/external.json`. Sem versão no argumento, o
binário pergunta ao mise a última e fixa o que ele devolveu.

```bash
setupvibe install --external terraform
setupvibe install --external terraform@1.13.4
```

Uma ferramenta que o mise não conhece termina com 6, `NOT_FOUND`. Para remover,
use o mesmo caminho:

```bash
setupvibe remove --external terraform
```

## Flags que mudam o comportamento por máquina

Três flags da lista explicam diferenças que aparecem na prática:

- `gui`: o item depende de interface gráfica e fica de fora em máquina sem
  display, como um VPS ou um contêiner.
- `service`: precisa de systemd ou de `linger` para rodar sem sessão aberta.
- `port`: publica uma porta. Nas variantes remotas, o `auto` grava a entrada de
  compose com a porta presa a `127.0.0.1`, para o serviço não ficar exposto.

Uma flag pode valer só para um sistema. O `list` e a tabela do tópico
`inventory` mostram a diferença por linha.

## Próximo passo

A lista está conferida e as versões estão no lugar. O capítulo [A TUI](04-a-tui.md)
mostra como operar a mesma lista pela interface, com filtro, seleção e
progresso ao vivo.
