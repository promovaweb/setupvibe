# Visão geral

Preparar uma máquina de desenvolvimento envolve quatro trabalhos diferentes:
instalar pacotes do sistema, escolher versões de runtime, configurar o shell e
registrar o que foi feito. Quando cada trabalho fica num script separado, o
resultado depende da última execução e da versão disponível naquele dia.

O SetupVibe 2 junta os quatro num binário com três inventários, um por edição. Cada inventário diz o
que entra e em qual versão. O binário executa a instalação e grava o resultado
para permitir a conferência das versões e a consulta ao histórico de alterações.

## As peças

| Peça | Onde vive | O que faz |
| --- | --- | --- |
| binário | `~/.local/bin/setupvibe` ou `/usr/local/bin/setupvibe` | executa os commands, abre a TUI e serve o MCP |
| lista de itens | `desktop/inventory.json`, `server/inventory.json` e `omarchy/inventory.json`, embutidos no binário | define cada item, a versão fixada, as dependências, o método de instalação e a verificação |
| installers | `install.sh`, `install-server.sh` e `install.ps1` | baixam o binário do release e conferem o checksum |
| estado | `~/.setupvibe/` | guarda a seleção, o resultado das execuções, as preferências e o cofre |
| documentação embutida | dentro do binário | responde `--skill` e `docs` sem o repositório |

A lista viaja dentro do binário. Isso resolve um problema prático de
provisionamento: a máquina que executa não precisa de acesso ao repositório
para saber o que instalar. O binário e a lista têm a mesma versão, então uma
máquina preparada com `2.0.0-dev.25` instala exatamente o que aquele binário
conhece.

## O ciclo de uso

Os seis passos seguem a ordem abaixo e podem ser repetidos sem desfazer o
trabalho anterior.

1. **detectar**: `setupvibe desktop system` mostra o sistema, a variação da máquina
   (local, remota ou sem interface), o suporte e o estado da versão.
2. **preparar**: `setupvibe desktop init` confere os requisitos e instala as
   dependências de compilação e o mise.
3. **escolher**: `setupvibe desktop list` mostra os itens e o estado de cada um. A TUI
   permite marcar e instalar pelo teclado.
4. **instalar**: `setupvibe desktop install <itens>` instala a seleção explícita.
   `setupvibe desktop auto` instala sem perguntas.
5. **conferir**: `setupvibe desktop check` compara a máquina com a versão fixada.
   `setupvibe desktop doctor` olha o conjunto.
6. **manter**: `setupvibe desktop update` troca versões, `setupvibe desktop upgrade` atualiza o
   binário e `setupvibe desktop remove` tira o que você não quer manter.

Nada nesse ciclo depende de um serviço do SetupVibe estar no ar. O binário
consulta a versão nova uma vez e avisa. A instalação e a conferência são
locais, com downloads dos fornecedores de cada ferramenta.

## Versões fixadas

Cada item carrega uma política de versão. Uma linguagem instalada pelo mise
fica na versão exata (`php@8.6.0`, `node@24.22.3`), uma CLI que se atualiza
sozinha fica com versão mínima e um pacote do sistema segue a distribuição. O `setupvibe desktop check` aplica a
mesma política na conferência. Já o `setupvibe desktop update` troca só o item cuja
versão fixada mudou entre o binário que você tem e o novo.

O SetupVibe cuida das ferramentas da máquina, preservando o controle de
dependências do projeto pelo `composer.lock`, pelo `package-lock.json` e pelo
`mise.toml` local.

## Edições

| Edição | Comando | Escopo |
| --- | --- | --- |
| Desktop | `setupvibe desktop` | ambiente de desenvolvimento local ou remoto |
| Server | `setupvibe server` | operação em Ubuntu e Debian, com Docker Swarm e módulo de segurança |
| Omarchy | `setupvibe omarchy` | ferramentas adicionais para Omarchy, com as configurações da distribuição preservadas |

Use `setupvibe edition set desktop` para salvar Desktop ou troque a edição
pelo menu da TUI com `E`. O binário usa essa escolha quando o comando não
traz a edição. Sem preferência salva, um comando de edição sem prefixo sai
com 15 (`EDITION_REQUIRED`).

## O que o binário guarda

Quatro arquivos explicam quase todo comportamento que surpreende numa primeira
sessão:

- `edition.json` guarda a edição escolhida pela conta atual.
- `config.json` guarda a edição, o sistema detectado, o registro do `init`, a
  identidade do Git e o canal de release como registro da preparação da máquina.
- `selection.json` guarda os itens escolhidos, a versão instalada e o status do
  último `check`, usados por `list`, `check` e `update`.
- `settings.json` guarda as preferências que você altera pelos comandos de
  configuração, em texto claro e com keys em notação de ponto.

O [apêndice de configuração](../../desktop/docs/configuration.md) lista todos os
arquivos, os comandos que escrevem neles e o tratamento das mudanças de formato.

## Conhecimentos necessários

Para usar este guia, você precisa saber usar terminal, `sudo`, variáveis de
ambiente e Git. Não precisa saber Bun,
mise, Docker Swarm nem Model Context Protocol: o guia mostra o que o produto faz
com cada um e onde está a documentação oficial quando o assunto passa do escopo.

A especificação interna e o código de `shared/` estão documentados no
repositório e em `V2.md`.

## Próximo passo

O capítulo [Instalação e primeiro uso](01-instalacao-e-primeiro-uso.md) instala
o binário, prepara a máquina com `init` e instala o primeiro conjunto de itens.
