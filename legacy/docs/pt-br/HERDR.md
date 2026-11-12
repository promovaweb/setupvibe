# Herdr no SetupVibe

> Multiplexador de agentes instalado pelas edições Desktop e Server.

O [Herdr](https://github.com/herdrdev/herdr) organiza agentes de código em workspaces persistentes no terminal. Cada workspace pode reunir abas e painéis, enquanto a barra lateral mostra se um agente detectado está trabalhando, aguardando uma resposta, concluído ou ocioso.

## Disponibilidade

| Edição | Sistemas | Estado |
| --- | --- | --- |
| Desktop | macOS, Linux e WSL | Instalado |
| Server | Distribuições Linux compatíveis | Instalado |
| Windows (Beta) | Windows nativo | Não instalado |

A edição Windows do SetupVibe não instala o Herdr porque o suporte nativo do projeto para essa plataforma ainda está em preview. No Windows, a edição Desktop pode ser executada dentro do WSL para usar o binário Linux estável.

## Como o SetupVibe Instala o Herdr

Os instaladores Desktop e Server leem o manifesto oficial em `https://herdr.dev/latest.json`, selecionam o binário do sistema operacional e da arquitetura detectados e aceitam somente assets publicados no caminho oficial de releases do projeto original no GitHub.

O binário selecionado passa pelas verificações de download do SetupVibe e é instalado em:

```text
~/.local/bin/herdr
```

Depois da instalação, o SetupVibe executa `herdr --version` com o `PATH` do usuário de destino. O passo falha quando o download não termina, a arquitetura não é compatível, o manifesto aponta para uma origem inesperada ou o comando instalado não pode ser executado.

Uma nova execução do SetupVibe consulta o manifesto atual e substitui o binário gerenciado pela release estável disponível para a máquina.

## Primeira Sessão

Abra o diretório de um projeto e inicie o Herdr:

```bash
cd ~/projetos/meu-projeto
herdr
```

O Herdr cria ou anexa o cliente à sessão padrão executada em background. Dentro de um painel, abra o agente de código com o comando habitual:

```bash
codex
```

Também é possível executar `claude`, `copilot` ou outro agente compatível com o Herdr. A autenticação, as permissões e as instruções do projeto continuam sob responsabilidade de cada CLI e repositório.

## Comandos Essenciais

| Comando | Função |
| --- | --- |
| `herdr` | Cria ou anexa o cliente à sessão padrão. |
| `herdr --version` | Mostra a versão instalada. |
| `herdr --help` | Lista os comandos e as opções disponíveis. |
| `herdr config check` | Valida a configuração do Herdr. |
| `herdr update` | Atualiza uma instalação gerenciada pelo instalador do Herdr. |
| `herdr server stop` | Encerra o servidor padrão e os processos executados nos painéis. |

Executar novamente o SetupVibe é a forma recomendada de atualizar o binário gerenciado pelo SetupVibe. Use `herdr update` somente quando quiser que o próprio Herdr assuma suas atualizações.

## Atalhos Iniciais

O Herdr usa `Ctrl+B` como prefixo padrão. Pressione o prefixo, solte as teclas e então pressione a tecla da ação.

| Ação | Atalho |
| --- | --- |
| Dividir à direita | `prefix` e depois `v` |
| Dividir abaixo | `prefix` e depois `-` |
| Criar aba | `prefix` e depois `c` |
| Próxima aba ou anterior | `prefix` e depois `n` ou `p` |
| Navegar entre workspaces | `prefix` e depois `w` |
| Desanexar o cliente | `prefix` e depois `q` |
| Mostrar atalhos ativos | `prefix` e depois `?` |

Desanexar o cliente ou fechar o terminal mantém o servidor do Herdr e os processos dos painéis em execução. Rode `herdr` novamente para retornar à mesma sessão.

## Herdr e Tmux

O SetupVibe continua instalando o tmux nas edições Desktop e Server. O Herdr prioriza workspaces e a visualização do estado dos agentes de código, enquanto o tmux continua adequado para sessões gerais de shell, rotinas remotas já estabelecidas e a configuração de plugins fornecida pelo SetupVibe.

Use apenas um multiplexador como sessão externa em cada rotina. Executar o Herdr dentro do tmux, ou o tmux dentro do Herdr, adiciona outra camada de prefixos e captura de input, o que dificulta a leitura de conflitos de teclado e mouse.

## Atualizações e Sessões em Execução

Uma atualização que muda o protocolo entre o cliente e o servidor do Herdr pode exigir a reinicialização da sessão. Leia a mensagem de atualização antes de executar:

```bash
herdr server stop
```

Esse comando também encerra os processos executados nos painéis. Quando você deseja apenas sair da interface e manter os agentes ativos, use `prefix` e depois `q`.

## Solução de Problemas

| Sintoma | Verificação |
| --- | --- |
| `herdr: command not found` | Abra outro shell e confirme se `~/.local/bin` aparece no `PATH`. |
| O SetupVibe não encontra um asset | Confirme se a máquina usa x86_64 ou ARM64 e consegue acessar `herdr.dev` e o GitHub. |
| Um agente de código não é detectado | Confirme se o agente roda diretamente dentro de um painel do Herdr e consulte a lista de agentes compatíveis. |
| Os atalhos chegam ao programa errado | Procure outro multiplexador aninhado ou atalhos do terminal configurados com o mesmo prefixo. |
| O cliente informa incompatibilidade de protocolo | Termine o trabalho atual, encerre o servidor afetado e inicie o Herdr novamente com o binário atualizado. |

## Leitura Complementar

- [Repositório do Herdr](https://github.com/herdrdev/herdr)
- [Documentação do Herdr](https://herdr.dev/docs/)
- [Índice da documentação do SetupVibe](../README.md)
