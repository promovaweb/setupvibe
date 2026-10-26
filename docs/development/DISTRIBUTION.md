# Instalação e distribuição da v2

> Código e artefatos locais da versão `2.0.0-alpha.1`. Publicação dos domínios e da GitHub Release não foi executada nesta implementação.

## Entradas por edição

O contrato de distribuição mantém duas entradas. Após publicar os scripts e
artefatos correspondentes, os comandos serão:

```bash
curl -fsSL https://desktop.setupvibe.dev | bash
curl -fsSL https://server.setupvibe.dev | bash
```

`desktop.sh` e `server.sh` são bootstraps novos da v2. Ambos derivam de
`scripts/templates/bootstrap.sh`; o gerador fixa edição e versão de
`Cargo.toml`. Não são os instaladores legados. Cada entrada instala somente
o executável `setupvibe`; a preparação de componentes ocorre depois, pelo CLI
ou pela revisão da TUI. Não abre interface dentro do pipe nem pede senha.

Não use os domínios como comprovação desta entrega antes de publicar e conferir
se servem estes arquivos. Para revisão local, use `bash desktop.sh --dry-run`
ou `bash server.sh --dry-run`.

## Plataformas e artefatos

| Ambiente | Edição | Target |
| --- | --- | --- |
| Debian 12/13 e Ubuntu 24.04 amd64 | Desktop e Server | `x86_64-unknown-linux-musl` |
| Debian 12/13 e Ubuntu 24.04 arm64 | Desktop e Server | `aarch64-unknown-linux-musl` |
| macOS 14+ Intel | Desktop | `x86_64-apple-darwin` |
| macOS 14+ Apple Silicon | Desktop | `aarch64-apple-darwin` |

Linux usa musl estática para não depender da glibc da máquina de build. O
bootstrap lê `ID` e `VERSION_ID` sem executar `/etc/os-release`. macOS usa
`sw_vers`; Server no macOS é recusada. Arquiteturas e distribuições fora da
tabela são recusadas antes de criar o destino. A compatibilidade dos aplicativos
continua sujeita às limitações de cada fornecedor; binário compatível não
comprova que todos os aplicativos funcionam naquela máquina.

A edição padrão é compilada no binário: sem features, Desktop; com
`server-default`, Server. `SETUPVIBE_EDITION` substitui esse padrão, e
`--edition` explícito prevalece. Nenhum wrapper precisa alterar o PATH ou
passar uma edição silenciosamente. O catálogo filtra os seis componentes
permitidos quando Server está ativa.

Nome de artefato:

```text
setupvibe-server-2.0.0-alpha.1-x86_64-unknown-linux-musl
setupvibe-server-2.0.0-alpha.1-x86_64-unknown-linux-musl.sha256
setupvibe-server-2.0.0-alpha.1-x86_64-unknown-linux-musl.json
```

O arquivo sem extensão é o executável, não um tarball. `.sha256` contém uma
linha com hash e nome exato; `.json` informa schema, versão, edição, target,
SHA-256 e tamanho. A URL padrão é
`https://github.com/promovaweb/setupvibe/releases/download/vVERSÃO/ARTEFATO`.

## Fluxo de instalação

1. Validar parâmetros, sistema, arquitetura e edição.
2. Mostrar versão, target, destino e URL. `--dry-run` termina aqui sem escrita.
3. Conferir curl e SHA-256; recusar symlinks e diretórios graváveis por terceiros.
4. Obter lock exclusivo e criar staging privado no mesmo filesystem do destino.
5. Recusar executável externo ou alterado sem recibo correspondente.
6. Baixar executável e checksum por HTTPS, com timeout e tentativas limitadas.
7. Conferir nome, formato, SHA-256 e resposta de `--version`.
8. Substituir o executável por rename e salvar recibo; mostrar comando de uso.

`curl -q` ignora configuração implícita de `.curlrc`; download e
redirecionamentos aceitam somente HTTPS. Não há `--insecure`. O checksum
confere integridade do artefato recebido. Como vem do mesmo canal HTTPS, não é
uma assinatura independente nem substitui a confiança na conta da release.
Assinatura/notarização Apple não foi implementada; não há comando para contornar
Gatekeeper. Uma distribuição assinada exige credenciais e publicação próprias.

O destino padrão é `$HOME/.local/bin/setupvibe`. O recibo
`$HOME/.local/bin/.setupvibe.sha256` comprova qual conteúdo o bootstrap gravou.
Repetir o bootstrap permite atualizar o executável gerenciado. Mudança externa
no arquivo interrompe a substituição. Instalação manual sem recibo exige ação
explícita do operador para mover o arquivo anterior antes de usar o bootstrap;
não existe flag que adote automaticamente um executável.

Cada rename é atômico. A troca do executável e do recibo não é uma transação
única: queda de energia entre eles pode deixar divergência, que será recusada
na próxima tentativa. Falha normal ao salvar recibo restaura o executável
anterior. Staging e lock são removidos ao terminar ou falhar; SIGKILL pode deixar
lock. Confira processos antes de remover `.setupvibe-bootstrap.lock` residual.
O bootstrap não remove bancos, projetos, volumes, credenciais ou aplicativos.

