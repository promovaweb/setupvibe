# Plano do guia do usuário

Registro interno das escolhas editoriais de `docs/user/`. Este arquivo não
entra no ebook: o pipeline compila apenas as páginas listadas em
`docs/user/reading-order.txt`.

## Escolha registrada pelo Luiz (13/11/2026)

| Ponto | Escolha | Alternativa não escolhida |
| --- | --- | --- |
| Formato | guia em capítulos, como o do Termfy, do primeiro uso ao avançado, com a referência como apêndice | manual único de consulta; coletânea de tutoriais por comando |
| Idioma | só português do Brasil | edição espelhada em inglês |
| Versão | a mesma SemVer de `package.json`, no nome dos artefatos, no `VERSION` e no manifesto do ebook | versão própria do ebook |
| Saída | PDF e EPUB gerados de `docs/user/` pelo pipeline em `.ebook/` | somente Markdown no repositório |

Alcance: as escolhas valem para este guia, para as páginas de `docs/user/` e
para os artefatos gerados.

## Público

Pessoas que preparam máquinas de desenvolvimento, no notebook ou em servidor,
sozinhas ou em equipe, e que vão operar o SetupVibe depois da instalação. O
guia serve tanto a quem chegou pelo projeto da Promovaweb quanto a quem adotou
o binário por conta própria.

O guia assume familiaridade com terminal, `sudo`, variáveis de ambiente e Git.
Não assume conhecimento de Bun, mise, Docker Swarm nem Model Context Protocol:
os três aparecem onde o SetupVibe os usa, com a documentação oficial indicada
quando ela for a melhor fonte.

## Objetivo

Levar alguém de uma máquina sem binário até operar o SetupVibe 2 no dia a dia:
instalar o binário, preparar a máquina com `init`, escolher o que entra,
manter as versões fixadas, usar a TUI, entender o que ele gravou no shell,
operar um servidor com segurança, conectar agentes por MCP, migrar uma máquina
do SetupVibe 1 e resolver as falhas que o binário classifica.

Cada capítulo responde a uma pergunta de trabalho. A referência completa de
commands, opções, configuração, exit codes e tools MCP fica nos apêndices,
para não interromper a leitura com tabelas.

## Recorte

O guia cobre o SetupVibe 2, como ele está no branch `v2`: os binários
`setupvibe` e `setupvibe-server`, os installers `install.sh`, `install-server.sh`
e `install.ps1`, os commands embutidos, os arquivos de `~/.setupvibe/` e o que
o `auto` faz numa máquina nova.

Ficam de fora:

- o SetupVibe 1 como instalação nova (ele aparece só como origem da migração,
  no capítulo próprio);
- a especificação interna do produto e o código de `shared/`;
- o funcionamento interno do mise, do Docker Swarm e do MCP além do que o
  binário usa para operar;
- conteúdo de `desktop/docs/` e `server/docs/`, que é a documentação embutida
  no binário, escrita para agentes lerem sem o repositório.

## Convenção dos exemplos

A máquina de exemplo é um host Debian 13 x64, com 20 GB de RAM e 74 GB livres,
que já tinha passado pelo SetupVibe 1. Os blocos `text` foram copiados de
execuções reais do binário nessa máquina, com dois ajustes declarados: a pasta
pessoal aparece como `~` e as listas longas aparecem cortadas com `…`. Os
valores de memória, disco e versão mudam de máquina para máquina, e o guia
avisa quando isso importa.

Cada exemplo mostra uma situação, o comando e o resultado esperado. Um mesmo
comando não se repete em capítulos diferentes com outro cenário: o segundo uso
aponta para o primeiro.

Os nomes de commands, opções, keys, exit codes e campos do `--json` ficam em
inglês, como o binário escreve. A explicação em volta é em português do Brasil.

## Sumário

### Parte 1. Primeiro uso

