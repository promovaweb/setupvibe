# Estado local e histórico

> Implementado em `2.0.0-alpha.1`, com SQLite embarcado 3.53.2.

## Diretório e bancos

A flag global `--data-dir` e a variável `SETUPVIBE_DATA_DIR` selecionam um
diretório absoluto. Sem elas, Linux usa `$XDG_DATA_HOME/setupvibe` ou
`$HOME/.local/share/setupvibe`; macOS usa
`$HOME/Library/Application Support/setupvibe`.
A identidade do serviço deve usar o mesmo caminho das consultas.

O diretório final deve pertencer ao usuário efetivo e ter modo 0700.
Bancos criados pelo aplicativo usam 0600. Symlinks nos bancos e no diretório
final são recusados. O filesystem deve ser local.

`setupvibe.db` guarda configuração, instalações observadas, operações,
etapas e recursos gerenciados. `metrics.db` tem sessões, amostras e saúde
do coletor. Ambos usam schema 1, WAL e espera máxima de cinco segundos.
Estado usa synchronous FULL; métricas usam NORMAL.

## Migração e recuperação

A criação do schema e o registro em schema_migrations acontecem na mesma
transação. Banco com versão futura ou tabelas desconhecidas sem versão é
recusado. Migrações posteriores devem incluir backup consistente antes da
alteração; esta versão apenas cria schema 1, sem migrar schemas históricos.

Locks de kernel por diretório serializam operações, alterações de schema e
coletores. Ao encerrar um processo abruptamente, o kernel libera seu lock.
O arquivo do lock não é removido, evitando troca de inode durante concorrência.
Downloads e instalações não devem manter transações SQLite abertas.

Reconciliação exige exclusividade. Operações running sem executor ativo são
marcadas unknown; etapas já concluídas são preservadas. Os adaptadores
reobservam presença, versão, caminho ou ID Docker e proprietário, sem instalar
ou adotar recursos externos. Erros individuais aparecem na resposta e não
transformam dados indisponíveis em sucesso. A tabela local não comprova o
estado atual do host; atualizar sempre exige uma nova consulta ao adaptador.

## state status

Consulta diagnósticos e observações. Não cria diretório ou banco ausente.
Não exige autorização de mutação.

```bash
setupvibe state status
setupvibe --output json state status
setupvibe --edition server state status
setupvibe --data-dir /var/lib/setupvibe state status
setupvibe --output ndjson state status
```

## state init

Cria os dois bancos sem instalar componentes. Exige `--yes`.
Uma segunda execução preserva dados e não repete a migração.
`--dry-run` apenas informa a intenção.

```bash
setupvibe state init --dry-run
setupvibe state init --yes
setupvibe --data-dir /var/lib/setupvibe state init --yes
setupvibe --edition server state init --yes
setupvibe --output json state init --yes --non-interactive
```

## state reconcile

Reclassifica operações interrompidas e consulta novamente os adaptadores dos
componentes registrados. Não transfere propriedade e não reinstala componentes.
Exige `--yes`; bancos ausentes são inicializados.

```bash
setupvibe state reconcile --dry-run
setupvibe state reconcile --yes
setupvibe --output json state reconcile --yes
setupvibe --data-dir /var/lib/setupvibe state reconcile --yes
setupvibe --edition server state reconcile --yes --non-interactive
```

## state backup

Usa a API SQLite para copiar consistentemente o banco de estado.
Não inclui métricas. `--destination` recebe caminho absoluto obrigatório
em diretório privado. O arquivo de destino precisa não existir.
Exige `--yes`. Um backup é dado local e deve continuar protegido.

```bash
setupvibe state backup --destination /tmp/setupvibe-backups/estado.db --dry-run
setupvibe state backup --destination /tmp/setupvibe-backups/estado.db --yes
setupvibe --output json state backup --destination /tmp/setupvibe-backups/revisao.db --yes
setupvibe --edition server state backup --destination /tmp/setupvibe-backups/server.db --yes
setupvibe --data-dir /var/lib/setupvibe state backup --destination /var/lib/setupvibe/backups/estado.db --yes
```

## operation list e show

List recebe `--limit` entre 1 e 1000 (padrão 100) e `--offset`
inteiro não negativo (padrão zero). Show recebe ID obrigatório e inclui
etapas. Consultas não criam banco; show desconhecido retorna 2.

```bash
setupvibe operation list
setupvibe operation list --limit 10
setupvibe operation list --limit 10 --offset 10
setupvibe --output json operation list
setupvibe --data-dir /var/lib/setupvibe operation list
```

Substitua ID pelo identificador retornado por list:

```bash
setupvibe operation show ID
setupvibe --output json operation show ID
setupvibe --output ndjson operation show ID
setupvibe --edition server operation show ID
setupvibe --data-dir /var/lib/setupvibe operation show ID
```

## Testes e limites

A suíte Node.js valida bancos reais isolados: integridade, schema futuro,
transação interrompida, timeout, permissões, backup e reconciliação.
A suíte final passou com 105 testes em Debian 13 x86_64.
A consulta com escritor ocupado retornou código 6 em cerca de cinco segundos.

O coletor e suas consultas de retenção foram validados com bancos reais isolados.
Consulte [métricas](METRICS.md) e o [mapa de aceitação](ACCEPTANCE.md) para cenários,
integrações e limites de plataforma.