## Parâmetros e execução remota

| Entrada | Uso |
| --- | --- |
| `--version VERSÃO` | Solicitar versão exata publicada, sem prefixo `v` |
| `--install-dir CAMINHO` | Destino absoluto, sem symlinks nos ancestrais |
| `--dry-run` | Mostrar plataforma, URL e destino sem baixar ou escrever |
| `--non-interactive`, `--yes` | Aceitos; bootstrap já não faz perguntas |
| `SETUPVIBE_INSTALL_DIR` | Padrão do diretório, substituído pela flag |
| `SETUPVIBE_DOWNLOAD_BASE` | Espelho HTTPS confiável com mesma estrutura de releases |

Nenhum perfil do shell é editado. Se o destino não estiver no PATH, a saída
mostra `export PATH=...:"$PATH"` com escape apropriado. Esse comando vale para
a sessão; o operador pode inseri-lo no arquivo de inicialização adequado ao
seu shell. Em automação, prefira caminho absoluto para não depender do perfil.
Não execute o bootstrap com `sudo` por hábito: isso seleciona o HOME de root.
A instalação de componentes que exige privilégios é tratada pelo núcleo.

Exemplo após a publicação dos endpoints:

```bash
curl -fsSL https://server.setupvibe.dev | bash -s -- --non-interactive
"$HOME/.local/bin/setupvibe" --output json catalog list
ssh servidor 'curl -fsSL https://server.setupvibe.dev | bash -s -- --non-interactive'
ssh servidor '"$HOME/.local/bin/setupvibe" --output json doctor'
```

Uma atualização do executável principal não troca o binário privado do serviço
coletor em execução. Depois de revisar, use `setupvibe collector update --yes`;
o supervisor atualiza sua cópia, preserva configuração e reinicia o serviço.
O bootstrap não reinicia serviços automaticamente.

## Builds locais e CI

```bash
npm run bootstrap:generate
npm run bootstrap:check
npm run build:linux
node --test tests/integration/distribution.mjs
```

`build:linux` executa `Dockerfile.distribution` em Docker Buildx, com imagem Rust
Alpine fixada por digest e dependências Cargo fixadas pelo lockfile. Compila as
duas edições nativas, exporta para `target/distribution/` e empacota em `dist/`.
Não instala toolchain ou pacotes no host. O contexto Docker inclui somente
Cargo, código e catálogo. Builds de arm64 exigem executor arm64 nativo neste
fluxo; não são rotulados como testados por cross-compilation.

No macOS:

```bash
MACOSX_DEPLOYMENT_TARGET=14.0 cargo build --locked --release --target aarch64-apple-darwin
npm run package -- desktop aarch64-apple-darwin target/aarch64-apple-darwin/release/setupvibe
```

Troque o target para `x86_64-apple-darwin` em Mac Intel. O empacotador executa o
binário, confere versão, edição padrão, arquitetura e formato. Linux exige
formato estático; macOS exige Mach-O. Não basta renomear um binário GNU para
musl ou atribuir outra arquitetura ao arquivo.

`.github/workflows/verify.yml` executa testes em Ubuntu 24.04 e builds em Linux
amd64/arm64 e macOS Intel/ARM. Ações estão fixadas por commit. Os artefatos ficam
na execução do workflow por 14 dias. O workflow tem permissão somente de
leitura do repositório e não cria release, tag, deploy ou alterações nos
endereços públicos. A existência desse arquivo não comprova execução remota.

## Condições de sucesso e limitações

O bootstrap só informa `Instalado` após conferir checksum/versão e gravar o
executável com seu recibo. Consulta do catálogo deve mostrar 26 componentes
Desktop ou seis Server sem precisar de `--edition` adicional. Prévia não cria
diretório, consulta não inicializa banco e repetição preserva perfis.

Testes automatizados cobrem transporte falho, checksum incorreto, HTML em vez
de executável, instalação externa, symlinks, concorrência, edição, parâmetros e
PATH. Integração usa HTTPS local com certificado confiado explicitamente, sem
desativar TLS, e executa os binários reais em containers Debian 12/13 e Ubuntu
24.04. Resultados efetivamente executados ficam no [mapa de aceitação](ACCEPTANCE.md).
macOS e arm64 precisam de execução nos runners correspondentes e homologação
dos aplicativos; não se presume equivalência com Debian amd64.

## Referências oficiais

- [Targets e níveis de suporte Rust](https://doc.rust-lang.org/rustc/platform-support.html).
- [Targets macOS e deployment target](https://doc.rust-lang.org/rustc/platform-support/apple-darwin.html).
- [Opções de transporte curl](https://curl.se/docs/manpage.html).
- [Runners GitHub Actions](https://docs.github.com/en/actions/reference/runners/github-hosted-runners).
- [Supervisão e atualização do coletor](SUPERVISION-AGENTS.md).