| Capítulo | Pergunta que responde |
| --- | --- |
| [Abertura](user/README.md) | O que é o SetupVibe 2 e como este guia está organizado? |
| [Visão geral](user/00-visao-geral.md) | De que peças o SetupVibe é feito e o que cada uma guarda? |
| [Instalação e primeiro uso](user/01-instalacao-e-primeiro-uso.md) | Como instalar o binário, preparar a máquina e instalar os primeiros itens? |
| [Instalação automática](user/02-instalacao-automatica.md) | Como preparar uma máquina sem perguntas, com perfil, respostas e plano? |
| [Itens e versões fixadas](user/03-itens-e-versoes.md) | O que a lista de itens controla, como instalar, remover, atualizar e conferir? |

### Parte 2. Operação

| Capítulo | Pergunta que responde |
| --- | --- |
| [A TUI](user/04-a-tui.md) | O que cada módulo mostra e como operar a interface pelo teclado e pelo mouse? |
| [Shell e terminal](user/05-shell-e-terminal.md) | O que o SetupVibe escreve no shell, no prompt e no tmux, e como personalizar sem perder a atualização? |
| [Manutenção](user/06-manutencao.md) | Como diagnosticar, atualizar o binário, levar a seleção para outra máquina e reler os logs? |
| [Servidor e segurança](user/07-servidor-e-seguranca.md) | Como preparar um VPS com `setupvibe-server`, usuário de trabalho, UFW, fail2ban e Swarm? |
| [Agentes de IA e MCP](user/08-agentes-e-mcp.md) | Como um agente lê o estado da máquina e executa o SetupVibe por MCP? |
| [Windows e WSL](user/09-windows-e-wsl.md) | O que muda no Windows, como o WSL entra e o que o binário não altera? |
| [Vindo do SetupVibe 1](user/10-vindo-do-setupvibe-1.md) | O que o `migrate` converte, o que ele pergunta e o que você precisa conferir depois? |
| [Problemas comuns e glossário](user/11-problemas-e-glossario.md) | O que fazer com cada sintoma conhecido e o que significa cada termo do guia? |

### Parte 3. Referência

| Apêndice | Conteúdo |
| --- | --- |
| CLI | convenções, opções globais, saída em texto e JSON e a referência de cada command |
| Configuração e estado | `settings.json`, arquivos de estado, cofre, master key e variáveis de ambiente |
| Códigos de saída | a tabela completa, os codes de cada command e como tratar cada classe |
| MCP | tools, resources, prompts, configuração nos clientes e limites de escrita |

Os quatro apêndices não são escritos à mão: o build lê
`desktop/docs/cli.md`, `configuration.md`, `exit-codes.md` e `mcp.md`, troca
`{{bin}}` por `setupvibe` e inclui o resultado depois dos capítulos. Assim o
ebook acompanha a documentação mantida para o binário, sem uma segunda cópia.

A abertura apresenta o guia; a visão geral apresenta as peças e pode ser
relida antes de qualquer capítulo da Parte 2.

## O que cada capítulo ensina

