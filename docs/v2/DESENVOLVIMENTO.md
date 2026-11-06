# Desenvolvimento da aplicação v2

Docker Engine possui fornecedor APT integrado à CLI, ao manifesto e a Resources.
O teste real Debian 13 x64 passou com 22 verificações. A opção
--install-dependencies também prepara Docker ausente antes de criar serviços.
Consulte [Docker Engine](DOCKER.md) para comandos, privilégios e limitações.

Na raiz do repositório SetupVibe, use Bun 1.3.14:

```bash
bun install --frozen-lockfile
bun run check
bun test
bun run dev --version
bun run dev platform
```

As consultas do CLI não criam bancos nem instalam componentes. Os comandos
de alteração exigem confirmação explícita. O campo homologated permanece false até testes completos por plataforma. OpenTUI 0.8.2 está fixado no manifest
e no lockfile; a TUI inclui seleção, instalação de runtimes e controle de
serviços registrados. O módulo de plataforma recusa Windows,
arquiteturas fora de x64/ARM64 e Server no macOS.

## Catálogo e planejamento

O módulo `src/core/catalog.ts` recebe dados desconhecidos e valida campos,
IDs, edições, sistemas e referências. Campos extras, listas duplicadas,
dependências ausentes e ciclos são recusados antes da geração do plano.

`createPlan` recebe catálogo, IDs selecionados e platform. A saída contém
seleção ordenada, platform e componentes em ordem de dependência. Seleções
equivalentes geram a mesma ordem. Uma dependência incompatível impede o plano
inteiro. A função não executa comandos nem escreve arquivos.

O catálogo alimenta o CLI e a TUI. Os adaptadores de execução ainda não cobrem
todos os componentes disponíveis para consulta e planejamento.
Os testes atuais comprovam o resolvedor, sem comprovar instalação de pacotes.

## Consultas do CLI

O catálogo JSON embarcado contém 26 componentes. Os identificadores e as
relações de dependência já podem ser consultados. Os campos de fornecedor
representam o planejamento; downloads e versões ainda exigem validação nos
adaptadores antes de qualquer instalação.

```bash
bun run dev catalog
bun run dev catalog --server --json
bun run dev plan node python --json
bun run dev plan portainer --server
bun run dev plan postgresql redis mailpit
```

`catalog` filtra edição e sistema atuais. `plan` resolve dependências e
mostra a ordem dos componentes, sem executar comandos. `--server` seleciona a
edição Server e `--json` produz saída estruturada. Entradas inválidas retornam
código 2; em JSON, o erro vai para stderr com código `ENTRADA_INVALIDA`.
A prévia ainda não inclui comandos de instalação ou verificações do host.

## Estado SQLite

`src/core/state.ts` oferece `StateStore` com abertura explícita para escrita.
A abertura padrão é somente leitura e recusa banco inexistente sem criar
pastas. Arquivos de banco usam permissão 0600; novas pastas usam 0700.
Links simbólicos no caminho final são recusados.

A primeira migração cria a tabela de operações e um índice que permite apenas
uma operação em execução. O banco usa WAL e espera até três segundos por
locks SQLite. Schemas futuros são recusados sem rebaixamento.

`start` registra uma operação; `finish` aceita sucesso, falha, cancelamento ou
interrupção somente enquanto ela está em execução. `list` consulta até mil
registros. `close` libera a conexão. A reconciliação automática, os registros
por componente, o backup consistente e o banco de métricas continuam pendentes.

## Executor de operações

`executeSteps` recebe estado gravável, etapas com executável e argumentos
separados e confirmação explícita. Sem confirmação, nenhuma operação é
registrada. A execução para na primeira falha e mantém o resultado terminal
no SQLite. Etapas seguintes não são iniciadas.

Cada subprocesso usa stdin fechado e saída descartada. Essa escolha evita
registrar segredos enquanto a camada de filtragem de logs está pendente.
O timeout padrão é cinco minutos por etapa, configurável até uma hora.
Cancelamento usa AbortSignal. Em Unix, o executor sinaliza o grupo do processo
com SIGTERM e prevê SIGKILL após 250 ms se o processo continuar ativo.

Os testes usam processos Bun controlados para verificar confirmação, falha,
timeout, cancelamento e argumentos literais. A integração com adaptadores,
a persistência de etapas e a comprovação de encerramento de descendentes
resistentes a sinais continuam pendentes.

## Interface OpenTUI inicial

`bun run dev` abre a interface quando stdin e stdout são terminais. Sem TTY,
o comando mostra ajuda. O shell usa OpenTUI Core diretamente, com seis áreas:
Home, Aplicativos, Serviços, Métricas, Histórico e Sobre.

Setas horizontais alternam áreas; teclas de 1 a 6 selecionam diretamente.
Esc retorna à Home e Ctrl+Q encerra a interface. Aplicativos consulta o catálogo
embarcado para Desktop. As demais integrações operacionais estão pendentes.
Ainda faltam foco entre controles, mouse, busca, rolagem, revisão do plano e
ações de instalação. O shell inicial não representa a TUI final homologada.

Os testes renderizam o backend nativo OpenTUI em 80x24, 129x44 e 160x50,
conferindo cabeçalho, saída e troca para Sobre.

## Consulta de histórico

`bun run dev history` mostra operações registradas; `--json` retorna uma
lista estruturada. A aba Histórico consulta a mesma função quando selecionada.
Banco ausente produz lista vazia sem criar diretório. Corrupção e schema
incompatível são apresentados como erro, preservando o arquivo.

O caminho padrão é `$XDG_STATE_HOME/setupvibe/state.db` quando XDG_STATE_HOME
é absoluto, ou `~/.local/state/setupvibe/state.db`. Para ambientes isolados,
SETUPVIBE_STATE_DIR define um diretório absoluto que contém state.db.
A consulta retorna até cem operações. Paginação e detalhes por etapa ainda
precisam ser implementados.

### Seleção de aplicativos

A área Aplicativos agora usa uma lista OpenTUI com rolagem e painel lateral
de detalhes. Setas verticais percorrem os itens. Enter adiciona ou remove o
componente da seleção, mantida ao trocar de área. P apresenta a prévia com
dependências resolvidas pelo mesmo planejador do CLI. Essa revisão ainda não
oferece execução. Busca, filtros e adaptação do painel estreito estão pendentes.

### Busca e foco

Na área Aplicativos, / foca a busca por nome, ID ou categoria. Tab alterna
entre busca e lista; Enter na busca retorna à lista. A seleção permanece
preservada ao filtrar. Uma busca sem resultados mostra uma mensagem no painel.
O teste de interação digita node, seleciona Node.js e confere mise na revisão.

### Resumo da Home

A Home mostra quatro indicadores calculados do catálogo: disponíveis,
selecionados, runtimes e serviços. Esses valores representam o catálogo e a
seleção atual, sem afirmar instalação ou saúde no host. A lista marca os
componentes escolhidos e mantém a linha atual ao atualizar a seleção.

### Etapas persistidas

O schema 2 acrescenta etapas vinculadas à operação, com estado, horários e
código de saída. O executor registra início e término de cada subprocesso.
Comandos e argumentos não são armazenados nessa tabela. `steps` permite
consultar os resultados após reabrir o banco. A migração é feita somente na
abertura explícita para escrita e preserva a tabela de operações existente.

### Detalhes de uma operação

`bun run dev history <id> --json` retorna a operação e suas etapas, incluindo
estado e código de saída. Sem JSON, mostra uma linha por etapa. ID inexistente
retorna código 2. A consulta busca o ID diretamente, mesmo fora dos cem
registros mais recentes. Bancos do schema 1 continuam consultáveis e retornam
lista vazia de etapas até a próxima abertura explícita para migração.

## Métricas locais

A aba Métricas apresenta memória, uptime e CPU por diferenças entre leituras.
Ctrl+U atualiza a área. A primeira leitura de CPU é indisponível, pois exige
uma referência anterior. Reinício dos contadores ou mudança no número de CPUs
descarta a referência. Memória vem das APIs do sistema e usa GiB na interface.
Essa leitura local ainda não substitui o coletor independente; persistência,
retenção, swap, discos e containers permanecem pendentes.

### Banco de métricas

`MetricsStore` usa um arquivo SQLite separado do estado de operações. Escrita
explícita habilita WAL, timeout de três segundos e permissões privadas.
`append` valida horário e valores, grava a amostra e remove registros com mais
de sete dias na mesma transação. CPU indisponível permanece null.

`list` recebe cursor numérico, limite de até mil itens e relógio de referência.
A consulta retorna IDs monotônicos e amostras ainda dentro da retenção. Banco
inexistente não é criado por consulta. O processo periódico e a supervisão
systemd/launchd ainda precisam ser integrados.

### Consulta de métricas no CLI

`bun run dev metrics [cursor] --json` lê metrics.db no mesmo diretório do
estado e retorna samples e nextCursor. O cursor é um inteiro não negativo.
Cada consulta retorna até cem amostras; repetir com nextCursor busca as
seguintes. Banco ausente retorna lista vazia sem criar arquivos. Sem JSON,
a saída mostra horário, CPU e memória. CPU null aparece como indisponível.

### Processo do coletor

`bun run coletor [intervalo-ms]` inicia o processo dedicado de coleta. O padrão
é 5000 ms; valores entre 100 e 3600000 ms são aceitos. Iniciar esse comando
autoriza a criação de metrics.db no diretório de estado configurado. SIGINT e
SIGTERM interrompem a espera e fecham a conexão. O processo é independente da
TUI e deve ser iniciado separadamente nesta fase.

Os testes executam coleta real com intervalo curto em diretório temporário.
Exclusão mútua entre coletores, supervisão systemd/launchd, detecção de suspensão
e integração com a distribuição continuam pendentes.

### Origem e validade na TUI

A aba Métricas prefere a última amostra persistida pelo coletor. Leituras com
mais de quinze segundos são identificadas como antigas. Sem amostra dentro
da retenção, a tela usa leitura local e informa essa origem. Banco inválido
mostra erro em vez de substituir silenciosamente a leitura. Ctrl+U consulta
novamente. O limite de validade ainda precisa acompanhar o intervalo configurado
do serviço quando a supervisão for integrada.

### Exclusão entre coletores

Antes de abrir metrics.db para gravação, o coletor adquire uma transação
SQLite no arquivo auxiliar metrics.db.collector-lock. Uma segunda instância
é recusada imediatamente. O arquivo pode permanecer após a parada; a posse
depende da conexão e da transação, sem usar a existência do arquivo como sinal
de processo ativo. Fechamento normal e término abrupto liberam o lock.

Os testes incluem um subprocesso encerrado com SIGKILL e confirmam que outro
coletor consegue adquirir o mesmo lock depois da saída.

### Pausas entre leituras

O sampler descarta a referência de CPU se o relógio retroceder ou a pausa
ultrapassar o limite permitido. No coletor, esse limite é três vezes o intervalo
configurado. A leitura seguinte retorna CPU null e estabelece uma referência
nova. Na leitura local da TUI, o limite padrão é quinze segundos. Memória e
uptime continuam disponíveis durante a renovação da referência.

## Descoberta Docker

A área Serviços consulta docker ps com todos os containers e formato JSON por
linha. A consulta usa argumentos separados, timeout de três segundos e limite
de saída de 2 MiB. A tela distingue daemon indisponível de lista vazia e mostra
nome, estado, imagem e portas. Ctrl+U atualiza os dados. Uma resposta de consulta
antiga é descartada quando a pessoa troca de área ou inicia outra atualização.

Essa descoberta não assume propriedade dos containers nem oferece controle.
Inspeção de labels, saúde, logs, Swarm e operações gerenciadas estão pendentes.

### Edição da interface

`bun run dev --server` abre a TUI Server quando executado em terminal. O
cabeçalho de ambiente identifica a edição e o catálogo oferece somente os
seis componentes comuns. A revisão usa a mesma edição para resolver planos.
Sem TTY, esse comando mostra ajuda. Server em macOS é recusado antes de criar
o renderer. A TUI Desktop continua sendo o padrão sem argumentos.

### Retorno da revisão

Enquanto a prévia está aberta, a seleção fica suspensa. Esc retorna à lista
preservando os componentes escolhidos. Fora da revisão, Ctrl+D limpa a seleção
explicitamente. O teste de teclado verifica revisão, retorno e limpeza.

## Adaptador mise inicial

`miseInstallSteps` produz argumentos de instalação para runtimes Desktop com
versão numérica explícita. Recusa Server, runtimes desconhecidos e seletores
móveis. O comando usa mise install, sem mise use e sem escrever configurações
de projeto. Essa função ainda precisa das verificações de proprietário,
instalação existente, integridade e ativação global antes da integração à
execução oferecida pelo produto.

