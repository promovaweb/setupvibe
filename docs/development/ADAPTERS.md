# Instalação e atualizações por gerenciador

> Núcleo implementado na alpha.1. A integração real de Git passou em Debian 13 x86_64.

## Propriedade e preservação

A inspeção resolve o executável e verifica sua versão. A origem APT é
comprovada com dpkg-query e caminho canônico. Homebrew exige fórmula instalada
no JSON e executável dentro do prefixo correspondente. Mise exige registro
global instalado em JSON e caminho dentro de install_path.

Origem externa ou ambígua não é automaticamente adotada. Instalar algo que já
existe preserva o executável e retorna unchanged. Atualizar exige origem
comprovada. O campo managed só fica verdadeiro para instalação criada pelo
SetupVibe ou já gerenciada anteriormente. Alteração de origem/caminho de uma
instalação gerenciada interrompe a mutação para revisão.

## Planos e execução

`component install/update --dry-run` agora inclui observações reais, comando
planejado, preparação e ready. Observações têm horários próprios; somente o
plano de dependências é determinístico. ready false indica pré-condição ou
adaptador indisponível. Prévia não cria banco nem executa instalação.

Na execução, um lock do host serializa mutações externas entre diretórios.
Um segundo lock protege operações no diretório de estado. Cada etapa é
observada novamente, executada e verificada; retorno zero do instalador
sozinho não é sucesso. Etapas dependentes de falha ficam skipped; etapas
independentes continuam. Resultados parciais retornam 5.

## Comportamento dos adaptadores

| Gerenciador | Instalação | Atualização | Consulta |
| --- | --- | --- | --- |
| APT | Índices atualizados; pacote explícito; --no-install-recommends | Pacote proprietário com --only-upgrade | apt-cache policy sem atualizar índices |
| Homebrew | brew install para o item selecionado | brew upgrade para o item selecionado | brew outdated --json=v2 |
| mise | mise use --global para a versão solicitada | mise upgrade --global sem --bump | mise outdated --global --json |

APT preserva configurações existentes com --force-confold. Quando necessário,
usa sudo -n e ambiente não interativo; sem credencial prévia, falha sem prompt.
A consulta de atualização APT usa os índices locais e informa esse limite.

Homebrew recebe HOMEBREW_NO_AUTO_UPDATE=1 para evitar atualização implícita
do gerenciador durante consultas. A consulta depende dos metadados locais.
Mise trabalha no escopo global, com diretório de trabalho no HOME, sem
modificar arquivos de projeto. Versão explícita via --target-version está
disponível para mise; aceita versão literal ou prefixo com número, como 24 ou 24.22.1.
Aliases como latest são recusados nessa flag; omiti-la usa a política normal do
gerenciador. Após a operação, o JSON global do mise precisa corresponder à
versão solicitada e ao caminho do executável observado. Exit zero isoladamente
não comprova sucesso. install preserva versões existentes e recusa divergência;
use update para trocar a versão. Não há --bump automático.

Instaladores de fornecedores, Docker/serviços e Tailscale usam rotinas
específicas descritas nos respectivos guias.

## component inspect e verify

Inspect retorna presença, versão, caminho e origem sem persistir.
Verify retorna erro 4 quando o componente está ausente. Ambos recusam edição
incompatível antes de executar ferramentas.

```bash
setupvibe component inspect git
setupvibe --edition server component inspect gh
setupvibe --output json component inspect node
setupvibe component inspect ansible
setupvibe --timeout 10 component inspect tailscale
```

```bash
setupvibe component verify git
setupvibe --edition server component verify gh
setupvibe --output json component verify node
setupvibe component verify ansible
setupvibe --timeout 10 component verify tailscale
```

## Instalação e atualização autorizadas

Use a prévia para conferir o gerenciador. --yes autoriza o plano solicitado;
--non-interactive apenas declara ausência de perguntas.

```bash
setupvibe component install git --dry-run
setupvibe --edition server component install git gh --yes
setupvibe component install node --target-version 24 --yes
setupvibe component update git --yes
setupvibe --output ndjson component update node --yes --non-interactive
```

## updates list

Aceita IDs opcionais. Sem IDs, consulta todos os componentes da edição.
Cada falha fica no resultado individual; mistura de sucesso e falha retorna 5.
A ausência de candidato não equivale a uma consulta que falhou.

```bash
setupvibe updates list git
setupvibe updates list git gh
setupvibe --output json updates list node
setupvibe --edition server updates list
setupvibe --timeout 10 updates list ansible
```

## updates apply

Exige um ou mais IDs explícitos. Não atualiza todos os pacotes do sistema.
Compartilha o executor e o histórico com component update.

```bash
setupvibe updates apply git --dry-run
setupvibe updates apply git --yes
setupvibe --edition server updates apply git gh --yes
setupvibe --output json updates apply node --yes
setupvibe --output ndjson updates apply ansible --yes --non-interactive
```

## Verificação

A suíte principal contém 105 testes. Os testes dos adaptadores usam executáveis
Node.js controlados para consultar propriedade, JSON, falha parcial e
exclusividade do host. Não comprovam instalações de todos os fornecedores.

A integração `node --test tests/integration/debian.mjs` usa Debian 13 slim
descartável. Passaram instalação limpa de Git 2.47.3, repetição unchanged,
atualização, três registros de operação e preservação de `user.name`.
O container é removido ao terminar. Não houve instalação de pacotes no host.

Fontes: [mise ls](https://mise.jdx.dev/cli/ls.html),
[mise outdated](https://mise.jdx.dev/cli/outdated.html),
[mise use](https://mise.jdx.dev/cli/use.html) e
[manual Homebrew](https://docs.brew.sh/Manpage).

## Dependências e reexecução

O plano conserva os IDs explicitamente solicitados. Dependências são aplicadas
somente para instalações ausentes. Uma instalação externa já presente não
provoca bootstrap de outro gerenciador. Atualizações não instalam dependências
e um componente ausente falha com orientação para usar install.

Sem Docker CLI, a prévia de serviços mantém a etapa Docker e marca a descoberta
do serviço como adiada. Após instalar Docker, o executor confere novamente
existência, propriedade e conflitos antes de criar o serviço. Docker presente
com daemon inacessível gera erro; não é tratado como ausência do serviço.
