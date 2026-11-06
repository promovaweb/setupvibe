# Herdr no SetupVibe 2

Estado em 5 de novembro de 2026: fornecedor oficial implementado para Desktop
em Linux e macOS, com teste local e integração real opt-in. A execução em
macOS ainda precisa de homologação.

## Escopo e propriedade

Herdr é um multiplexador de terminal para agentes. O SetupVibe instala o
binário oficial de `herdrdev/herdr` em um diretório privado e não altera PATH,
configuração, sessões ou credenciais existentes. A edição Server recusa o
recurso.

A versão é sempre explícita. O resolvedor consulta o release fixo no GitHub e
exige tag, nome do asset, tamanho, URL e SHA-256 exatos. Linux usa
`herdr-linux-x86_64` ou `herdr-linux-aarch64`; macOS usa
`herdr-macos-x86_64` ou `herdr-macos-aarch64`. Não há resolução de `latest`.

O download respeita HTTPS, hosts de redirecionamento permitidos, limite de
64 MiB e prazo de três minutos. O binário é gravado com modo 0700, tem a
versão confirmada por `herdr --version` e só então é registrado no SQLite.
Metadados guardam também tamanho e hash do binário extraído.

Uma instalação externa não é adotada. Atualização cria outra localização e
preserva a versão anterior. A remoção arquiva somente o diretório registrado,
mantendo configuração e credenciais do Herdr que já existirem no computador.
PATH e autenticação não são configurados automaticamente.

## preview-herdr

Uso: `preview-herdr <version> [--json]`. A versão deve ser fixa, no formato
`MAJOR.MINOR.PATCH`. A prévia consulta o release e o registro local, sem criar
banco, diretório ou lock. O resultado informa `install`, `update` ou `current`.

```bash
bun src/cli.ts preview-herdr 0.9.5
bun src/cli.ts preview-herdr 0.9.5 --json
bun src/cli.ts preview-herdr 0.9.4 --json
SETUPVIBE_STATE_DIR="$HOME/.local/state/setupvibe-herdr-review" \
  bun src/cli.ts preview-herdr 0.9.5 --json
bun src/cli.ts --server preview-herdr 0.9.5 --json
```

O último exemplo demonstra a recusa no Server. A prévia não baixa o binário
e não substitui a versão ativa. Falha da API do GitHub é distinta de ausência
do release; `GH_TOKEN` ou `GITHUB_TOKEN` podem ser usados sem aparecer na saída.

## install-herdr

Uso: `install-herdr <version> --confirm [--json]`. Sem `--confirm`, o comando
falha antes de criar estado. A instalação repete a consulta, baixa o asset,
confere o SHA-256, executa a verificação de versão e registra a propriedade.

```bash
bun src/cli.ts install-herdr 0.9.5 --confirm
bun src/cli.ts install-herdr 0.9.5 --confirm --json
bun src/cli.ts install-herdr 0.9.4 --confirm --json
SETUPVIBE_STATE_DIR="$HOME/.local/state/setupvibe-herdr-owned" \
  bun src/cli.ts install-herdr 0.9.5 --confirm --json
bun src/cli.ts install-herdr 0.9.5 --json
```

O último exemplo mostra a recusa sem confirmação. Reexecutar a mesma versão
retorna `current`. Trocar o diretório de estado não adota uma instalação feita
em outro banco. Bytes alterados, vínculo simbólico ou metadados divergentes
impedem atualização e remoção automática.

## Resources e manifesto

Em Resources, selecione Herdr, pressione V, informe a versão e revise. C abre
a confirmação `INSTALL`. Execute action usa o mesmo executor. A remoção segue
a ação `Uninstall` e arquiva o diretório privado.

O manifesto schemaVersion 1 aceita `kind: application`, `id: herdr` e uma
versão fixa. A seleção é recusada no Server e em plataformas fora da matriz.

```json
{
  "schemaVersion": 1,
  "resources": [
    { "kind": "application", "id": "herdr", "version": "0.9.5" }
  ]
}
```

## Verificação

O teste local cobre identidade do asset, digest, plataforma, confirmação,
cache de metadados, limite da API e mensagem de erro. O teste real opt-in
instala 0.9.5 e 0.9.4 em diretório descartável, confirma reexecução,
preservação da versão anterior, recusa após alteração dos bytes e remoção da
versão registrada.

```bash
SETUPVIBE_HERDR_INTEGRATION=1 bun test tests/install-herdr.test.ts
```

A execução real em macOS e a homologação de ARM64 continuam pendentes. O
fornecedor não configura PATH, autenticação, integrações com agentes ou
configuração do Herdr.