| Arquivo | O que ensina | O que o leitor leva |
| --- | --- | --- |
| `user/README.md` | o problema que o produto resolve, os três modos, as duas edições, como ler | o mapa do guia e a convenção dos exemplos |
| `user/00-visao-geral.md` | binário, lista de itens, estado, edições, installers, versões fixadas | o vocabulário e o desenho das peças |
| `user/01-instalacao-e-primeiro-uso.md` | installer, TUI, `list`, `init`, primeiro `install`, `auto`, `check`, `doctor` | uma máquina preparada e sabendo conferir |
| `user/02-instalacao-automatica.md` | `auto`, perfis, `--config`, `--plan`, variáveis, exit codes de falha | um provisionamento repetível, sem perguntas |
| `user/03-itens-e-versoes.md` | status de item, `install`, `remove`, `update`, `check`, versões fixadas, `--external` | controle do que entra e do que sai |
| `user/04-a-tui.md` | Início, sete módulos, teclas, mouse, idioma, tema, ícones | operação diária sem decorar comando |
| `user/05-shell-e-terminal.md` | blocos do `.zshrc`, `.zshrc.local`, Starship, tmux, aliases `cco`, `cxo` e `oco` | personalização que sobrevive à atualização |
| `user/06-manutencao.md` | `doctor`, `doctor --fix`, `upgrade`, `report`, `config export` e `import`, logs, `self uninstall` | rotina de manutenção e recuperação |
| `user/07-servidor-e-seguranca.md` | `setupvibe-server`, `user create`, `security apply`, UFW, fail2ban, SSH, Swarm | VPS preparado com o estado anterior registrado |
| `user/08-agentes-e-mcp.md` | `mcp --list`, tools, resources, prompts, configuração nos clientes, o que é leitura | agente operando a máquina com limites claros |
| `user/09-windows-e-wsl.md` | installer do Windows, PowerShell, WSL 2, `.wslconfig`, o que o binário preserva | Windows preparado com o shell original |
| `user/10-vindo-do-setupvibe-1.md` | detecção, `migrate --dry-run`, backups, duplicidades, o que fica | migração conferida, sem carregar configuração duas vezes |
| `user/11-problemas-e-glossario.md` | sintoma, causa, comando e exit code; termos do guia | resposta rápida e leitura sem ambiguidade |
| apêndices gerados | CLI, configuração, exit codes e MCP, lidos de `desktop/docs/` no build | consulta exata do que o binário implementa |

## Escolhas de escrita

- Prosa antes da lista. Cada comando aparece depois da explicação do que ele
  altera, com o resultado observável em seguida.
- `você` e presente do indicativo; imperativo nos passos numerados.
- Sem travessão como pontuação, sem abertura promocional, sem fechamento de
  efeito. As regras estão em `/home/luizeof/hub/PROHIBITED.md`,
  `/home/luizeof/hub/WRITING.md` e `MARKDOWN.md`.
- Nenhuma saída de terminal é inventada. Quando o guia descreve um plano sem
  mostrar o bloco, ele diz o que o plano contém.
- A referência não repete a explicação do capítulo: aponta para ele e lista os
  campos.

## Pipeline do ebook

O guia é a fonte canônica. `docs/user/reading-order.txt` define a ordem dos
capítulos; o pipeline em `.ebook/` lê esses arquivos, gera os quatro apêndices a
partir de `desktop/docs/`, e produz PDF e EPUB. `ebook/build.json` registra
versão, hashes, fontes e a versão do design system.

A identidade visual vem do SetupVibe:

- cores de `brand/colors/palette.json` (petróleo e ciano na capa, grafite no
  texto, azul do tema claro nos links);
- Manrope nos títulos e Inter no corpo, com os arquivos de `brand/fonts/`;
- logo de `brand/logo/logo-light.png` na capa;
- composição A4 do design system de PDF da Promovaweb, declarada como
  `pdf-design-system: 1.0.0` no CSS e no manifesto, conforme
  `/home/luizeof/hub/PDFS.md`.

O pipeline fica neste repositório, em `.ebook/` e `ebook/`. Nenhum arquivo do
Hub é alterado.

Os scripts `ebook` e `ebook:verify` ficam no `package.json` e não entram no
`validate`, porque o CI não tem Pandoc, WeasyPrint nem ImageMagick. A versão
dos artefatos é a de `package.json`; `ebook/VERSION` repete o mesmo valor e o
build falha quando os dois divergem.

## Etapas de produção

1. Plano, abertura e capítulo de instalação. Validação do recorte, da voz e do
   nível de detalhe antes de escrever o resto.
2. Demais capítulos, com os apêndices gerados da documentação embutida.
3. Pipeline, PDF e EPUB, leitura do PDF gerado e verificação do manifesto.

## Pendências

- Confirmar com o docs-ref se `desktop/docs/troubleshooting.md` pode ser lido
  pelo build como quinto apêndice. Hoje ele fica fora e o capítulo 11 usa o
  conteúdo como apoio.
- Recompilar o ebook quando a documentação embutida mudar de forma relevante,
  porque os apêndices acompanham `desktop/docs/`.
