# Tailscale

> Instalar, verificar e atualizar. Nenhuma autenticação de rede é gerenciada.

## Escopo e edições

Desktop e Server incluem Tailscale. A Server continua sem Homebrew e usa APT
nos sistemas Linux habilitados. O catálogo oferece somente `install`, `verify`
e `update`; comandos de login, logout, Serve, Services e Funnel não existem
na fachada SetupVibe. Tokens administrativos e chaves de autenticação não são
parâmetros de instalação.

## Instalação por plataforma

| Plataforma | Instalação nova | Atualização |
| --- | --- | --- |
| Debian 12/13 e Ubuntu 24.04 | Repositório oficial stable assinado via APT | Pacote do proprietário APT observado |
| macOS Desktop | Fórmula Homebrew `tailscale`, variante CLI `tailscale`/`tailscaled` | Fórmula Homebrew quando a origem é comprovada |
| Aplicativo macOS existente | Preservado; não substituir pela fórmula | Origem não comprovada é recusada para atualização automática |

No Linux, o adaptador baixa a chave do distribuidor por HTTPS e cria arquivos
`setupvibe-tailscale` em keyrings e sources.list.d. APT valida a assinatura dos
pacotes. Fontes Tailscale existentes são preservadas, inclusive seu canal.
A nova fonte só é criada quando não existe uma fonte do fornecedor.
Arquivos de mesmo nome inesperados são preservados e causam recusa.

Quando systemd está ativo, a instalação habilita e inicia `tailscaled`.
No macOS, a fórmula nova inicia o serviço com `sudo -n brew services start`.
Isso prepara o daemon, sem autenticar o dispositivo. Falta de privilégio é
informada e não provoca pergunta de senha. Em ambiente sem supervisor, pacote
instalado não significa daemon em execução.

A variante CLI do macOS é uma escolha da v2 para automação; não tem a mesma
integração gráfica das variantes App Store ou standalone. O fornecedor
recomenda o aplicativo standalone para uso geral. A v2 detecta
`/Applications/Tailscale.app` e não instala outra variante por cima; coexistência
com um executável diferente é informada para revisão. A plataforma ainda
exige homologação própria, inclusive disponibilidade de bottles do Homebrew.

## Fluxo e condições de sucesso

1. Identificar edição, sistema, caminho e proprietário.
2. Exibir a prévia sem baixar chave, configurar APT ou criar estado.
3. Exigir `--yes` para instalar ou atualizar.
4. Executar somente a operação do gerenciador selecionado.
5. Conferir `tailscale version` e persistir a observação.

`verify` comprova a instalação e a versão do binário. Não exige conta, tailnet,
conectividade de túnel ou autenticação. Consulta também `status --json`,
projetando apenas BackendState e os estados do daemon/autenticação. URLs de
login, peers e contas não aparecem na resposta. Instalação existente retorna `unchanged`.
Atualização exige origem conhecida e preserva dados/configurações. Ausência do
binário retorna 4; plataforma sem adaptador retorna 3; entrada inválida retorna 2.

## Exemplos

```bash
setupvibe tailscale install --dry-run --output json
setupvibe --edition server tailscale install --yes --non-interactive
setupvibe tailscale verify --output json
setupvibe tailscale update --dry-run
setupvibe tailscale update --yes --output ndjson
setupvibe updates list tailscale --output json
```

A descoberta APT consulta a base local, sem atualizar índices durante uma
consulta. A execução autorizada atualiza índices antes da instalação ou
atualização. Não trocar a variante ou o gerenciador para contornar uma falha.
A prévia de atualização informa que a conexão pode ser interrompida. Se o SSH
depende do Tailscale, mantenha acesso alternativo; não há garantia de continuidade.

## Diagnóstico e limites

Uma versão válida com daemon ausente continua sendo uma instalação presente.
A disponibilidade de rede depende do daemon e da configuração feita fora do
SetupVibe. Esta fachada não chama `tailscale up` como teste e não cria URLs de
login. Problemas de autenticação não são tratados como pacote ausente.

O teste controlado comprova que a verificação só consulta `version` e
`status --json`, omite URLs de autenticação e peers, e que comandos fora do
escopo são recusados pelo parser. A repetição de `install` consulta a versão. O teste
`tests/integration/tailscale.mjs` instala e atualiza o pacote real em Debian
13 descartável, verifica origem APT e preservação de arquivo de estado,
sem autenticar um dispositivo ou montar credenciais do host.

## Referências oficiais

- [Instalação Linux](https://tailscale.com/docs/install/linux).
- [Pacotes stable e distribuições](https://pkgs.tailscale.com/stable/).
- [Variantes macOS](https://tailscale.com/docs/concepts/macos-variants).
- [Fórmula Homebrew](https://formulae.brew.sh/formula/tailscale).

Resultado em 22/10/2026: Tailscale 1.104.2, proprietário `system:tailscale`,
instalação repetida `unchanged`, atualização concluída e arquivo de estado
preservado. A integração levou cerca de 15 segundos. Nenhuma autenticação foi
solicitada. Esse ensaio não homologa macOS, ARM64 ou conectividade de tailnet.
