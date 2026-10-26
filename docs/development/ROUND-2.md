# Segunda rodada de aperfeiçoamento

> Revisão de 23/10/2026 na branch v2, sem publicação remota.

Esta rodada corrige consultas de métricas e amplia a conferência do manual.
A tarefa está no [ClickUp](https://app.clickup.com/t/17tr6jh3777), com plano,
comentários, transições de status e tempo real.

## Correções verificadas

| Situação anterior | Comportamento corrigido | Regressão |
| --- | --- | --- |
| Cursor maior que i64 era aceito quando o banco não existia | Código 2 antes de abrir o banco, com ou sem estado existente | Métricas: entradas inválidas |
| Cursor e offset positivos podiam pular registros | A combinação é recusada com código 2 | Métricas: paginação ambígua |
| Resultados sem banco omitiam campos de paginação | As chaves são preservadas em consultas vazias | Métricas: consistência das respostas |
| Links para seções removidas passavam na conferência | O check detecta âncoras ausentes em arquivos Markdown | Documentação: links e headings |
| A versão do manual vinha de um relatório histórico | A fonte passa a ser Cargo.toml | Geração e comparação do manual |

As consultas continuam sem criar diretórios ou bancos. `after` e `snapshot-id`
aceitam valores entre zero e 9223372036854775807. `after` e `offset` podem ser
usados separadamente. A combinação é recusada somente quando ambos são positivos.

Sem banco, `collector_stopped: false` significa que não há registro de parada.
Esse campo não comprova que exista um coletor em execução. Confira `collected`,
`health`, idade das amostras e o supervisor antes de interpretar disponibilidade.

## Como reproduzir

Os exemplos abaixo são consultas. Substitua o diretório por um caminho absoluto
que ainda não exista. O resultado inválido deve retornar código 2 sem criar o
caminho. Uma consulta válida deve retornar a lista vazia com metadados.

```bash
./target/debug/setupvibe --data-dir /tmp/setupvibe-consulta-ausente --output json metrics history --after 18446744073709551615
./target/debug/setupvibe --data-dir /tmp/setupvibe-consulta-ausente --output json metrics history --after 1 --offset 1
./target/debug/setupvibe --data-dir /tmp/setupvibe-consulta-ausente --output json metrics current
```

## Validação e limites

A suíte passou com 110 testes, incluindo cinco novas regressões. Também passaram
fmt, clippy, a geração e conferência do manual, Bash, ShellCheck e Markdown.
A referência mantém 97 entradas, 75 comandos finais e 375 exemplos de comandos
conferidos pelo parser. O verificador de links cobre caminhos e âncoras ATX locais.
Ele não consulta páginas externas nem interpreta exemplos como links reais.

Os binários Linux foram reconstruídos após a alteração Rust. O registro da rodada
em `ROUND-2.json` identifica os resultados e hashes dos artefatos conferidos.
Os dez testes de integração da primeira rodada permanecem registrados no relatório
anterior. Os cinco testes de distribuição passaram novamente com os artefatos desta rodada,
incluindo as duas edições por HTTPS e Debian 12/13 e Ubuntu 24.04 amd64.

A versão continua 2.0.0-alpha.1, ainda não publicada. macOS e ARM permanecem sem
homologação nativa nesta máquina. Não houve instalação de pacotes no host,
commit, push, release ou deploy.
