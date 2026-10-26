# Produto e requisitos

O SetupVibe 2 prepara e mantém ambientes de desenvolvimento e servidores por
um executável Rust. Você pode selecionar componentes na TUI, revisar o plano e
acompanhar a execução, ou usar o CLI com JSON/NDJSON em automações. O coletor
funciona em processo independente e mantém sete dias de métricas locais.

## Público e situações de uso

Na Desktop, o fluxo atende quem prepara uma máquina para programar e precisa
conferir ferramentas, runtimes e serviços locais depois da instalação. Na
Server, o fluxo atende a manutenção de Docker/Swarm, Portainer, Git, gh,
Tailscale e coleta nativa. A Server não recebe assistentes de programação,
bancos de desenvolvimento ou uma stack adicional de monitoramento.

Uma instalação existente é observada antes de qualquer alteração. O catálogo
informa o que o produto conhece, enquanto os adaptadores conferem o que está
instalado e qual gerenciador pode atualizá-lo. O estado local registra essas
observações e as operações executadas. Ele não substitui a consulta ao host.

## Requisitos definidos e resultado

| Requisito | Implementação |
| --- | --- |
| Desktop completa e Server reduzida | Catálogo com 26 componentes Desktop e seis Server |
| CLI e TUI equivalentes no núcleo | Mesmo planejador, adaptadores, execução, locks e histórico |
| Instalação por curl e Bash | Bootstraps separados, HTTPS, SHA-256 e troca do executável |
| Linux e macOS | Adaptadores e supervisão por sistema, com matriz de testes separada |
| Atualizações selecionadas | Descoberta pelo proprietário e execução por componente |
| Catálogo embarcado | JSON validado e incorporado ao binário |
| Estado e métricas SQLite | Dois bancos, migrações transacionais, WAL e consultas sem escrita |
| Coletor independente | Foreground supervisionável, systemd e launchd |
| Retenção de sete dias | Consulta limitada à janela e limpeza em lotes |
| Integração com agentes | JSON/NDJSON para recursos, histórico, diagnóstico e controle explícito |
| Tailscale restrito | Somente install, verify e update |

## Escolhas técnicas adotadas

O intervalo inicial de coleta é cinco segundos e pode ser configurado entre
1 e 3600 segundos. Esse valor foi adotado na implementação, sem transformar a
proposta original em requisito imutável. A retenção permanece fixa em sete dias.

Os serviços Desktop são compartilhados por host. Cada serviço tem nome, label,
volume e configuração próprios do SetupVibe. Não existe isolamento automático
por projeto. O runtime escolhido para macOS é Docker Desktop. Portainer usa a
edição CE e distingue os papéis Server e Agent.

A matriz inicial aceita Debian 12/13, Ubuntu 24.04 e macOS 14+ Desktop, nas
arquiteturas amd64 e arm64. Isso define o alvo da implementação, não uma
homologação automática. A [compatibilidade](COMPATIBILITY.md) registra os
ambientes efetivamente executados e os testes ainda necessários.

## Fluxo de preparação

Você começa pelo catálogo da edição, seleciona componentes e solicita uma
prévia. O plano mostra dependências, opções e comandos. A execução exige
`--yes` no CLI ou confirmação na TUI. Depois, a verificação confere o resultado
e o histórico permite localizar falhas por componente.

```bash
setupvibe --edition server catalog list
setupvibe --edition server component install git gh --dry-run
setupvibe --edition server component install git gh --yes
setupvibe --edition server git verify
setupvibe --output json operation list --limit 10
```

Neste exemplo, a preparação fica limitada a Git e gh. A prévia não cria banco.
Se um deles já existir, a instalação o preserva. Uma falha no outro componente
não apaga o sucesso anterior e aparece separadamente no histórico.

## Gerenciamento contínuo

Depois da preparação, você consulta atualizações, escolhe os componentes e
revisa a operação. Serviços gerenciados permitem inspeção, logs e controles.
Métricas mostram idade e disponibilidade da amostra para que uma automação não
interprete dado antigo como consumo atual.

```bash
setupvibe --output json updates list git gh
setupvibe updates apply git --dry-run
setupvibe updates apply git --yes
setupvibe --output json metrics current --scope host --max-age 30
setupvibe --output json collector status
```

Atualizar um pacote não equivale a atualizar todo o ambiente. A edição, a
propriedade e as capacidades de cada recurso continuam sendo verificadas.
Observar CPU e memória não aplica limites de recursos aos containers.

## Fora do escopo

O SetupVibe não administra autenticação Tailscale, tokens administrativos,
Serve, Services ou Funnel. Também não faz login em assistentes, migra projetos,
remove volumes ou adota serviços externos automaticamente. Credenciais dos
aplicativos permanecem sob os mecanismos dos próprios fornecedores.

A remoção de legado desta implementação ocorreu nos arquivos da branch v2.
Ela não remove instalações da geração anterior do computador de quem usa o
produto. Falhas, conflitos e origens desconhecidas exigem conferência explícita.

## Condições de sucesso

A preparação termina com componentes verificados ou falhas individuais
registradas. Consultas não instalam programas. Reexecução não troca uma origem
externa por outro gerenciador. A TUI pode ser fechada sem encerrar o coletor.
O [mapa de aceitação](ACCEPTANCE.md) relaciona esses comportamentos aos testes.
