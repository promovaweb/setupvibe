# Usar o SetupVibe 2

O SetupVibe prepara o ambiente e acompanha instalações, serviços e recursos.
A edição Desktop inclui desenvolvimento local. A Server contém seis componentes:
Docker Engine/Swarm, Portainer, Git, gh, Tailscale e coletor nativo.
Consulte a [matriz de compatibilidade](../development/COMPATIBILITY.md) antes de instalar.

## Obter o executável

A versão local é `2.0.0-alpha.1`. Os binários Linux amd64 estão em `dist/`
após `npm run build:linux`. Ainda não foi publicada uma release desta v2.
Os domínios abaixo são os endereços definidos para distribuição. Não trate seu
conteúdo remoto como esta versão até a publicação dos artefatos correspondentes.

```bash
curl -fsSL https://desktop.setupvibe.dev | bash
curl -fsSL https://server.setupvibe.dev | bash
```

Para desenvolver ou experimentar a cópia local:

```bash
cargo build --locked
./target/debug/setupvibe version
./target/debug/setupvibe --edition server catalog list
./target/debug/setupvibe doctor
./target/debug/setupvibe tui
```

Nos exemplos seguintes, `setupvibe` representa o executável instalado no PATH.
O bootstrap usa `$HOME/.local/bin` por padrão e informa o ajuste de PATH quando
necessário. Não edita seu perfil de shell. Consulte os parâmetros e a verificação
SHA-256 em [distribuição](../development/DISTRIBUTION.md).

## Preparar o ambiente

Confira o diagnóstico, consulte as opções dos componentes e gere uma prévia:

```bash
setupvibe doctor
setupvibe catalog show node
setupvibe component install git gh node --dry-run
```

A prévia mostra as etapas e suas pré-condições. Só aplique depois de conferir
edição, gerenciador, destino e configuração. O CLI exige `--yes` para alterações,
mesmo em um terminal interativo. Não há confirmação implícita por usar SSH.

```bash
setupvibe component install git gh node --yes
setupvibe component verify git
setupvibe component inspect node
setupvibe operation list
```

Na TUI, escolha componentes na aba Aplicativos, abra a revisão e confirme a
operação. A tela mostra progresso e resultado. A flag global `--yes` não pula
a revisão visual. [Navegação e atalhos](../development/TUI.md) descrevem todas
as telas, inclusive terminal compacto, mouse, cancelamento e erros.

O SetupVibe preserva instalações existentes. Ele não transforma uma instalação
externa em gerenciada nem substitui configurações pessoais para completar uma
seleção. Consulte [gerenciadores e atualização](../development/ADAPTERS.md).

## Atualizar uma seleção

A consulta separa versão instalada, candidato disponível e limites do gerenciador.
Ausência de candidato confiável não significa que o aplicativo esteja atualizado.

```bash
setupvibe updates list git gh node
setupvibe updates apply git gh --dry-run
setupvibe updates apply git gh --yes
setupvibe component update node --target-version 24 --dry-run
setupvibe component update node --target-version 24 --yes
```

`--target-version` é específico de mise. Use uma versão literal ou prefixo
numérico. A atualização só é confirmada quando o gerenciador e o caminho do
executável comprovam a versão solicitada.

O executável principal é atualizado repetindo o bootstrap para uma release
publicada. A cópia privada do coletor usa `setupvibe collector update --yes`.
São arquivos separados, para manter a coleta independente da TUI.

## Trabalhar com serviços

Desktop oferece PostgreSQL, Redis, Mailpit e Portainer. Serviços são compartilhados
por host. A Server oferece somente Portainer e seu Agent, além do runtime Docker.
O SetupVibe descobre serviços externos, mas recusa controlá-los como se fossem seus.

```bash
setupvibe component install redis --option port=7000 --dry-run
setupvibe component install redis --option port=7000 --yes
setupvibe service list
setupvibe service inspect setupvibe-redis
setupvibe service logs setupvibe-redis --tail 20
```

Use o ID efetivamente retornado pela descoberta. Stop/restart preservam volumes.
Atualização de serviço conserva configuração e tenta restaurar o container
anterior quando a substituição falha. Isso não substitui backup dos dados.
Leia [Docker, Swarm e serviços](../development/DOCKER.md) antes de preparar um cluster.

## Acompanhar recursos

O coletor usa processo independente e conserva sete dias de métricas. O intervalo
padrão de cinco segundos foi uma escolha de implementação e aceita configuração
entre um e 3.600 segundos. Desktop usa supervisor de usuário. Server usa systemd
system e exige permissões administrativas.

```bash
setupvibe collector install --dry-run
setupvibe collector install --yes
setupvibe collector status
setupvibe metrics current
setupvibe --output json metrics history --scope host --limit 100
```

Para diagnóstico finito, sem instalar uma unidade de supervisor:

```bash
setupvibe collector run --samples 3 --interval 1 --yes
```

Confira idade, disponibilidade e estado do coletor antes de interpretar uma
amostra. Recurso ausente ou coleta interrompida não representa consumo zero.
Observar CPU, memória e limites de containers não aplica limites ao Docker.
[Consultas de agentes](../development/SUPERVISION-AGENTS.md) explicam paginação
e resposta a dados antigos.

## Automatizar e recuperar falhas

`--output json` produz um resultado final. `--output ndjson` produz eventos por
linha. Verifique o código de saída e o campo `success`. Em falha parcial, consulte
cada etapa antes de repetir uma operação.

```bash
setupvibe --non-interactive --output json component install git gh --dry-run
setupvibe --non-interactive --output ndjson component install git gh --yes
setupvibe --output json operation list --limit 20
setupvibe state status
setupvibe state reconcile --dry-run
```

Se uma operação foi interrompida, a reconciliação registra observações sem inventar
sucesso. Não remova os bancos para ocultar falhas. Use `operation show ID` para
consultar o resultado gravado. `state backup` copia somente `setupvibe.db`, sem
métricas, volumes ou arquivos privados dos serviços.

Tailscale limita-se a instalar, verificar e atualizar. Login, tokens administrativos,
Serve, Services e Funnel ficam fora do produto. Uma atualização pode interromper
uma sessão SSH que dependa do túnel. Consulte [Tailscale](../development/TAILSCALE.md).

## Referência e condições de sucesso

A [referência completa](../cli/REFERENCE.md) documenta cada comando, entrada,
saída, flag e cinco exemplos por entrada. O [protocolo CLI](../development/CLI.md)
detalha os códigos de saída e a entrada de tokens Swarm por stdin.

Uma preparação está concluída quando os componentes selecionados foram verificados,
os serviços solicitados estão saudáveis e o histórico registra o resultado.
A autenticação de ferramentas externas continua sendo uma etapa própria do usuário.
A instalação de um CLI não comprova uma conta autenticada.
