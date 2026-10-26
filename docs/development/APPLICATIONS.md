# Aplicativos essenciais

Os comandos dedicados usam o mesmo catálogo, plano, histórico e verificação
que `component install`, `component verify` e `component update`.
A prévia não baixa scripts, não instala dependências e não cria bancos.

## Capacidades e edições

| Componente | Desktop | Server | Proprietário inicial |
| --- | --- | --- | --- |
| Git, gh | Sim | Sim | APT no Linux; Homebrew no macOS |
| Ansible | Sim | Não | APT no Linux; Homebrew no macOS |
| Herdr, Codex, Claude, Antigravity, OpenCode, Kimi | Sim | Não | Fornecedor oficial |
| Portainer | Sim | Sim | Docker; implementação acompanhada na tarefa 07 |
| Tailscale | Sim | Sim | Implementação acompanhada na tarefa 08 |
| mise | Sim | Não | Fornecedor no Linux; Homebrew no macOS |
| Homebrew | Sim | Não | Instalador oficial; exige usuário sem root |

Instalações existentes são verificadas e preservadas. O SetupVibe só atribui
um recibo `vendor:<id>` quando executou uma instalação nova. Uma origem
externa desconhecida não é adotada para atualizar. Configurações, autenticação,
sessões, repositórios e chaves não integram o plano nem são removidos.

## Fluxo de instalação

1. Validar edição, plataforma, opções e dependências.
2. Consultar presença e proprietário, sem executar login.
3. Exigir `--yes`, obter exclusividade e registrar a operação.
4. Preparar utilitários ausentes no Linux via APT: curl, certificados, Bash,
   tar, gzip, unzip e xz. Homebrew também requer ferramentas de compilação.
5. Baixar o instalador oficial por HTTPS em diretório privado, com limites
   de tamanho e tempo. Redirecionamentos também precisam usar HTTPS.
6. Executar o adaptador, verificar o executável e persistir seu recibo.
7. Expor resultado e versão observada, ou uma falha por componente.

O usuário deve executar como sua identidade normal. APT usa `sudo -n` quando
necessário; ausência de autorização retorna falha sem pedir senha. Homebrew
não pode ser instalado como root. O macOS precisa dos Command Line Tools
exigidos pelo Homebrew; essa instalação do sistema não é simulada como sucesso.

## Diferenças entre fornecedores

| Aplicativo | Estratégia | Preservação |
| --- | --- | --- |
| Herdr | Instalador oficial com manifesto e SHA-256 | Não escreve perfis |
| Codex | Instalador standalone oficial, não interativo | Destino no PATH do subprocesso evita alteração do perfil |
| Claude | Instalador nativo oficial, canal stable | Credenciais permanecem no diretório do fornecedor |
| Antigravity | Manifesto oficial, SHA-512, troca do executável após verificar versão | Não executa o configurador de aliases do instalador |
| OpenCode | Instalador oficial da geração 1 | `--no-modify-path`; não migra automaticamente para geração 2 |
| Kimi | Instalador Kimi Code atual | `KIMI_NO_MODIFY_PATH=1`; instalação antiga presente é preservada |
| mise | Instalador oficial com checksum | Não executa ativação do shell |

Os scripts oficiais são confiados por sua origem HTTPS; isso não equivale a
uma assinatura independente do script. Herdr, mise, Codex, Claude e Kimi
verificam os artefatos conforme seus instaladores. Antigravity tem verificação
SHA-512 no adaptador Rust. O instalador OpenCode 1 consultado não fornece a
mesma garantia por checksum e essa diferença não deve ser ocultada.

Os diretórios `.local/bin`, `.opencode/bin` e `.kimi-code/bin` são procurados
além do PATH. O SetupVibe não reescreve `.bashrc`, `.zshrc` ou arquivos fish.
A configuração do PATH para o terminal do usuário permanece explícita.

## Uso

```bash
setupvibe git verify --output json
setupvibe gh install --dry-run --output json
setupvibe herdr install --yes --non-interactive
setupvibe codex update --yes --output ndjson
setupvibe claude install --yes
setupvibe antigravity install --dry-run
setupvibe opencode verify --output json
setupvibe kimi update --yes
setupvibe ansible install --yes
setupvibe component install mise --yes
setupvibe component install homebrew --yes
```

Cada comando dedicado aceita `install`, `verify` e `update`. `install` e
`update` aceitam as opções validadas do componente via `--option CHAVE=VALOR`.
As opções globais são as mesmas documentadas no [CLI](CLI.md).

A consulta `updates list` de fornecedor retorna `available: null` quando
não existe comparação independente implementada. Não representa "atualizado".
A operação explícita `update` deixa o instalador oficial resolver a versão.
APT, Homebrew e mise seguem a descoberta descrita em [adaptadores](ADAPTERS.md).

## Condições de sucesso e testes

Uma instalação só termina com sucesso quando o comando de versão existe,
termina com código zero e o estado registra o caminho observado. Repetir
`install` preserva a instalação existente e retorna `unchanged`. A Server
recusa assistentes, Herdr e Ansible antes de preparar dependências.

`tests/adapters.test.mjs` cobre recibo de fornecedor, repetição, atualização,
prévia sem download, preservação de perfil, resposta HTML inválida e recusas
por edição. `tests/integration/vendors.mjs` executa instaladores reais em
Debian 13 descartável, sem montar credenciais ou o socket Docker do host.
A execução real e os resultados ficam na tarefa 06; outras plataformas
exigem homologação própria.

## Referências oficiais consultadas em 22/10/2026

- [Herdr](https://github.com/herdrdev/herdr).
- [Codex CLI](https://developers.openai.com/codex/cli/).
- [Claude Code](https://code.claude.com/docs/en/setup).
- [Antigravity CLI](https://antigravity.google/docs/getting-started?tab=cli).
- [OpenCode](https://opencode.ai/docs/).
- [Kimi Code](https://github.com/MoonshotAI/kimi-code).
- [mise](https://mise.jdx.dev/getting-started.html).
- [Homebrew](https://docs.brew.sh/Installation).

## Resultado da execução isolada

Em Debian 13 x86_64 foram instalados e verificados mise 2026.10.17,
Herdr 0.9.5, Codex 0.163.0, Claude Code 2.1.308, OpenCode 1.19.4 e
Kimi Code 2.3.0. Todos preservaram `.bashrc` e retornaram `unchanged` ao
repetir a instalação. Esses números registram o teste, sem fixar o canal
"mais recente" para instalações futuras.

O artefato oficial Antigravity 1.4.5 Linux amd64 falhou na execução por exigir
PCLMUL. O processador deste ambiente não expõe essa instrução. O adaptador
agora retorna código 3 antes de baixar ou instalar nesse caso; a prévia
mostra a incompatibilidade. O checksum foi conferido no ensaio inicial, mas
a execução completa precisa de CPU compatível. Não é uma homologação positiva.

O planejador inclui o bootstrap Homebrew automaticamente quando o adaptador
da plataforma o exige. A matriz macOS continua pendente de execução real.