Referência: [mise install](https://mise.jdx.dev/cli/install.html).

### Consistência do encerramento

Uma operação não pode receber sucesso enquanto houver etapa em execução.
Falha, cancelamento ou interrupção encerram as etapas ativas na mesma transação
da operação, preservando códigos de saída ausentes como null. A migração do
schema 1 mantém o histórico existente e acrescenta a tabela de etapas.

### Descendentes durante cancelamento

O executor aguarda a tentativa de SIGKILL do grupo após o período de graça,
mesmo quando o processo principal termina primeiro. Um teste Linux cria um
descendente que ignora SIGTERM e comprova seu término após cancelamento.
Essa verificação específica usa procfs e não representa homologação macOS.

### Backup do estado

`StateStore.backup` exporta um snapshot consistente com a serialização SQLite
do Bun, incluindo registros ainda presentes no WAL. O destino é criado com
permissão 0600 e abertura exclusiva; arquivos existentes são recusados.
O diretório de destino precisa existir. O snapshot é montado em memória, de
modo que o consumo cresce com o tamanho do banco. A interface de restauração
e o comando público de backup ainda precisam ser integrados.

### Descoberta de runtimes mise

`discoverMise` consulta mise ls --installed --json com timeout de três segundos
e saída limitada a 2 MiB. O resultado contém runtime, versão, caminho e estado
de ativação. Instalações descobertas continuam externas até comprovação de
propriedade pelo SetupVibe. Executável ausente ou resposta inválida retorna
indisponibilidade, sem presumir que não existam runtimes no ambiente.

Referência: [mise ls](https://mise.jdx.dev/cli/ls.html).

### Relógio e consultas persistidas

As consultas limitam as amostras ao período entre sete dias atrás e o horário
atual. Uma regressão do relógio oculta registros que ficaram temporariamente
no futuro, sem removê-los. Quando o relógio alcança esses registros novamente,
eles voltam a participar das consultas dentro da retenção.

## Planejamento inicial de serviços

`planDockerService` produz argumentos docker create para Redis e Mailpit na
Desktop. Exige imagem identificada por digest SHA-256 e publica portas apenas
em loopback. Redis exige volume com nome gerenciado. Nomes existentes e portas
ocupadas informadas pela descoberta impedem o plano. Nenhum container é criado
por essa função. PostgreSQL permanece recusado até integrar credenciais por
canal protegido. A inspeção de propriedade dos volumes, conflitos reais de bind,
verificação do digest remoto e execução ainda precisam ser integradas.

### Espaço em disco

As amostras incluem capacidade, espaço disponível ao usuário e espaço usado
do filesystem consultado. O coletor consulta o diretório que contém metrics.db;
a leitura local usa a raiz. A TUI apresenta usado e total em GiB. Falha de
acesso ou contadores fora da precisão numérica disponível retorna disk null.
Registros anteriores sem esse campo continuam legíveis. A descoberta de todos
os pontos de montagem e alertas por volume ainda está pendente.

### Swap Linux

O coletor e a leitura local incluem swap obtido de /proc/meminfo no Linux.
Os valores são convertidos de kB para bytes; swap desabilitado permanece zero.
Fonte ausente, unidade inesperada ou contadores contraditórios retornam null.
A TUI mostra usado e total em GiB. A implementação de swap macOS permanece
pendente e aparece como indisponível, sem estimativa artificial.

### Serviços no CLI

`bun run dev services --json` reutiliza a descoberta Docker da interface e
retorna available e containers. Sem Docker acessível, retorna available false
e código de saída 3. Uma consulta válida sem containers retorna lista vazia e
código zero. Sem JSON, mostra nome, estado e imagem. O comando não cria,
inicia, interrompe ou assume propriedade de containers.

## Diagnóstico do ambiente

`bun run dev doctor --json` reúne platform, edição, descoberta Docker e
instalações mise. As consultas são executadas em paralelo, com os limites dos
respectivos adaptadores. Na Server, mise retorna null porque runtimes ficam
fora dessa edição. A saída mantém homologated false até homologação real da
matriz. O diagnóstico não instala ferramentas nem cria estado.

Sem JSON, o comando mostra disponibilidade e platform em texto. Código zero
indica diagnóstico executado; disponibilidade de cada integração deve ser
consultada no respectivo campo. Falhas de entrada continuam retornando 2.

### Diagnóstico na Home

Ctrl+U na Home consulta Docker e mise e apresenta contagens de containers e
versões instaladas. A consulta começa somente pela ação explícita e exibe
carregamento. Trocar de área invalida a resposta pendente. Os resultados não
representam adoção de recursos existentes nem homologação da platform.

### Validação de disco e swap

A gravação recusa valores negativos, não inteiros ou fora da precisão segura
para disco e swap. Uso e disponibilidade não podem exceder o total informado.
Campos indisponíveis permanecem null; swap desabilitado aceita total e uso zero.
Uma amostra recusada não produz registro parcial no banco.

## Integridade de artefatos

`verifyArtifact` calcula SHA-256 por streaming e compara com o digest esperado.
Links simbólicos e arquivos especiais são recusados. O digest precisa vir de
fonte confiável; a comparação não autentica sozinha a origem do manifesto.
`artifactUrl` exige HTTPS, sem credenciais ou fragmento. O downloader ainda
precisa validar redirecionamentos, impor limites e integrar staging, instalação
atômica e recuperação. Nenhum download ou instalação ocorre nessas funções.

### Abertura do artefato

A verificação abre o arquivo com O_NOFOLLOW e lê pelo mesmo descritor até o
fim. A abertura não bloqueante permite recusar tipos especiais sem aguardar
um produtor de dados. Tamanho e horários de alteração são comparados antes e
depois da leitura. O instalador ainda deverá consumir o artefato validado a
partir de staging privado, evitando troca de caminho depois da verificação.

### Medidores de utilização

A área Métricas inclui barras textuais de memória e disco, acompanhadas dos
valores em GiB. Os medidores mostram percentual calculado apenas para dados
válidos. Capacidade ausente ou incoerente aparece como indisponível; consumo
zero válido continua visível como 0%. As barras não dependem apenas de cor.

### Paginação interna do histórico

`StateStore.page` recebe limite e cursor opcional e retorna operações e
nextCursor. A ordenação decrescente usa horário de início e ID como desempate.
O cursor é validado e aplicado por parâmetros SQL. O limite máximo é mil
registros. A exposição de paginação no CLI e nos controles da TUI continua
pendente; a consulta simples existente permanece disponível.

### Histórico paginado no CLI

`bun run dev history-page [cursor] --json` retorna operations e nextCursor,
com até cem operações por página. Repita o comando com o cursor retornado até
nextCursor ser null. Sem JSON, a saída inclui o cursor seguinte ou informa o
fim do histórico. Cursor inválido retorna código 2, inclusive quando o banco
não existe. O comando history por ID permanece disponível para detalhes.

### Navegação do histórico na TUI

A aba Histórico consulta oito operações por página. N avança quando existe
cursor seguinte; B retorna à página anterior. Ctrl+U volta à página mais
recente. A navegação consulta o banco sem criar estado. Os testes usam dez
operações temporárias e verificam avanço e retorno pelo teclado.

### Eventos de execução

`executeSteps` aceita onEvent para acompanhar início da operação, início e
fim de etapa e fim da operação. Eventos são emitidos após a persistência da
transição correspondente e contêm IDs, estado e código de saída, sem comandos
ou argumentos. Falhas do observador são isoladas da execução. A apresentação
NDJSON e a integração de progresso na TUI ainda precisam ser conectadas.

## Runtimes no CLI

`bun run dev runtimes --json` retorna available e installations a partir do
mise. Sem JSON, mostra runtime, versão, ativação e caminho. mise indisponível
retorna código 3; lista vazia válida retorna zero. A edição Server recusa o
comando com código 2. Consultar instalações não altera versões nem configurações
e não transfere sua propriedade para o SetupVibe.

### Download verificado

`downloadArtifact` exige HTTPS e checksum esperado, com timeout padrão de um
minuto e limite de 256 MiB. Redirecionamentos são recusados. O conteúdo é gravado
em staging privado no diretório de destino e disponibilizado por criação
exclusiva somente após sincronização e verificação. Destino existente é
preservado; falhas removem o staging. O diretório pai precisa existir.
O downloader é consumido por prepareRelease e pelo atualizador do produto.

### Manifesto de distribuição

`parseManifest` valida versão e lista de artefatos por sistema e arquitetura,
com URL HTTPS e SHA-256. Campos desconhecidos, plataformas duplicadas e versões
móveis são recusados. `selectArtifact` exige uma correspondência exata com a
platform selecionada. Validação estrutural não autentica o manifesto; origem
confiável é conferida pelo resolvedor HTTPS oficial no atualizador. Os builds
estão integrados; publicação e assinatura independente continuam fora desta entrega.

### Interrupção do corpo HTTP

O timeout cancela também a leitura do corpo, mesmo quando os cabeçalhos já
chegaram. Streams interrompidos ou que deixam de entregar dados não publicam
o destino e removem o staging. Os testes simulam corpo travado e erro durante
a leitura, sem depender de rede externa.

### Preparação integrada da release

`prepareRelease` recebe manifesto confiável, platform e diretório existente.
Seleciona o artefato compatível, baixa com os limites configurados e verifica
seu checksum. O resultado identifica versão, caminho, digest e platform.
Plataforma ausente é recusada antes do download. O arquivo recebe nome derivado
de versão e platform. Essa preparação não executa o conteúdo nem substitui
a instalação atual. Ativação, rollback e builds são compostos pelo instalador
e pelo atualizador descritos adiante.

## Filtragem de segredos conhecidos

`SecretRedactor` recebe os valores secretos que a operação conhece e substitui
suas ocorrências por uma marca textual. Mantém um sufixo entre blocos para
reconhecer valores divididos na saída do processo. `flush` libera o restante
ao encerrar a fonte. Segredos maiores têm prioridade sobre valores contidos.
Essa filtragem não descobre segredos desconhecidos ou transformados; a captura
de logs do executor ainda precisa integrar limites e essa camada antes de
persistir qualquer saída.

### Ajuda contextual

? abre a ajuda da área atual, com atalhos globais e ações específicas.
Esc fecha a ajuda e retorna à mesma área. Na busca, ? continua disponível
como texto de pesquisa. A ajuda suspende a navegação da lista e invalida
consultas pendentes para evitar que uma resposta substitua suas instruções.

## Builds locais

`bun run build` compila o CLI em dist/setupvibe. `bun run build:coletor`
compila a entrada independente em dist/setupvibe-coletor. Os artefatos são
específicos da platform de build. A compilação do CLI foi executada no Linux
x64: versão, catálogo Server e abertura da TUI em PTY funcionaram, com saída
por Ctrl+Q. Isso não homologa outras plataformas nem a instalação completa.
O coletor também foi compilado no Linux x64. Em diretório de estado isolado,
gravou cinco amostras, encerrou por SIGTERM com código zero e produziu banco
consultável pelo CLI. Uma tentativa anterior em /tmp encontrou ENOSPC; o build
no diretório dist do repositório funcionou. Os temporários foram removidos.

## Unidade systemd do coletor

`systemdCollector` gera uma unidade de usuário para o executável compilado,
com diretório de estado absoluto e intervalo explícito. A unidade define
reinício após falha, UMask 0077, NoNewPrivileges e prazo de parada de dez
segundos. Caminhos com controles são recusados e especificadores são escapados.
A geração não instala nem habilita serviços. A sintaxe foi verificada por
systemd-analyze --user verify; execução supervisionada e launchd permanecem
pendentes.

### LaunchAgent macOS

`launchdCollector` gera plist com ProgramArguments separados, diretório de
estado no ambiente, início ao carregar e reinício após saída malsucedida.
O XML escapa caracteres dos caminhos e define umask 0077 em valor decimal 63.
A geração não grava em LaunchAgents nem chama launchctl. Testes locais cobrem
a estrutura e o escape; validação plutil e execução no macOS estão pendentes.

### Prévia da supervisão no CLI

`bun run dev preview-collector /caminho/absoluto/do/coletor --json` retorna formato,
conteúdo e installed false. Linux gera unidade systemd de usuário; macOS gera
LaunchAgent. O diretório de estado segue a configuração do processo e o
intervalo inicial é cinco segundos. Sem JSON, imprime o arquivo de configuração.
A prévia não verifica existência do executável, não grava arquivo e não
habilita serviço. O caminho deve apontar ao coletor compilado na instalação.

### Caminhos systemd

A geração systemd recusa dólar no caminho do executável para evitar semântica
de expansão em ExecStart. No diretório de estado, o dólar permanece literal na
diretiva Environment. Espaços e especificadores percentuais seguem o escape
do formato da unidade. Essa restrição não se aplica ao ProgramArguments launchd.

### Entradas externas de platform

A validação de platform recusa edição desconhecida e objeto ausente mesmo
quando a entrada não passou pelo TypeScript. O catálogo também exige todos os
campos obrigatórios e recusa listas malformadas ou duplicadas. Esses controles
não substituem a detecção de distribuição e versão do sistema, ainda pendente.

## Identificação Linux

`parseOsRelease` interpreta ID e VERSION_ID como dados e recusa duplicados,
valores incompletos e construções de shell. `validateLinuxRelease` aceita a
matriz pretendida Debian 12/13 e Ubuntu 24.04. Distribuições derivadas não são
presumidas compatíveis por ID_LIKE. A integração dessa identificação aos
prechecks dos instaladores e a verificação de versão macOS continuam pendentes.

### Distribuição no diagnóstico

O diagnóstico Linux lê /etc/os-release e retorna release, supported e error no
campo linux. Sistemas fora da matriz continuam consultáveis e são identificados
como não previstos, sem receber homologação. No macOS, linux é null. Falha de
leitura não é convertida em distribuição presumida. O CLI textual também
apresenta distribuição e compatibilidade pretendida.

### Prévia de runtime no CLI

`bun run dev plan-runtime node 24.1.0 --json` mostra as etapas produzidas pelo
adaptador mise e executed false. O comando exige runtime permitido, versão
numérica explícita e edição Desktop. Sem JSON, imprime a prévia dos argumentos.
Essa consulta funciona mesmo sem mise instalado e não verifica disponibilidade
da versão remota. Execução, propriedade e ativação global ainda estão pendentes.

## Registro de propriedade

O schema 3 inclui managed_components, com ID, versão, localização e operação
de instalação associada. `registerManaged` exige operação concluída com sucesso
e recusa sobrescrever componente já registrado. `managed` retorna null quando
não existe comprovação local de propriedade. A descoberta de uma ferramenta
no host não cria esse registro. Os adaptadores ainda precisam comparar esse
registro com arquivos e recursos reais antes de atualizar ou remover.

### Reconciliação mise

`reconcileMise` compara instalações descobertas com versão e caminho registrados.
Sem registro, qualquer versão presente do runtime é preservada como externa.
Com registro, ausência ou divergência de caminho impede a operação. A função
classifica instalação nova, versão atual ou atualização; versão alvo já presente
fora da instalação gerenciada também é recusada. A integração transacional entre
execução, verificação posterior e atualização do registro permanece pendente.

### Prévia com descoberta e propriedade

`preview-runtime <runtime> <versao> --json` combina validação de entrada,
descoberta mise e registro de propriedade. Retorna ação e etapas sem executar.
Instalação externa ou divergência do registro impede a prévia; mise indisponível
também impede presumir ambiente vazio. Banco ausente não é criado. O comando
plan-runtime permanece uma consulta apenas dos argumentos do adaptador.

### Entrada por stdin

Uma etapa pode fornecer input ao subprocesso por stdin. O executor fecha o
canal depois de enviar o conteúdo e não inclui esse valor em eventos ou no
SQLite. Sem input, stdin é fechado vazio. O adaptador precisa usar esse canal
somente quando o comando de destino oferecer leitura protegida por stdin;
credenciais não devem ser copiadas para args. A coleta interativa de segredos
no CLI e na TUI ainda precisa ser integrada.

## Versão da aplicação

O package.json é a fonte da versão da aplicação Bun. O módulo src/version.ts
compartilha esse valor com --version e a área Sobre, incluindo os builds
compilados. Os scripts publicados da geração anterior mantêm seu versionamento
próprio. Preparar uma release da v2 ainda exige changelog, artefatos e validação
completa antes de publicação autorizada.

### Abas por mouse

As seis áreas usam controles OpenTUI separados e aceitam clique do mouse.
A aba ativa usa fundo ciano e texto escuro do contrato visual. Atalhos por
números e setas continuam disponíveis. O teste nativo clica em Aplicativos e
confere a mudança para a lista e o painel de detalhes.

### Logs filtrados do executor

`onLog` recebe ID da etapa, fluxo e texto após filtragem dos segredos conhecidos.
stdout e stderr têm filtros independentes e limite de 65536 caracteres entregues
por fluxo e etapa. O conteúdo restante é drenado e descartado para não travar o
processo. O valor completo de input também entra na lista de segredos. Cabe ao
adaptador informar valores individuais quando input contém várias credenciais.
Esses logs ainda não são persistidos nem apresentados na TUI.

### Rolagem dos painéis

Detalhes, revisão, ajuda e consultas usam ScrollBox OpenTUI com rolagem vertical
e scrollbar. PageDown e PageUp deslocam o painel; o mouse usa a rolagem nativa.
Trocar de área retorna ao topo. A lista de aplicativos mantém sua rolagem
própria, enquanto o painel de leitura contém textos maiores que a viewport.

### Atualização da propriedade

`updateManaged` exige operação concluída com sucesso e compara versão e caminho
anteriores antes de substituir o registro. Divergência recusa a atualização sem
alterar a propriedade atual. Essa comparação protege o registro contra escrita
obsoleta; o adaptador ainda precisa verificar o recurso real e a instalação
concluída antes de chamar o método.

### Versão macOS no diagnóstico

No macOS, o diagnóstico consulta sw_vers -productVersion com timeout de três
segundos. O campo macos informa versão, suporte pretendido a partir da versão
14 e eventual erro de leitura. Em outros sistemas, esse campo é null. O parser
foi testado no ambiente atual; a execução real no macOS permanece pendente.
A versão do kernel Darwin não é usada como substituta da versão do produto.

## Precheck de instalação

`installationPreflight` valida edição, arquitetura e identificação do sistema
antes de alterações. Linux exige Debian 12/13 ou Ubuntu 24.04; macOS exige
versão 14 ou superior. Identificação ausente impede presumir compatibilidade.
A prévia preview-runtime aplica esse precheck antes da descoberta mise.
Consultas gerais continuam disponíveis fora da matriz. Precheck aprovado não
representa homologação de instalação e não substitui verificações do componente.

## Instalação integrada de runtime

`installRuntime` exige confirmação, executa a prévia com descoberta e matriz,
usa o executor e consulta mise novamente para confirmar a versão instalada.
Somente após essa verificação registra propriedade ou compara o registro
anterior para atualizar. Versão já atual retorna sem executar instalação.
Essa função ainda não está exposta no CLI ou na TUI. Os testes atuais cobrem
recusa sem confirmação e verificação posterior do executor; instalação real
em ambiente isolado e ativação global ainda precisam ser homologadas.

### Instalação de runtime no CLI

`install-runtime <runtime> <versao> --confirm --json` executa o fluxo mise
com precheck, preservação de instalações externas e verificação posterior.
Exige mise previamente disponível. Sem confirmação retorna 2 antes de criar
estado. SIGINT/SIGTERM cancelam a operação; cancelamento retorna 130, falha de
execução retorna 1 e sucesso ou versão atual retorna zero. O teste integrado
usa mise controlado temporário, sem baixar ferramentas. A instalação com
fornecedor real e a ativação global ainda precisam ser homologadas.

### Eventos NDJSON da instalação

`install-runtime <runtime> <versao> --confirm --events` emite uma linha JSON
por evento do executor e uma linha final com type result. Eventos têm type
event e um campo event com transição e IDs. O resultado final vem após o
registro de propriedade. Eventos de operação concluída descrevem o executor;
consumidores devem aguardar a linha result para considerar o fluxo completo.
Erros anteriores ao resultado são estruturados em stderr. --json sem --events
continua retornando somente o resultado final.

### Falhas verificadas da instalação integrada

Os testes com mise controlado cobrem comando com saída zero sem versão instalada:
a operação termina em falha e nenhum componente é registrado como gerenciado.
Também cobrem runtime externo encontrado antes da execução: a instalação é
recusada sem criar banco de estado. Esses cenários não substituem testes com
downloads e fornecedores reais em ambiente isolado.

### Concorrência do fluxo de runtime

A instalação mantém lock SQLite auxiliar desde antes da descoberta até o
registro final de propriedade. Uma segunda instalação usando o mesmo estado
é recusada antes de consultar mise. O lock é liberado no finally e após queda
do processo, pela conexão SQLite. Sem confirmação ou com sinal já cancelado,
o fluxo não adquire esse lock. Após confirmação, o arquivo auxiliar pode
permanecer mesmo quando a descoberta recusa a instalação.

### Versão de runtime na TUI

Na lista Aplicativos, V abre a entrada de versão quando o item usa mise.
Enter consulta matriz, instalações existentes e propriedade e apresenta ação
e argumentos previstos. Esc cancela a entrada ou retorna da revisão sem
executar instalação. A consulta pendente é invalidada ao sair da revisão.
A instalação por confirmação na TUI ainda precisa ser conectada.

### Confirmação de runtime na TUI

Depois de uma prévia válida de runtime, C abre a confirmação. É necessário
digitar INSTALAR e pressionar Enter. O fluxo repete descoberta, matriz e
propriedade antes de executar e mostra eventos e resultado. Esc ou Ctrl+Q
durante execução solicita cancelamento; a interface permanece aberta para
mostrar o resultado. Abas ficam suspensas durante a operação. Versão já atual
não oferece instalação. O fluxo visual completo com fornecedor real ainda
precisa de homologação isolada; os testes existentes não comprovam essa entrega.

### Teste do fluxo visual de runtime

O teste OpenTUI percorre busca por Node.js, entrada de versão, prévia e
confirmação com instalador controlado. Confirmação parcial não chama instalação;
INSTALAR completo chama uma vez e apresenta resultado. Esse teste comprova a
interação, sem baixar runtimes ou substituir homologação do fornecedor real.

### Cancelamento visual verificado

O teste de instalação controlada confirma que a TUI mantém a área durante a
operação, recusa troca de aba e envia cancelamento por Esc. Depois do término,
a tela apresenta cancelled e o ID da operação. A validação não executa mise
real nem modifica runtimes do host.

### Identidade e controle Docker

`inspectContainer` consulta um ID explícito com timeout e limite de saída.
A identidade inclui ID completo, nome, imagem e label de gerenciamento.
`containerControl` produz argumentos start, stop ou restart somente quando a
label está presente e o ID coincide com o registro esperado. Nome com prefixo
SetupVibe não comprova propriedade. A execução desses controles e seu registro
na interface ainda precisam ser integrados.

### Gravação da configuração do supervisor

`writeCollectorConfig` exige confirmação, destino absoluto e executável regular
com permissão de execução. Grava em staging privado e cria o destino de forma
exclusiva após sincronizar o conteúdo. Arquivos existentes são preservados e o
staging é removido. Essa função não chama systemctl ou launchctl; ativação e
atualização de configurações gerenciadas ainda precisam ser integradas.

### Gravação pelo CLI

`write-collector <executavel> <destino> --confirm --json` grava a configuração
para o supervisor do sistema atual. Executável e destino devem ser absolutos;
o diretório de destino precisa existir. Retorna written true e activated false.
Sem confirmação, recusa antes de acessar o destino. O comando preserva arquivos
existentes e não habilita serviço. A instalação no caminho canônico e a ativação
supervisionada ainda precisam ser integradas ao fluxo do produto.

### Controle gerenciado no núcleo

`controlManagedContainer` exige confirmação, componente registrado com localização
/docker/ID e inspeção que confirme label gerenciada e o mesmo ID. O comando de
controle é executado pelo executor e registrado como operação. Ainda não está
exposto no CLI ou na TUI. A criação do registro pelo instalador, verificação de
estado após start/stop e testes com daemon isolado permanecem pendentes.

### Verificação após controle Docker

O fluxo gerenciado inspeciona novamente o container depois do comando. Start
e restart exigem Running true; stop exige Running false. Estado ausente não
é tratado como parado. A identidade e a label são conferidas novamente antes
de concluir a operação. Saúde da aplicação e readiness são verificações
separadas, ainda pendentes junto aos testes com daemon isolado.

### Controle de serviço no CLI

`control-service <componente> <start|stop|restart> --confirm --json` usa o
registro local e a inspeção Docker para executar uma operação gerenciada.
Sem confirmação ou ação válida retorna 2. O resultado inclui operação e etapas;
falha retorna 1 e cancelamento retorna 130. Recursos sem registro são recusados.
O instalador de serviços ainda precisa produzir os registros de containers e
a homologação com daemon isolado permanece pendente.

### Teste integrado de controle Docker

Um executável Docker controlado permite testar start e stop com inspeção
posterior e estado persistido. O cenário de restart com saída zero sem alterar
o estado termina em falha. O teste não usa daemon nem containers reais; a
homologação com Docker isolado continua necessária.

### Etapa de verificação posterior

Quando o executor recebe verify, registra uma etapa reservada chamada __verify,
com eventos de início e término. Falha dessa etapa distingue comando concluído
de resultado não confirmado. O código de saída fica null porque a verificação
é uma função do adaptador. Etapas fornecidas pelo chamador não podem usar esse
ID reservado. O resultado final e o histórico incluem essa verificação.

### Ativação systemd no núcleo

`activateSystemdCollector` exige confirmação, arquivo regular com conteúdo
igual ao gerado e diretório systemd de usuário canônico. Executa daemon-reload,
enable --now e is-active pelo executor, com registro de etapas. A função ainda
não está exposta nas interfaces. Os testes cobrem recusas sem chamar systemctl;
ativação real em ambiente isolado e recuperação de falha continuam pendentes.

### Reconciliação após queda

O executor mantém lock SQLite auxiliar durante toda a operação. Antes de iniciar
uma nova execução, adquire esse lock e marca operações e etapas ainda running
como interrupted. Uma execução ativa impede essa reconciliação. O mecanismo não
retoma comandos nem presume sucesso ou reversão de alterações parciais; os
adaptadores precisam descobrir novamente o estado real dos recursos.

### Ponteiro local de release

`activateRelease` exige confirmação e artefato dentro do diretório gerenciado.
Cria link temporário e troca current por rename, retornando o destino anterior
para rollback. Arquivo regular no lugar de current é preservado como externo.
Os testes cobrem troca e retorno à versão anterior. A função pressupõe diretório
privado sob controle do instalador. O núcleo self-update acrescenta os recibos,
checksum, lock compartilhado e journal antes de usar essa primitiva.

### Atualização do executável

O núcleo self-update consulta o manifesto de uma versão fixa no release
oficial, confere os assets esperados e valida a instalação registrada pelo
bootstrap. updateSelf preserva o launcher, baixa para o mesmo filesystem e
verifica SHA-256 e --version antes de ativar current.

### Journal e rollback compartilhados

O registro pendente é sincronizado antes de trocar current e promovido ao
registro aplicado depois da ativação. Se o processo parar entre essas etapas,
o leitor compara o ponteiro e os hashes para identificar o estado real.
rollbackSelf usa o executável anterior registrado e verificado, sem rede.
Uma tentativa preparada que não ativou o novo arquivo não substitui o
rollback da última atualização aplicada.

### Ativação pelo bootstrap

Ao trocar versão já instalada, o bootstrap termina seu staging e delega a
ativação ao comando activate-release. O núcleo usa o hash explícito e o cache
registrado; não baixa arquivos nesse caminho. Bootstrap e atualização usam
o mesmo lock, recibos e journal, incluindo o rollback posterior pela CLI.

### Estados na interface

A TUI traduz estados e eventos conhecidos para português, incluindo Concluído,
Falhou, Cancelado e Interrompido. O histórico e a revisão usam a mesma tradução.
Os códigos persistidos no SQLite e retornados em JSON continuam estáveis para
automação. Valores futuros sem tradução permanecem visíveis pelo código original.

## Verificação Tailscale

O diagnóstico consulta tailscale version com timeout e limite de saída. Retorna
cliente disponível e versão, sem presumir autenticação, saúde do daemon ou
conectividade da tailnet. Não consulta peers e não altera configuração de rede.
Instalação e atualização restritas ao escopo do produto ainda estão pendentes.
Referência: [CLI oficial Tailscale](https://tailscale.com/docs/reference/tailscale-cli).

### Bind local no precheck de serviços

`checkLocalPort` testa bind TCP em 127.0.0.1 e fecha o listener imediatamente.
`previewDockerService` combina essa leitura com nomes de containers descobertos
antes de produzir argumentos. Docker indisponível impede presumir ausência de
conflito. O teste de porta é momentâneo; a criação real ainda deve tratar a
possibilidade de outro processo ocupar a porta entre precheck e execução.

## Criação integrada de serviço

`installService` integra inicialmente Mailpit: exige confirmação, imagem do
catálogo por digest, precheck do sistema, descoberta de conflitos, pull e create.
A verificação posterior confere identidade, imagem e label antes de registrar
propriedade. O container é criado parado; controle gerenciado pode iniciá-lo
posteriormente. Redis e PostgreSQL continuam recusados até concluir volumes e
credenciais. Testes atuais cobrem recusas; criação com daemon isolado, rollback
de falha parcial e exposição na interface ainda estão pendentes.

## Identidade de volumes Docker

`inspectVolume` consulta volume com nome gerenciado, timeout e saída limitada.
Falha de consulta não representa ausência. `assertManagedVolume` exige nome
esperado, driver local e label gerenciada. Esses sinais ainda precisam ser
comparados ao registro local do instalador; não autorizam adoção por nome.
Criação de volumes, vínculo com operações e integração Redis/PostgreSQL estão
pendentes.

### Leitura expandida

D na área Aplicativos alterna entre lista com detalhes e painel de leitura em
largura completa. A revisão do plano e a prévia de runtime também ocultam a
lista para ampliar o texto. Esc retorna da revisão com a seleção preservada.
O teste de expansão e retorno roda em 80x24. A adaptação automática por resize
ainda precisa de validação visual completa.

### Volume vinculado à operação

`volumeCreateStep` inclui label de gerenciamento e ID da operação. Depois da
criação, `assertCreatedVolume` exige essas labels, nome e driver esperados.
Isso impede usar silenciosamente um volume que já existia e cuja criação
idempotente retornou sucesso. A inspeção precisa ocorrer antes de montar o
volume no serviço. Execução e registro desse fluxo permanecem pendentes.

### Redis com volume identificado

O fluxo de criação agora inclui Redis com volume rotulado pela operação.
Antes de criar o container, beforeStep inspeciona o volume e recusa identidade
divergente. Ao concluir, registra volume e container. PostgreSQL continua
aguardando credenciais. Falhas parciais preservam volumes para investigação,
sem remoção automática de dados. Testes atuais cobrem a precondição no executor;
a criação Redis com daemon isolado ainda precisa ser homologada.

### Propriedade atômica dos serviços

O registro de container e volume usa `registerManagedMany` em uma transação.
Conflito em qualquer recurso desfaz os registros novos da entrega, preservando
os anteriores. Isso protege o estado local de propriedade parcial; não desfaz
recursos Docker já criados. Recuperação desses recursos continua dependendo
da inspeção e do ID de operação nas labels.

### Criação de serviços no CLI

`create-service <redis|mailpit> <imagem-digest> <porta> [volume] --confirm --json`
executa a criação gerenciada. Redis exige volume com nome setupvibe; Mailpit
usa imagem axllent/mailpit por digest. Ambos publicam porta em loopback e criam
container parado. O comando exige Desktop, matriz válida e Docker disponível.
SIGINT/SIGTERM cancelam a operação. Criação com daemon isolado, SMTP Mailpit,
credenciais PostgreSQL e atualização preservando dados permanecem pendentes.

### Portas Mailpit

O plano Mailpit publica web e SMTP somente em 127.0.0.1. SMTP usa 1025 por
padrão; no comando create-service, o quarto argumento opcional define outra
porta SMTP. Para Redis, esse argumento continua sendo o nome do volume.
O precheck verifica as duas portas do Mailpit e recusa portas iguais. A
homologação de envio SMTP real continua pendente.

## Rodapé contextual da TUI

O rodapé apresenta os atalhos da área atual. Durante revisão, confirmação e
instalação de runtime, mostra as ações correspondentes a essas etapas.
O cancelamento continua disponível por Esc durante a execução.

Validação: `bun run check` e `bun test tests/tui.test.ts`, incluindo renderização
em terminais de 80×24, 129×44 e 160×50.

## Seleção e execução na TUI

Em Aplicativos, Enter marca ou desmarca itens. Para cada runtime selecionado,
V solicita uma versão explícita e verifica a instalação existente. Esc retorna
à seleção. P revisa o conjunto; C abre a confirmação digitada INSTALAR. Os
runtimes passam por nova verificação do conjunto inteiro antes de iniciar.
Depois são executados sequencialmente, com interrupção na primeira falha
ou cancelamento. O resultado identifica cada item, sua operação e os itens
que ficaram pendentes. Itens selecionados sem instalador integrado impedem a execução
do conjunto e são identificados na revisão.

Em Serviços, as setas selecionam containers. I inicia, O para e R reinicia,
após confirmação digitada EXECUTAR. O vínculo SQLite, o ID e a label Docker
são conferidos antes do controle. Containers externos permanecem em consulta.

Os testes da TUI usam fornecedores controlados para execução e não alteram
o Docker ou os runtimes do computador.

## PostgreSQL com credenciais em arquivo

O comando abaixo cria um container parado e registra seu volume gerenciado.
A imagem precisa ser oficial e identificada por digest SHA-256.

```bash
bun run dev create-service postgresql postgres@sha256:<digest> 5432 \
  setupvibe-postgresql /caminho/absoluto/senha dev app --confirm --json
```

O arquivo de senha deve existir, pertencer ao usuário atual, ter permissão
0600 ou 0400 e conter entre 1 e 4096 bytes. Links são recusados. Seu conteúdo
não é lido pelo planejador nem gravado no histórico; o Docker recebe somente
o caminho para montagem como arquivo somente leitura. Preserve o arquivo
enquanto o container existir. O caminho pertence ao host do daemon Docker.

O plano define POSTGRES_PASSWORD_FILE e PGDATA explicitamente. O volume
é montado em `/var/lib/postgresql`, com dados em seu subdiretório `setupvibe`.
A referência é a [documentação oficial da imagem PostgreSQL](https://github.com/docker-library/docs/blob/master/postgres/README.md).

Validações automatizadas cobrem o plano, as permissões e as recusas do CLI.
A integração real no Debian 13 x64 com Docker 29.7.2 criou o container,
autenticou por TCP e preservou dados após reinício. O teste aguarda TCP para
evitar o servidor temporário de inicialização. O formulário de serviços está integrado à TUI. Readiness na interface
ainda está pendente.

Para repetir o teste isolado, com Docker local e sem um container chamado
`setupvibe-postgresql` existente:

```bash
SETUPVIBE_DOCKER_INTEGRATION=1 \
SETUPVIBE_POSTGRES_IMAGE=postgres@sha256:<digest> \
  bun test tests/postgres-integration.test.ts
```

O teste cria um volume exclusivo, usa porta livre e remove seu container,
volume e diretório de estado ao terminar. A imagem baixada permanece no cache.

O teste negativo recusou senha incorreta após o plano definir autenticação
host SCRAM em POSTGRES_INITDB_ARGS e POSTGRES_HOST_AUTH_METHOD. A configuração
local por socket permanece trust dentro do container. Uma conexão bem-sucedida
sem esse teste negativo não comprova autenticação por senha.

## Formulário de serviços na TUI

Em Aplicativos, busque PostgreSQL, Redis ou Mailpit e pressione G. O formulário
solicita imagem por digest e porta local. Redis e PostgreSQL pedem o volume;
Mailpit pede a porta SMTP. PostgreSQL também pede o caminho absoluto do arquivo
de senha, usuário e banco. Enter avança usando os valores apresentados; Esc
cancela sem executar.

Após a verificação de conflitos, a interface apresenta o comando de criação
para revisão. C abre a confirmação digitada INSTALAR. O container é criado
parado; consulte a área Serviços para iniciá-lo. Para instalar vários itens, configure os serviços com G e os runtimes com V,
volte com Esc e marque cada item com Enter. P revisa o conjunto e C confirma
a instalação. As configurações ficam disponíveis durante a sessão.

O conjunto recusa portas ou volumes repetidos e verifica cada item antes de
iniciar qualquer instalação. A execução segue a ordem do plano, para na
primeira falha e apresenta os resultados individuais. Dependências sem
instalador integrado continuam exigindo preparação prévia do ambiente.

## Instalação isolada do Codex

```bash
bun run dev install-codex 0.166.0 --confirm --json
```

O instalador usa o pacote oficial `@openai/codex` do registry npm por versão
fixa. Bun deve estar disponível no PATH. A instalação usa diretório privado
próprio ao lado do estado SQLite, sem scripts de instalação de dependências
e sem pacotes globais. O pacote e a saída de `--version` devem corresponder
à versão solicitada antes do registro de propriedade.

O resultado fornece o caminho absoluto do launcher. Execute esse caminho para
abrir o aplicativo; o instalador não altera o PATH nem substitui instalações
externas. Atualizações do Codex registrado criam outra instalação privada. O registro
só muda após verificar pacote e launcher; a instalação anterior é preservada.
Solicitar a versão atual retorna sem alteração e sem nova operação.
Uma instalação registrada ausente ou divergente impede a atualização.
Arquivos de uma tentativa interrompida permanecem no diretório privado para
diagnóstico e não recebem registro de propriedade.

A integração opt-in `SETUPVIBE_CODEX_INTEGRATION=1 bun test
tests/install-codex.test.ts` instala a versão 0.166.0 em diretório descartável,
confere o launcher, troca entre duas versões fixas, verifica idempotência e
preservação após falha, e remove o diretório ao terminar. Esse teste passou no
Debian 13 x64. Na TUI, Codex aceita versão fixa com V e participa da seleção confirmada com
Enter, P e C. O conjunto verifica sua propriedade antes de executar.

## Claude Code nativo

```bash
bun run dev install-claude 2.1.318 --confirm --json
```

Na TUI, selecione Claude Code, informe a versão fixa com V e confirme com C.
O aplicativo também participa dos conjuntos marcados com Enter e revisados
com P. A instalação usa o binário nativo da origem oficial
`https://downloads.claude.ai/claude-code-releases`, com manifesto por versão.
O checksum SHA-256, o tamanho e a saída de `--version` devem corresponder antes
do registro SQLite. O manifesto é obtido por HTTPS; assinatura independente
ainda não é verificada.

Os arquivos ficam em diretório privado de aplicativos, sem alterar PATH nem
configuração de autenticação. O resultado fornece o caminho do executável.
A atualização verifica o checksum e a versão da instalação registrada, prepara
outro diretório e troca o registro somente após validar o novo executável.
A versão anterior permanece disponível. Repetir a versão atual não cria
outra operação. Arquivos registrados ausentes ou alterados impedem a troca.
Cancelamento durante o
download interrompe a transferência e remove o staging. Tentativas sem sucesso
não recebem propriedade e podem deixar seu diretório privado para diagnóstico.

A integração opt-in `SETUPVIBE_CLAUDE_INTEGRATION=1 bun test
tests/install-claude.test.ts` passou no Debian 13 x64 para a versão 2.1.318.
O teste cria seu próprio diretório, confere instalação, troca entre versões,
idempotência e recusa de binário alterado, e remove os arquivos ao terminar.

## Portainer Server gerenciado

```bash
bun run dev create-service portainer portainer/portainer-ce@sha256:<digest> \
  9443 setupvibe-portainer /var/run/docker.sock --confirm --json
```

Portainer Server está disponível para Desktop e Server. O plano exige imagem
oficial por digest, volume gerenciado para `/data` e porta HTTPS publicada
somente em loopback. O socket informado é montado em `/var/run/docker.sock`
e concede ao Portainer controle administrativo do daemon Docker. Não é usado
`--privileged`. O caminho pertence ao host do daemon.

Na TUI, G abre os campos de imagem, porta, volume e socket. O último campo
exige digitar SIM para aceitar esse controle; a revisão repete a informação
antes da confirmação INSTALAR. O Portainer também participa da seleção por
Enter e do conjunto revisado com P.

O container é criado parado. Após iniciá-lo em Serviços, acesse a porta HTTPS
local para configurar o administrador inicial. O instalador não gera nem
grava a senha do administrador. Portainer Agent, Edge, Swarm, atualização e
restauração ainda estão pendentes.

Os testes da TUI usam fornecedores controlados e validam argumentos,
propriedade, imagem e aceite do socket. A integração real no Debian 13 x64
criou Portainer Server em container e volume exclusivos, consultou a API HTTPS
e confirmou a mesma identidade de instância após reinício. O socket usado
nessa integração era um proxy restrito a consultas de ping, versão e info.
Uma tentativa de criação de container pelo proxy foi recusada com HTTP 403.
O teste não valida administração completa do Docker nem altera o Portainer
já existente no host. Todos os recursos exclusivos do teste foram removidos.

Para repetir, forneça uma imagem oficial por digest e um Docker local:

```bash
SETUPVIBE_PORTAINER_INTEGRATION=1 \
SETUPVIBE_PORTAINER_IMAGE=portainer/portainer-ce@sha256:<digest> \
  bun test tests/portainer-integration.test.ts
```

O teste recusa execução se o nome `setupvibe-portainer` já estiver ocupado.
A consulta HTTPS aceita o certificado local autoassinado somente no teste.
A referência é a [documentação oficial do Portainer CE](https://docs.portainer.io/start/install-ce/server/docker/linux).

## Métricas dos containers

O coletor consulta `docker stats --no-stream --no-trunc` em segundo plano,
com timeout de quatro segundos e uma única consulta ativa. A próxima consulta
ocorre pelo menos cinco segundos após o término da anterior. Essa leitura
não atrasa a cadência das amostras do host.

As amostras incluem ID, nome, CPU, memória usada, limite de memória e PIDs.
São armazenadas no payload do banco de métricas existente, com a mesma
retenção de sete dias. Amostras antigas sem o campo Docker continuam legíveis.
CPU segue a convenção Docker: 100% corresponde a um núcleo. Os valores de
memória são convertidos das unidades apresentadas pelo CLI e preservam seu
arredondamento; não equivalem aos contadores brutos da API.

A área Métricas da TUI mostra esses dados quando o coletor os tiver gravado.
A interface distingue primeira consulta, indisponibilidade, lista vazia e
amostra antiga. Ctrl+U relê o banco. Consultas não adotam containers externos
nem executam ações de controle.

Uma execução real no Debian 13 x64 gravou 44 amostras do host em cerca de
4,5 segundos; as últimas continham métricas dos oito containers em execução.
O diretório de teste foi removido. Testes controlados conferem CPU multicore,
unidades, ausência, persistência e leitura na TUI. O coletor compilado também
foi reconstruído e encerrou por SIGTERM no teste de integração.

## Tamanho mínimo e redimensionamento

A TUI exige pelo menos 80 colunas por 24 linhas. Abaixo desse tamanho,
apresenta uma orientação para ampliar o terminal e impede navegação, edição
e confirmação do conteúdo oculto. Ao ampliar, restaura a tela e o foco
anteriores, preservando seleção e campos em edição.

Uma operação já iniciada continua no núcleo. Ctrl+Q solicita seu cancelamento
mesmo com o terminal pequeno; sem operação ativa, o mesmo atalho encerra a TUI.
O resultado pode ser consultado ao restaurar o tamanho mínimo.

## Instalação privada do mise

```bash
bun run dev install-mise 2026.11.0 --confirm --json
```

Na TUI, mise aceita versão fixa com V e confirmação com C. A instalação usa
o binário da release oficial `jdx/mise`, com tag, nome de platform, tamanho
e SHA-256 publicado pela API GitHub conferidos. Redirecionamentos de download
só são aceitos para os hosts de artefatos GitHub permitidos explicitamente.
Não há validação independente da assinatura do fornecedor nessa etapa.

O executável fica no diretório privado de aplicativos. O registro é trocado
somente após a validação; a instalação anterior é preservada. Operações de
runtime passam a usar o caminho do mise registrado, sem alterar PATH ou
substituir um mise externo. Sem registro próprio, continuam usando o PATH.

O teste real da versão 2026.11.0 passou no Debian 13 x64, incluindo checksum,
versão, resolução interna e reexecução sem alteração. A integração opt-in usa
`SETUPVIBE_MISE_INTEGRATION=1 bun test tests/install-mise.test.ts` e remove seu
diretório ao terminar. A seleção conjunta de mise e runtimes também foi
validada em processo sem mise no PATH, com instalação de mise 2026.11.0 e
Bun 1.3.14 em diretórios isolados. A configuração do runtime pode aguardar o
gerenciador; as verificações que dependem dele ocorrem após sua instalação.

## Preparação automática de dependências

O parâmetro `--install-dependencies` autoriza preparar os pré-requisitos dos
instaladores integrados. A confirmação da operação continua obrigatória.
As versões automáticas estão definidas em `src/core/dependency-versions.ts`.

```bash
setupvibe --install-dependencies
setupvibe preview-runtime bun 1.3.14 --install-dependencies --json
setupvibe install-runtime bun 1.3.14 --install-dependencies --confirm --json
setupvibe preview-codex 0.166.0 --install-dependencies --json
setupvibe install-codex 0.166.0 --install-dependencies --confirm --json
```

Na TUI, o parâmetro vale para a sessão e aparece na revisão do conjunto.
Runtimes podem preparar mise ausente. Codex pode preparar Bun, incluindo mise
quando necessário. Executáveis registrados são resolvidos por caminho próprio,
sem depender da ativação do PATH e sem substituir instalações externas.
Os bancos registram separadamente as operações de cada dependência.

O teste real no Debian 13 x64 executou o CLI sem Bun ou mise no PATH. A prévia
não criou estado; a falta de confirmação foi recusada; a execução confirmada
instalou mise, Bun e Codex, com três registros de propriedade. Os diretórios
do teste foram removidos. Use `SETUPVIBE_DEPENDENCIES_INTEGRATION=1 bun test
tests/automatic-dependencies.test.ts` para repetir o cenário isolado.

A cobertura atual prepara mise e Bun nos fluxos descritos. Instalação de
Docker, pacotes do sistema, bibliotecas e ferramentas de compilação ainda
precisa ser integrada a esse parâmetro. A existência do parâmetro não torna
esses pré-requisitos automaticamente disponíveis nesta etapa da v2.

## Idioma e ações de Resources

As interfaces da v2 usam inglês: comandos, opções, placeholders, ajuda,
estados, erros e confirmações. O contrato está em `AGENTS.md`, `CLAUDE.md` e
`REQUISITOS.md`. A documentação técnica permanece em português do Brasil.
Comandos canônicos incluem `install-runtime`, `install-codex`, `create-service`,
`preview-uninstall` e `uninstall`; opções incluem `--confirm`,
`--install-dependencies` e `--events`.

A aba `Resources` substitui Aplicativos. Enter marca recursos. Os controles
`Install` e `Uninstall` escolhem a ação; `Execute action` abre a revisão e a
confirmação digitada. I, U e X oferecem o mesmo percurso por teclado. P continua
abrindo somente a revisão. Confirmações usam `INSTALL` ou `UNINSTALL`.

```bash
setupvibe preview-uninstall redis --json
setupvibe uninstall redis --confirm --json
```

O fluxo inicial de desinstalação cobre runtimes gerenciados por mise, Codex,
Claude Code, mise e containers registrados de PostgreSQL, Redis, Mailpit e
Portainer. Outros recursos ainda são recusados. A prévia verifica identidade;
o executor só remove o vínculo SQLite após sucesso comprovado. Runtimes usam
`mise uninstall` para a versão registrada. Containers próprios são removidos
com volumes preservados. Aplicativos são movidos para um arquivo privado no
diretório `uninstalled` do estado; versões anteriores e credenciais permanecem.

Desinstalação de mise exige remover antes seus runtimes registrados. Bun exige
remover antes o Codex que depende dele. A TUI inverte a ordem de dependências
para conjuntos de desinstalação. Uma falha interrompe os itens seguintes.

O teste real de Portainer confirmou remoção do container registrado,
preservação do volume e reinstalação com a mesma identidade da instância.
A reinstalação reutiliza somente o volume registrado, após conferir seu nome
e o identificador da operação original; volumes externos são recusados.
Testes de aplicativo conferem arquivamento e remoção
exclusiva do vínculo de propriedade. A captura em
`captures/resources-herdr.txt` registra a interface real em um painel Herdr.

### Encerramento durante operações

Ao destruir o renderer, a TUI cancela a operação ativa e invalida consultas
pendentes. Retornos de instalação, controle de serviços e eventos de progresso
verificam se o renderer continua disponível antes de atualizar a cena.
O teste de regressão encerra a interface durante uma instalação simulada,
confere o sinal de cancelamento e aguarda o resultado após o encerramento.

### Bun e Codex na mesma seleção

A revisão permite selecionar Bun e Codex juntos, mesmo quando Bun ainda não
está disponível. O plano exige Bun antes de Codex. Essa espera durante a
revisão não ativa instalação automática: o instalador de Codex confere de novo
o Bun disponível no PATH ou registrado pelo SetupVibe. Se a instalação de Bun
falhar, Codex permanece pendente. `--install-dependencies` continua sendo a
opção para instalar pré-requisitos sem selecionar cada um manualmente.

### Instalação declarativa pela CLI

`preview-install <manifest.json>` verifica o conjunto sem instalar e retorna
as prévias de cada recurso em `previews`, com `executed: false` no resultado.
`install <manifest.json> --confirm` repete as verificações e executa o conjunto.
Ambos aceitam `--json`, `--server` e `--install-dependencies`. Sinais SIGINT e
SIGTERM solicitam cancelamento. Uma falha interrompe os recursos seguintes;
instalações anteriores permanecem registradas no histórico.

```json
{
  "schemaVersion": 1,
  "resources": [
    { "kind": "application", "id": "codex", "version": "0.166.0" },
    { "kind": "runtime", "id": "bun", "version": "1.3.14" },
    { "kind": "application", "id": "mise", "version": "2026.11.0" }
  ]
}
```

O catálogo ordena esse exemplo como mise, Bun e Codex. Dependências ausentes do
manifesto não são selecionadas implicitamente: use `--install-dependencies`
para os pré-requisitos já integrados, atualmente mise e Bun. Recursos do tipo
`service` recebem `request` com o contrato de `ServiceRequest`, incluindo
imagem por digest, porta e volume quando exigido. PostgreSQL recebe somente o
caminho do arquivo protegido em `request.postgres.passwordFile`, nunca a senha.
Portainer exige `request.portainer.allowDockerSocket: true`.

O parser rejeita campos desconhecidos, versões móveis, recursos repetidos,
edições incompatíveis e arquivos acima de 1 MiB. O manifesto descreve os
recursos explicitamente selecionados; ele não ativa configurações de shell.

### Inicialização de Docker Swarm

```bash
setupvibe swarm --json
setupvibe preview-swarm 192.0.2.10 --server --json
setupvibe init-swarm 192.0.2.10 --server --confirm --json
```

`swarm` consulta estado local, identidade do nó, papel de manager e identidade
do cluster, sem consultar tokens. `preview-swarm` confere a matriz Linux,
propriedade e endereço antes de produzir as etapas. `init-swarm` exige
confirmação, fixa anúncio e escuta no IP informado na porta 2377 e verifica
que o nó se tornou manager. O IP do exemplo é documental; informe um endereço
real da interface escolhida. IPv4 e IPv6 são aceitos, sem hostname ou wildcard.

A operação registra cluster e nó no SQLite somente após sucesso. Reexecução
retorna `current` apenas com os mesmos IDs e endereço. Cluster externo,
endereço diferente, descoberta indisponível ou vínculo antigo exigem correção
manual. Há uma nova conferência do estado imediatamente antes do comando.
A saída de inicialização do Docker não é encaminhada a logs ou resultados,
pois contém token de ingresso. O comando não altera firewall.

O teste usa um executável Docker simulado e verifica prévia sem escrita,
confirmação, registro, reexecução, recusa de cluster externo e ausência do token
no banco. O teste real descrito a seguir valida inicialização num daemon
isolado. Rede overlay, ingresso de outros nós, quórum e saída do cluster
continuam pendentes. Referência de argumentos:
[Docker swarm init](https://docs.docker.com/reference/cli/docker/swarm/init/).

### Integração real de Swarm

O teste opt-in usa a imagem oficial Docker-in-Docker fixada por digest, em
container privilegiado descartável, sem rede externa, portas publicadas,
mounts do host ou acesso ao socket Docker do host. O daemon interno escuta
somente no próprio socket Unix, usa vfs e inicializa um manager em loopback.

`SETUPVIBE_SWARM_INTEGRATION=1` habilita o teste; informe a imagem por digest
em `SETUPVIBE_DIND_IMAGE` e execute `bun test tests/swarm-integration.test.ts`.
A imagem usada na verificação foi
`docker@sha256:d035bd30886e451b2727ef3cdb9af9a5c537a10d4bc5d18c08d0ffa597e46aeb`.

A execução confirmou criação do manager, registro dos IDs no SQLite,
persistência das identidades após reiniciar o daemon, reexecução sem alterações,
recusa do cluster com outro banco de estado e ausência de tokens no banco.
Ao terminar, remove container e volumes próprios e compara o estado Swarm do
host com o estado anterior. A imagem baixada permanece no cache. O teste não
comprova comunicação entre nós ou rede overlay.

### Swarm pela TUI

Na seção `Services`, W abre a consulta de Swarm. O painel mostra estado, papel,
endereço e IDs do cluster e do nó; W repete a consulta. N solicita o IP para
inicialização e Enter abre a revisão. C apresenta o campo de confirmação:
somente `INITIALIZE` executa a operação. Esc cancela a execução ativa; fora
dela, retorna aos serviços. Durante a edição do IP, Esc volta à consulta.

Consultas atrasadas são descartadas após navegar ou encerrar a interface.
Falhas de consulta e de revisão aparecem com atalhos para tentar novamente.
Nenhuma consulta inicia Swarm ou adota um cluster existente. O fluxo usa o
mesmo núcleo verificado pela CLI e pelo teste Docker-in-Docker. Os testes de
interface usam fornecedores simulados e cobrem confirmação, correção de IP,
cancelamento em 80×24 e resposta atrasada após navegação. A revisão visual
preserva os tokens existentes, a distinção entre consulta e ação e os atalhos
visíveis; não adiciona painéis decorativos.

### Controle do coletor por systemd

No Linux, `collector-status --json` consulta o user manager sem criar banco.
O resultado inclui estado de carga, atividade, subestado, habilitação,
arquivo carregado e drop-ins. Falha de comunicação é distinta de unidade
`not-found`.

Depois de gravar a unidade com `write-collector` no diretório canônico
`$XDG_CONFIG_HOME/systemd/user` ou `~/.config/systemd/user`, use:

```bash
setupvibe activate-collector /absolute/path/setupvibe-collector --confirm --json
setupvibe collector-status --json
setupvibe stop-collector /absolute/path/setupvibe-collector --confirm --json
```

A configuração esperada usa o diretório de estado atual e intervalo de 5000 ms.
Ativação recarrega o user manager, confere o arquivo carregado, habilita e
inicia o serviço. A verificação final exige atividade e habilitação. Parada
confere o mesmo arquivo, solicita `systemctl --user stop` e verifica estado
inativo. Ela preserva habilitação no login, unidade e métricas.

Conteúdo divergente, links simbólicos no caminho da unidade, proprietário
incorreto, escrita permitida a terceiros, arquivo carregado diferente e
drop-ins são recusados. As operações registram etapas no histórico e aceitam
cancelamento por SIGINT/SIGTERM. Os testes de controle usam systemctl simulado;
a execução real com user manager isolado é descrita a seguir. Supervisão
macOS ainda precisa ser homologada. Referência:
[systemctl](https://freedesktop.org/software/systemd/man/latest/systemctl.html).

### Integração real do coletor com systemd

O Dockerfile em `tests/fixtures/systemd/` usa Debian 13 por digest, systemd,
dbus-user-session e um usuário de teste. O teste opt-in inicia esse ambiente
como PID 1 num container privilegiado, com cgroup namespace próprio, tmpfs em
/run e /run/lock, sem rede externa, portas publicadas ou mounts do host.

Compile os executáveis e construa a imagem local:

`bun run build` e `bun run build:collector`.

`docker build --tag setupvibe-test-systemd:debian13 tests/fixtures/systemd`.

Execute `bun test tests/collector-systemd-integration.test.ts` com
`SETUPVIBE_SYSTEMD_INTEGRATION=1` e
`SETUPVIBE_SYSTEMD_IMAGE=setupvibe-test-systemd:debian13`.

O teste copia somente os dois executáveis compilados, inicia o user manager
do usuário interno, grava a unidade pela CLI e verifica ativação, habilitação
e produção de amostras. Em seguida provoca falha do processo coletor e exige
novo PID com novas amostras, validando Restart=on-failure. Também verifica
parada, preservação das métricas e nova ativação. Remove container e volumes
próprios ao terminar; a imagem de teste permanece no cache local. Essa
execução não homologa launchd ou toda a matriz Linux.

### Controle do coletor pela TUI

Em `Metrics`, C abre a consulta da supervisão Linux. O painel mostra carga,
atividade, subestado, habilitação e caminho da unidade. A solicita o caminho
absoluto do coletor para ativação; S solicita o mesmo caminho para parada.
Enter verifica a configuração e abre a revisão das etapas. C apresenta a
confirmação e somente `EXECUTE` inicia a operação.

A prévia compartilhada confere o arquivo canônico e consulta o user manager
sem criar estado. A execução repete as verificações. Durante a edição, Esc
retorna ao painel; fora da edição, volta às métricas; durante uma operação,
solicita cancelamento. Falhas aparecem na área de leitura. Respostas atrasadas
não substituem outra seção e não atualizam renderer encerrado.

Os testes da TUI em 80×24 cobrem ativação e parada, recusa da palavra de
confirmação incorreta e encaminhamento ao controlador somente após `EXECUTE`.
Fornecedores simulados impedem que esses testes acionem systemctl no host.
O teste Debian com user manager real valida o núcleo usado nesse fluxo.
A consulta pelo painel não instala o coletor nem cria sua unidade; o caminho
informado deve corresponder à configuração previamente gravada.

### Supervisão nativa com launchd

No macOS, CLI e TUI selecionam o controlador de LaunchAgent. A unidade esperada
fica em `~/Library/LaunchAgents/dev.setupvibe.collector.plist` e deve ter sido
gravada por `write-collector` com o mesmo executável, diretório de estado e
intervalo. `collector-status`, `activate-collector` e `stop-collector` mantêm
seus comandos e a exigência de confirmação. O painel em `Metrics` usa o mesmo
controlador.

A ativação usa `enable`, `bootstrap` quando necessário e `kickstart` sem
reiniciar um processo já ativo. A parada usa `bootout` para descarregar o
agente, preservando plist, métricas e registro para o próximo login. O alvo é
sempre `gui/<uid>/dev.setupvibe.collector`, sem acesso ao domínio de sistema.
UID zero e plataformas diferentes de macOS são recusados.

O estado vem da listagem documentada de três colunas de `launchctl list`;
`launchctl print` não é analisado. A consulta retorna somente informações do
coletor, sem expor os demais serviços. Habilitação aparece como `unknown`:
a consulta não presume o estado de overrides persistentes. O caminho mostrado
é o arquivo registrado pelo SetupVibe, sem afirmar que launchctl comprovou a
origem do serviço carregado.

Conteúdo, proprietário, permissões e caminho real do plist são conferidos.
Após ativação bem-sucedida, o SQLite registra caminho e SHA-256 da configuração.
Um serviço já carregado sem esse registro é recusado, inclusive se tiver o
mesmo rótulo. Configuração divergente também é recusada. Se bootstrap concluir,
mas a operação falhar antes do registro, o agente exige reconciliação manual;
não há adoção automática nem remoção forçada para reparar a tentativa.

Os testes em Linux usam launchctl simulado e cobrem listagem, prévia sem
escrita, confirmação, registro, reativação, parada e recusas de controle externo
e configuração alterada. Isso não homologa execução real, formatos de saída,
sessão gráfica, login ou recuperação de falhas no macOS. Essa homologação
permanece pendente. Referência de comandos:
[Manual do launchctl](https://keith.github.io/xcode-man-pages/launchctl.1.html).

### Coletor embutido no executável principal

`setupvibe --collector [interval-ms]` executa somente a coleta em processo
separado, sem montar TUI. O intervalo padrão é 5000 ms; o intervalo permitido
vai de 100 a 3600000 ms. SIGINT e SIGTERM encerram consultas e bancos. Os
caminhos de estado, retenção, exclusão entre coletores e formato das amostras
são os mesmos da entrada dedicada `setupvibe-collector`.

Os comandos `preview-collector`, `write-collector`, `activate-collector` e
`stop-collector` aceitam `--embedded`. Nesse modo, o caminho fornecido aponta
para o binário compilado `setupvibe`; systemd e launchd recebem `--collector`
como argumento separado, antes do intervalo. O comando de controle deve usar
o mesmo modo usado ao gravar a unidade, pois o conteúdo é conferido.

```bash
setupvibe preview-collector /absolute/path/setupvibe --embedded --json
setupvibe write-collector /absolute/path/setupvibe \
  /home/user/.config/systemd/user/setupvibe-collector.service \
  --embedded --confirm --json
setupvibe activate-collector /absolute/path/setupvibe --embedded --confirm --json
setupvibe stop-collector /absolute/path/setupvibe --embedded --confirm --json
```

Assim, uma distribuição pode entregar somente `setupvibe` e continuar rodando
o coletor independentemente da TUI. O build separado do coletor permanece
opcional. O diretório da unidade deve existir; essa etapa ainda não constitui
o bootstrap automático completo. No desenvolvimento, `bun run collector`
continua usando a entrada dedicada e compartilha o mesmo código de execução.

No painel do coletor em `Metrics`, M alterna entre `Dedicated collector` e
`Embedded SetupVibe`. O modo aparece na consulta e na revisão; o caminho
solicitado corresponde ao executável escolhido. A confirmação preserva esse
modo durante a execução. Para controlar uma unidade já criada com `--embedded`,
selecione `Embedded SetupVibe` antes de informar o caminho.

O teste real Debian/systemd executa os dois modos, com 30 verificações no total.
No modo embutido, somente o executável principal é copiado para o container,
sem Bun instalado ou segundo binário do coletor. Ambos os modos produzem
amostras, recuperam coleta após falha do processo e param sem apagar métricas.
O teste de subprocesso confirma coleta sem TUI e encerramento por SIGTERM;
o teste de interface confere a passagem do modo até o controlador.

### Instalação automática da unidade do coletor

```bash
setupvibe preview-install-collector /absolute/path/setupvibe --embedded --json
setupvibe install-collector /absolute/path/setupvibe --embedded --confirm --json
```

O instalador usa o diretório canônico do supervisor e cria os diretórios
necessários. Sem `--embedded`, o caminho deve apontar para o coletor dedicado.
A prévia consulta disponibilidade do supervisor, confere o executável e os
pais existentes e recusa links ou escrita permitida a terceiros. Não cria
banco, diretórios ou unidade. A instalação exige `--confirm`, registra a
criação no histórico, grava exclusivamente e ativa o supervisor nativo.

O SQLite registra `collector-unit` com caminho e hash da configuração.
Reexecução com a mesma unidade registrada preserva seus bytes e repete a
ativação. Unidade externa, conteúdo alterado, vínculo antigo, arquivo ausente
com registro ou serviço carregado sem registro são recusados. Configurações
criadas manualmente com `write-collector` não são adotadas automaticamente.

A criação da unidade e a ativação têm operações separadas. Se a ativação
falhar, a unidade registrada é preservada para diagnóstico e nova tentativa,
sem excluir métricas ou restaurar arquivos por cima de mudanças externas.
O resultado inclui `configurationOperationId`, ou null na reexecução, e o
caminho `unit`. A criação dos diretórios ocorre somente na execução confirmada.

O teste Debian/systemd agora começa sem o diretório da unidade e usa esses
comandos nos modos dedicado e embutido. Os dois passaram com 32 verificações
no total, incluindo prévia sem escrita e instalação repetida, além de coleta,
recuperação após falha e parada. Instalação automática real no macOS permanece
pendente de homologação. Essa operação configura o serviço; o caminho deve
apontar para um executável já disponível e não representa download ou atualização
do próprio SetupVibe.

### Instalação automática pela TUI

No painel do coletor em `Metrics`, I solicita a instalação da unidade.
M escolhe o modo dedicado ou embutido; informe o caminho do executável escolhido.
Enter consulta a prévia do instalador, exibindo o destino e as ações de criar
os diretórios necessários, registrar a unidade e ativar o supervisor. C abre
a confirmação; somente `EXECUTE` inicia a instalação.

Uma unidade externa ou modificada aparece como falha da revisão e não pode
ser executada. Esc retorna ao painel durante a edição e solicita cancelamento
quando houver operação ativa. A ajuda suspende os atalhos do painel. A e S
continuam disponíveis para ativar ou parar uma unidade existente com a mesma
configuração. Os testes da interface em 80×24 verificam recusa na prévia,
passagem do modo embutido, confirmação e suspensão do atalho de instalação
com a ajuda aberta. O núcleo é o mesmo homologado no Debian/systemd.

### GitHub CLI nativo

```bash
setupvibe preview-gh 2.103.3 --server --json
setupvibe install-gh 2.103.3 --server --confirm --json
setupvibe preview-uninstall gh --server --json
setupvibe uninstall gh --server --confirm --json
```

GitHub CLI está integrado no Desktop e no Server, no manifesto como aplicação
`gh` e na aba `Resources`, com V para versão fixa. O fornecedor oficial usa
`cli/cli`. A API deve confirmar tag, nome exato do asset, tamanho e SHA-256.
Linux usa tar.gz; macOS usa zip, conforme arquitetura amd64 ou arm64.

O pacote é baixado em diretório privado. `/usr/bin/tar` envia somente a entrada
exata `gh_<versão>_<sistema>_<arquitetura>/bin/gh` para stdout; outros caminhos
não são extraídos no disco. O binário tem sua versão confirmada, recebe modo
0700 e é registrado somente após sucesso. Os metadados guardam também tamanho
e hash do binário extraído. Antes de reutilizar ou atualizar uma instalação,
esses bytes e a versão são conferidos.

Atualização cria outra localização e preserva a versão anterior. Remoção
arquiva somente o binário registrado, preservando versões anteriores,
configuração e credenciais. O gh externo no PATH não é substituído; PATH e
autenticação não são configurados automaticamente. A instalação do Git, listado
como dependência no catálogo, ainda precisa do fornecedor próprio.

O teste real opt-in `SETUPVIBE_GH_INTEGRATION=1 bun test tests/install-gh.test.ts`
instalou 2.103.3 e 2.103.2 em diretório descartável, confirmou reexecução,
preservação da versão anterior, recusa após alteração dos bytes e remoção da
versão registrada. O teste da TUI Server confirma o despacho ao fornecedor gh
somente após `INSTALL`. A resolução dos assets macOS está implementada, mas
extração e execução nesse sistema ainda precisam de homologação real.

Referências: [releases oficiais](https://github.com/cli/cli/releases) e
[instalação Linux](https://github.com/cli/cli/blob/trunk/docs/install_linux.md).

O resolvedor de gh reutiliza até 16 metadados verificados durante cinco minutos
na mesma execução, sem cache persistente na prévia. Se houver `GH_TOKEN` ou
`GITHUB_TOKEN` no ambiente, ele usa esse token somente no endpoint oficial da
API, sem incluí-lo em resultados ou logs. Erros de cota têm mensagem específica.
A API chegou a recusar a repetição por cota anônima zerada. Após a cota ser
restabelecida, a repetição dos testes reais passou, incluindo instalação e
remoção pela CLI compilada. O arquivo tests/install-gh.test.ts registrou cinco
testes aprovados e 27 verificações na execução com integração habilitada. Os
testes locais de cache e mensagem de cota usam respostas simuladas.

### Cancelamento de lotes e eventos da CLI

Instalação por manifesto aceita `--events` para emitir NDJSON. Depois que as
prévias do conjunto passam, cada recurso iniciado produz `resource-started`,
com `id`, `index` a partir de zero e `total`. O resultado final usa
`{"type":"result","result":...}`. Erros anteriores ao resultado usam o
objeto estruturado de erro em stderr. O modo não intercala mensagens humanas.
`preview-install` continua usando `--json`, sem eventos de execução.

```bash
setupvibe install manifest.json --confirm --install-dependencies --events
```

Cancelamento durante uma prévia retorna `cancelled`, tanto quando a consulta
rejeita quanto quando termina após o sinal. Nenhum instalador seguinte é
chamado. O item interrompido fica cancelado e os seguintes permanecem pendentes.
O lote também confere o sinal depois do evento de progresso, antes de chamar
o instalador. Instalações anteriores concluídas preservam seus resultados.

As prévias nativas de gh, mise e Claude recebem o sinal do lote. A descoberta
mise usa o sinal no subprocesso; a instalação de runtime repassa esse sinal
à prévia e à verificação final. O teste de cancelamento inicia um processo
simulado de descoberta, confirma seu PID, cancela, verifica seu encerramento
e comprova que o banco de estado não foi criado. Testes adicionais cobrem
prévia resolvida ou rejeitada após o sinal e cancelamento no progresso.

A consulta mise aguarda o evento de encerramento do processo antes de devolver
controle após cancelamento. Se SIGTERM não for atendido, envia SIGKILL depois
de 250 ms. O limite de três segundos também solicita essa parada forçada.
Os testes reais simulam tanto um processo que encerra normalmente quanto um
que ignora SIGTERM e confirmam que seu PID deixou de existir antes do retorno.
Um teste da CLI verifica que falha da prévia em modo NDJSON produz somente o
resultado final, sem evento de recurso iniciado nem diretório de estado.

### Contrato de idioma da interface

A regra de inglês inclui mensagens do núcleo expostas na CLI/TUI e campos
padronizados de saída JSON. `platform` retorna `homologated: false`; o nome
anterior em português foi removido antes da publicação da v2. `doctor` usa
`Platform` e `Linux support matrix`; `runtimes` usa `active` e `installed`.
Erros de estado, catálogo, manifesto, download e verificação de artefatos
seguem o mesmo idioma. Documentação e comentários continuam em português.

Os testes exercitam o schema de platform, a saída humana de doctor, os estados
de runtimes encontrados e a recusa de SETUPVIBE_STATE_DIR relativo. A revisão
dos literais de erro encontrou e corrigiu mensagens mistas que não apareciam
nas telas principais. Dados fornecidos pelo usuário, como caminhos e nomes
de banco, são preservados.

## OpenCode nativo

```bash
setupvibe preview-opencode 1.19.5 --json
setupvibe install-opencode 1.19.5 --confirm --json
setupvibe uninstall opencode --confirm --json
```

OpenCode está integrado no Desktop, na CLI, no manifesto como aplicação
`opencode` e em `Resources`, com V para escolher versão fixa. Server recusa
esse recurso. A origem é o release oficial de `anomalyco/opencode`, com tag,
asset, tamanho e SHA-256 exatos. Em x64, o fornecedor escolhe o pacote baseline;
ARM64 usa o pacote nativo. Linux usa tar.gz e macOS usa zip.

O instalador lê somente a entrada `opencode` do pacote, sem extrair outros
caminhos. O arquivo fica em diretório privado, com modo 0700, tamanho e hash
registrados. Antes de reutilizar ou trocar versão, confere os bytes e a versão
anterior. A consulta de versão usa diretórios XDG privados da instalação e
desabilita as consultas de atualização nesse processo de verificação.

Troca de versão cria outra localização e preserva a anterior. Remoção arquiva
somente o binário registrado; não altera PATH, credenciais ou configurações
do OpenCode que já exista no computador. Os nomes de comando do OpenCode 1 e
2 podem coincidir; o SetupVibe mantém suas instalações privadas e exige que
a versão solicitada tenha o asset esperado no release, sem selecionar latest.

O teste real opt-in `SETUPVIBE_OPENCODE_INTEGRATION=1` em
`tests/install-opencode.test.ts` cobre versões 1.19.5 e 1.19.4, reexecução,
recusa de bytes alterados, troca com preservação e remoção. Há também teste de
instalação e remoção pela CLI compilada com estado isolado. Testes locais
cobrem identidade do asset, confirmação, manifesto Desktop/Server e despacho
da TUI para o fornecedor correto. Extração e execução no macOS e demais
versões ainda precisam de homologação.

Referências: [documentação oficial](https://docs.opencode.ai/docs/) e
[releases oficiais](https://github.com/anomalyco/opencode/releases).

## Git por APT

```bash
setupvibe git-info --json
setupvibe preview-git candidate --json
setupvibe install-git candidate --confirm --json
```

O fornecedor atende Linux da matriz Debian/Ubuntu, em Desktop e Server.
A instalação no macOS ainda está pendente. Resources usa V para informar
`candidate` ou uma versão exata do pacote Debian, incluindo epoch e revisão.
O mesmo recurso funciona no manifesto:

```json
{"schemaVersion":1,"resources":[{"kind":"application","id":"git","version":"candidate"}]}
```

`candidate` consulta o candidato APT local. Quando não há índices, a prévia
retorna `awaiting-index`; somente a instalação confirmada atualiza os índices
e fixa a versão antes de instalar. Esse valor não promete reprodutibilidade
entre máquinas ou datas. Uma versão explícita depende da disponibilidade
nos repositórios configurados.

APT instala Git, ca-certificates e openssh-client sem recomendações nem
remoção de pacotes, com espera de lock e preservação de conffiles.
O processo exige root ou sudo não interativo apenas para APT. Não altera
repositórios, perfil de shell, credenciais, configuração do Git ou PATH.
Dependências e eventuais hooks do APT são globais, conforme a configuração
do sistema; o processo não é uma instalação privada.

Git previamente instalado retorna `external`, sem adoção ou gravação de
estado. Uma versão explícita incompatível é recusada. Após uma instalação
própria, o banco registra o pacote e sua versão; reexecução confere o pacote,
os arquivos pelo dpkg e o comando git. Qualquer mudança em executáveis é
recusada. São toleradas apenas ausências em documentação, traduções e no
arquivo de metadados lintian do Git, omitidos por imagens Debian mínimas.
Essa verificação de integridade usa os registros locais do dpkg e não
substitui a autenticação dos repositórios pelo APT.

Não há remoção automática do Git global ou dessas dependências. Um registro
local não prova que nenhum outro programa passou a usar o pacote.

O teste real opt-in usa o binário compilado em Debian 13 descartável, sem
Git ou índices APT iniciais. Ele verifica instalação, repetição, preservação
de .gitconfig e reconhecimento externo sem criar outro banco. O verificador
roda como PID 1, sem docker exec, evitando depender do espaço temporário do
daemon. Não usa privilégios adicionais, mounts do host ou portas publicadas;
precisa de rede para APT e remove o contêiner próprio ao terminar.

```bash
SETUPVIBE_GIT_INTEGRATION=1 SETUPVIBE_GIT_IMAGE=setupvibe-test-systemd:debian13 bun test tests/git-integration.test.ts
```

Construção da imagem: `tests/fixtures/systemd/Dockerfile`. O teste cobre
Debian 13 x64 com root; sudo, Debian 12, Ubuntu e ARM64 ainda precisam de
homologação real.

Referências: [APT](https://manpages.debian.org/bookworm/apt/apt-get.8.en.html)
e [verificação do dpkg](https://manpages.debian.org/trixie/dpkg/dpkg.1.en.html).

## Herdr nativo

```bash
setupvibe preview-herdr 0.9.5 --json
setupvibe install-herdr 0.9.5 --confirm --json
setupvibe preview-uninstall herdr --json
setupvibe uninstall herdr --confirm --json
```

Herdr está integrado no Desktop, na CLI, no manifesto como aplicação `herdr`
e em `Resources`, com V para versão fixa. Server recusa o recurso. A origem é
o release oficial de `herdrdev/herdr`, com tag, asset, tamanho e SHA-256
exatos. Linux usa `herdr-linux-x86_64` ou `herdr-linux-aarch64`; macOS usa
`herdr-macos-x86_64` ou `herdr-macos-aarch64`.

O binário é baixado diretamente em diretório privado, com modo 0700, tamanho
e hash registrados. A versão é confirmada por `herdr --version` antes do
registro. Reexecução retorna `current`; troca de versão preserva a anterior.
Remoção arquiva somente o diretório gerenciado e mantém configuração,
sessões e credenciais existentes. PATH e autenticação não são configurados.

O teste real opt-in `SETUPVIBE_HERDR_INTEGRATION=1 bun test
tests/install-herdr.test.ts` cobre instalação de 0.9.5 e 0.9.4, reexecução,
preservação da versão anterior, recusa após alteração dos bytes e remoção.
Testes locais cobrem identidade do asset, digest, plataforma, confirmação,
cache de metadados e limite da API. macOS e ARM64 ainda precisam de
homologação real.

Referência: [releases oficiais](https://github.com/herdrdev/herdr/releases).

## Artefatos de distribuição por plataforma

O empacotador `scripts/build-release.mjs` roda com Node.js e chama Bun 1.3.14.
Ele gera executáveis da CLI com o coletor embutido e os assets nativos do
OpenTUI 0.8.2. Linux usa glibc; x64 usa o alvo baseline. Há quatro alvos:
linux-x64, linux-arm64, darwin-x64 e darwin-arm64.

```bash
bun run build:release --target linux-x64 --output dist/release-linux
bun install --frozen-lockfile --ignore-scripts --os='*' --cpu='*'
bun run build:release --all --output dist/release-all
```

O primeiro comando precisa do pacote nativo correspondente. Para os quatro
alvos, o segundo instala as dependências opcionais no projeto sem alterar o
lockfile; não instala ferramentas globais. O empacotador recusa versão Bun
divergente e pacote nativo ausente ou com versão diferente do OpenTUI.
Quando Bun não estiver no PATH, informe seu caminho por `BUN_BINARY`.

A saída contém um executável por alvo, `release-manifest.json`,
`SHA256SUMS` e `build-info.json`. Os nomes incluem a versão do package.json.
O manifesto usa o schema consumido pelo núcleo de atualização e URLs futuras
do release GitHub correspondente. Esses URLs só ficam disponíveis depois de
publicação autorizada; gerar artefatos não publica uma release. O arquivo
build-info registra Bun, OpenTUI, alvos e homologated false.

O build trabalha em diretório temporário próprio, calcula SHA-256 por streaming
e move o resultado ao destino somente depois de terminar todos os alvos.
Diretório de saída existente é recusado. Falha remove apenas o staging
próprio. No alvo do host, o empacotador também confere a versão do executável
gerado, sem iniciar instalações.

Os quatro artefatos foram gerados nesta máquina e seus formatos confirmados:
ELF x64/ARM64 no Linux e Mach-O x64/ARM64 no macOS. A geração cruzada não
comprova execução no sistema de destino.

O teste opt-in abaixo abriu a TUI Linux x64 em Debian 13 isolado, sem Bun,
fontes ou node_modules no contêiner, e encerrou pelo teclado. O contêiner não
tem rede, mounts do host ou portas publicadas. O teste confere o SHA-256 do
artefato antes de copiá-lo e remove o contêiner próprio no encerramento.

```bash
SETUPVIBE_DISTRIBUTION_INTEGRATION=1 SETUPVIBE_RELEASE_DIRECTORY=/absolute/release SETUPVIBE_DISTRIBUTION_IMAGE=setupvibe-test-systemd:debian13 bun test tests/distribution-integration.test.ts
```

Continuam pendentes a publicação do bootstrap, painel de atualização
na TUI e homologação dos outros três alvos, além de
Debian 12/Ubuntu e demais versões da matriz. Não foram publicados artefatos
nem alterados os domínios de instalação.

Referências: [Bun](https://bun.sh/docs/bundler/executables) e
[OpenTUI](https://opentui.com/docs/reference/standalone-executables/).

## Bootstrap gerado com hashes fixados

O empacotador agora inclui `install.sh` e seu hash em SHA256SUMS.
`scripts/bootstrap.mjs` preenche `scripts/bootstrap-template.sh` com a versão,
origem HTTPS e hashes dos artefatos presentes. O bootstrap não resolve latest
nem consulta outro manifesto. Um build parcial recusa plataformas sem hash.

```bash
bash dist/release-all/install.sh
bash dist/release-all/install.sh --help
```

Sem `--confirm`, o bootstrap detecta a plataforma e imprime versão, edição,
origem, hash e destinos, sem gravar arquivos ou iniciar downloads.
Depois da publicação autorizada dos artefatos no endereço incorporado,
a instalação pode ser confirmada:

```bash
bash install.sh --confirm --install-dependencies
bash install.sh --server --confirm --install-dependencies
```

Os parâmetros `--prefix /absolute/path` e
`--bin-directory /absolute/path` personalizam os destinos. Os padrões são
~/.local/share/setupvibe e ~/.local/bin. O binário compilado contém Bun e
OpenTUI; nenhum runtime externo é usado pelo bootstrap para executar o produto.
O script inicial usa Bash, utilitários do sistema, curl e SHA-256.
No Linux, `--install-dependencies` prepara curl e ca-certificates quando
ausentes, usando root ou sudo não interativo somente para APT. Não instala
mise ou runtimes nessa etapa; o parâmetro de mesmo nome na aplicação prepara
os fornecedores necessários aos recursos selecionados.

A matriz aceita Debian 12/13, Ubuntu 24.04 e macOS 14+, x64/ARM64; Server exige
Linux. Somente Debian 13 x64 foi testado de verdade nesta etapa. A leitura de
os-release trata o arquivo como dados. Destinos com links, ancestrais de outro
usuário ou graváveis por grupo/outros são recusados.

curl exige HTTPS e TLS 1.2+, limita redirecionamentos, tempo e tamanho do
download. O SHA-256 fixado é conferido antes de executar `--version` do
artefato. O arquivo gerado do bootstrap precisa vir de origem confiável;
os hashes nele incorporados não autenticam o próprio script.

A instalação usa marcador privado, recibos de hash, lock por prefixo e staging
no mesmo filesystem. Arquivos externos não são adotados. O ponteiro current
é trocado por rename depois da verificação; versões anteriores permanecem.
O recibo precede a publicação do executável, permitindo retomar uma interrupção
entre essas duas gravações. Reexecução verifica bytes e recibos e reutiliza
o artefato. Binário ou launcher alterado causa recusa.

Um launcher privado mantém Desktop ou Server. O link setupvibe no diretório
de comandos aponta para esse launcher, que chama current. Server conserva
seu catálogo ao executar comandos posteriores, inclusive --version.
A CLI aceita --server antes ou depois do comando. Trocar a edição de um
prefixo existente é recusado; use prefixo e diretório de comandos separados
para manter as duas instalações.

O bootstrap integra o diretório ao PATH em perfis Bash/Zsh com backup e
recibos. Use --no-path para pular essa etapa e --shell bash ou --shell zsh
para escolher o shell. Trocas de versão usam o núcleo e os recibos de atualização.
Recuperação de locks após SIGKILL e homologação dos demais sistemas continuam pendentes.
Um lock deixado por término abrupto exige inspeção manual; não é removido
automaticamente enquanto outro processo pode estar ativo.

O teste abaixo usa HTTPS local com certificado de teste explicitamente
confiado, sem desabilitar TLS. O runtime que coordena o teste fica fora do
PATH; o produto instalado usa apenas seu próprio executável e o launcher.
Não há APT ou instalação no host, mounts do host ou portas publicadas.

```bash
SETUPVIBE_BOOTSTRAP_INTEGRATION=1 SETUPVIBE_RELEASE_DIRECTORY=/absolute/release SETUPVIBE_BOOTSTRAP_IMAGE=setupvibe-test-systemd:debian13 bun test tests/bootstrap-integration.test.ts
```

Foram verificadas instalação limpa com preparação de curl/certificados,
reexecução sem novo download, bytes alterados, comando e diretório externos,
links em ancestrais, certificado não confiável, checksum incorreto e
cancelamento de download com preservação da versão anterior e limpeza própria.
O teste também cobre troca para um novo artefato preservando o antigo e
o launcher Server com catálogo restrito. O cenário foi ampliado para 45 verificações internas, incluindo PATH em um novo
Bash, --no-path e remoção sem afetar outra instalação.

Os quatro builds foram regenerados com o bootstrap. A suíte local passou
com 251 testes, 17 integrações opt-in ignoradas e nenhuma falha. ShellCheck,
sintaxe Bash e TypeScript passaram. A TUI do artefato atualizado também foi
exercitada separadamente em contêiner sem dependências do projeto.
Nenhum domínio, tag ou GitHub Release foi alterado.

## PATH persistente e remoção dos blocos registrados

```bash
setupvibe preview-path /absolute/bin bash --json
setupvibe install-path /absolute/bin bash --confirm --json
setupvibe preview-remove-path /absolute/bin bash --json
setupvibe remove-path /absolute/bin bash --confirm --json
```

A CLI permite Bash ou Zsh; sem nome explícito, usa SHELL, com Bash como
fallback. A prévia retorna perfis e ação, sem criar diretórios ou banco e sem
mostrar o conteúdo dos arquivos. Alterações exigem --confirm e geram uma
operação no histórico.

Bash usa o primeiro perfil de login existente entre .bash_profile,
.bash_login e .profile, além de .bashrc para shells interativos.
Se nenhum existir, cria .profile. Zsh usa .zprofile e .zshrc, respeitando
ZDOTDIR absoluto recebido no ambiente; na ausência dele, usa HOME.
Redirecionamentos dinâmicos internos de ZDOTDIR precisam ser informados no
ambiente da execução. O instalador não executa perfis para descobri-los.

A integração acrescenta um bloco identificado com o diretório de comandos.
O bloco usa caminhos escapados e só acrescenta o diretório quando ele ainda
não está no PATH. Espaços, aspas e caracteres de expansão são tratados como
parte do caminho. Controles e dois-pontos são recusados. Abra um novo shell
para carregar a configuração; o processo atual do terminal não é alterado.

O conteúdo anterior é copiado, byte por byte, para backups privados sob
`path-integrations` no diretório de estado. Cada geração tem um subdiretório
próprio. O recibo é publicado antes de editar os perfis e os arquivos existentes
recebem apenas o bloco adicional, mantendo seu modo, dono, grupo e inode.
A abertura para escrita confere novamente os bytes e o descritor atual,
inclusive quando OverlayFS copia o arquivo da imagem para a camada gravável.

Perfis devem pertencer ao usuário do processo, ser arquivos regulares,
ter um único link e não permitir escrita por grupo ou outros. Ancestrais com
links ou escrita externa também são recusados. Arquivos acima de 1 MiB não
são editados. O diretório de comandos precisa existir na instalação.
Dois instaladores com o mesmo diretório de estado são serializados por locks.

Reexecução confere o recibo e o bloco exato e retorna current. Tentativa
parcial pode retomar os perfis ainda não editados. Se o usuário alterar um
perfil antes de o bloco ser inserido, a aplicação recusa sobrescrever o texto.
Use remove-path para encerrar a tentativa registrada sem restaurar o backup
por cima das alterações do usuário.

remove-path retira somente os blocos correspondentes, preserva texto externo
e conserva os backups. Perfis criados pelo SetupVibe são excluídos apenas se
ficarem vazios; arquivos que já existiam permanecem. A remoção preserva modo,
dono e grupo por substituição atômica do arquivo. Uma cópia nativa preserva
ACLs e atributos estendidos antes de escrever o conteúdo pelo descritor já
aberto. O Linux foi testado com root e usuário comum; macOS ainda precisa
de homologação. Falha na cópia mantém o perfil original.
Blocos alterados, incompletos, duplicados ou sem recibo são recusados.
A remoção também funciona depois de apagar o diretório de comandos.

Uma remoção parcial registra removing antes de editar e pode continuar na
próxima chamada. Um perfil sem o bloco não precisa ser reescrito. Se a
prioridade dos arquivos de login Bash mudar, remova a integração anterior
antes de instalar outra. Perfis com lógica que encerre o shell antes do bloco
podem exigir ajuste manual; o SetupVibe não reescreve essa lógica.

O bootstrap chama a prévia e o instalador de PATH antes de ativar o novo
ponteiro do produto. Seu padrão integra o shell indicado por SHELL.
--no-path pula os perfis; --shell bash ou --shell zsh escolhe o formato.
A etapa não depende de Bun instalado: usa o executável recém-verificado.

O teste real do bootstrap passou com 45 verificações em Debian 13 x64,
incluindo resolução do comando em Bash de login e interativo, repetição sem
reescrever perfis, --no-path e remoção preservando texto do usuário e o bloco
de outra instalação Server. Os testes locais também exercitam Bash e Zsh,
ZDOTDIR, nomes com aspas e espaços, backups, modos, links, concorrência,
mudanças após a prévia e retomada de instalação/remoção canceladas.

A integração ainda precisa de homologação no macOS e nos demais alvos.
Recuperação de gravação parcial de um bloco por falha do sistema e homologação
de ACLs/atributos estendidos no macOS permanecem pendentes. Backups e recibos
ficam disponíveis para reconciliação, sem edição automática de blocos ambíguos.

Referências: [Bash](https://www.gnu.org/software/bash/manual/html_node/Bash-Startup-Files.html),
[Zsh](https://zsh.sourceforge.io/Doc/Release/Files.html) e
[OverlayFS](https://docs.docker.com/engine/storage/drivers/overlayfs-driver/).

## Atualização e rollback do próprio SetupVibe

Após a publicação de uma versão, a CLI instalada pode consultar e aplicar
uma versão fixa. Os exemplos abaixo usam uma versão de referência; os
assets v2 ainda não foram publicados.

```bash
setupvibe preview-update 2.0.0 --json
setupvibe update 2.0.0 --confirm --json
setupvibe preview-rollback --json
setupvibe rollback --confirm --json
```

O diretório é inferido do executável real. Cada comando também aceita o
diretório de instalação como argumento opcional, depois da versão quando
houver versão. A instalação precisa ter marcador, launcher, recibos e current
criados pelo bootstrap. Instalações externas ou com bytes alterados não são
adotadas.

preview-update consulta `release-manifest.json` no release HTTPS oficial de
promovaweb/setupvibe. A versão, os nomes e as URLs dos assets devem corresponder
exatamente ao release pedido. Metadados têm limite de 1 MiB e prazo de
15 segundos; redirecionamentos são limitados a hosts GitHub permitidos.
A confiança é a do endpoint HTTPS oficial; não há assinatura independente.

A prévia não cria arquivos, lock ou histórico. update exige --confirm,
compartilha a exclusão com o bootstrap e registra a operação no SQLite.
O download tem limite de 256 MiB e prazo de três minutos. A versão anterior
continua ativa durante download, checksum e consulta de --version do artefato
novo. A consulta tem saída limitada, prazo e cancelamento com encerramento
do grupo do processo.

O recibo do novo nome é reservado antes da publicação do arquivo. Um download
interrompido pode ser repetido; o cache só é reutilizado quando hash e recibo
coincidem. Arquivo externo no nome de destino é recusado. O launcher de
Desktop/Server permanece com os mesmos bytes e conserva a edição.

O journal pendente registra os dois nomes e hashes antes de trocar current.
Depois da ativação, ele substitui o journal aplicado. Se o processo parar
com current já apontando para o novo arquivo e o journal ainda pendente, a
próxima ação identifica esse estado pelos bytes e pelo ponteiro. Uma tentativa
que ainda não ativou o arquivo novo não apaga o rollback da atualização anterior.

rollback valida a versão anterior registrada, confere seus bytes e consulta
--version antes de reativá-la. Não consulta a rede. Repetir update para a versão
ativa ou repetir rollback após o retorno produz current, sem outra operação.
Atualização e rollback preservam executáveis anteriores e os dados do usuário.

O bootstrap também usa essa ativação ao mudar uma versão existente:

```text
activate-release <version> <sha256> [install-directory] --confirm [--json]
```

Esse comando não baixa nada: exige artefato em cache, recibo e hash explícito
correspondentes e usa o mesmo journal. Serve também para ativação de cache
registrado em recuperação manual. O hash deve vir de uma origem confiável.
Não assume controle de um arquivo só porque ele está no diretório.

O teste real compilou duas versões em uma cópia descartável do projeto,
sem alterar package.json do worktree. Em Debian 13 x64, instalou o bootstrap
Server, atualizou entre os dois executáveis e voltou à versão anterior.
Foram 39 verificações, incluindo certificado não confiável, prévia sem escrita,
cancelamento da consulta HTTPS com código 130, checksum incorreto, bytes
anteriores alterados, journal pendente com versão ativa, rollback sem servidor
e troca pelo bootstrap seguida de rollback pela CLI. O launcher permaneceu
igual e Server manteve seu catálogo.

```bash
SETUPVIBE_SELF_UPDATE_INTEGRATION=1 SETUPVIBE_SELF_UPDATE_IMAGE=setupvibe-test-systemd:debian13 bun test tests/self-update-integration.test.ts
```

O teste usa HTTPS e CA locais com mapeamento de github.com apenas dentro do
contêiner. Não desabilita certificados, não publica portas e não instala
ferramentas no host. Ele simula a origem oficial para releases de teste; não
comprova download de uma release v2 publicada.

O cenário de metadados de perfis passou separadamente com 16 verificações,
como root e usuário comum em Debian 13. Confirmou ACL e xattr após remover
PATH e retomada depois de uma falha da cópia. No Linux, a lista explícita
de atributos faz a falha interromper a substituição. No macOS, o código usa
cp nativo com -pP, ainda sem execução real.

```bash
SETUPVIBE_PROFILE_METADATA_INTEGRATION=1 SETUPVIBE_PROFILE_METADATA_IMAGE=setupvibe-test-systemd:debian13 SETUPVIBE_PROFILE_METADATA_BINARY=/absolute/setupvibe bun test tests/profile-metadata-integration.test.ts
```

Os antigos protótipos de atualização foram substituídos pelo núcleo único.
A suíte local passou com 282 testes, 19 integrações opt-in ignoradas e nenhuma
falha. Os quatro alvos foram regenerados. TypeScript, Bash e ShellCheck passaram.

Continuam pendentes recuperação automática de lock após SIGKILL, tratamento automático de bloco de perfil parcialmente
gravado e homologação de toda a matriz. Nenhuma tag, GitHub Release ou domínio foi alterado.

Referências: [GNU cp](https://www.gnu.org/s/coreutils/manual/html_node/cp-invocation.html)
e [cp da Apple](https://github.com/apple-oss-distributions/file_cmds/blob/main/cp/cp.1).

## Atualização e rollback em About

Estado verificado em 4 de novembro de 2026. About oferece Check update e
Review rollback. U solicita versão fixa; Enter consulta; C abre confirmação;
somente UPDATE ou ROLLBACK executa a ação correspondente. Esc cancela a
consulta ou operação. Durante escrita, a navegação aguarda o executor terminar.
O rodapé informa consulta, revisão, confirmação, execução, erro e cancelamento.

A prévia registra os hashes atual e pretendido. O núcleo confere esses valores
novamente antes da escrita e sob lock; mudança posterior à revisão exige nova
consulta. O resultado pede reiniciar SetupVibe para carregar a versão ativa,
pois o processo aberto conserva sua versão. Cópias executadas pelo código-fonte
explicam a necessidade de instalação via bootstrap. Abrir About não consulta
a rede nem cria arquivos.

Os dez testes do painel cobrem três tamanhos de terminal, confirmação, retorno,
resposta tardia, ajuda, cancelamento durante execução, redimensionamento e
destruição do renderer. O teste do núcleo recusa hashes divergentes.
O cenário real HTTPS/contêiner passou com 50 verificações, incluindo atualização
pela TUI em PTY, confirmação UPDATE, encerramento e rollback pela CLI.
Não equivale à homologação dos demais sistemas e arquiteturas.

A captura about-updates-herdr.txt registra a cópia de desenvolvimento, em
consulta sem escrita. As capturas about-home-*.txt e about-update-*.txt usam
renderer nativo com fornecedor simulado. A aba temporária no Herdr foi encerrada;
os painéis anteriores foram preservados. A avaliação visual está em
[REVISAO-TUI-ATUALIZACAO.md](REVISAO-TUI-ATUALIZACAO.md).
