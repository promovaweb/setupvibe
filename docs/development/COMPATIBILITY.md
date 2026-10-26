# Edições e compatibilidade

Desktop reúne ferramentas de programação, assistentes e serviços locais. Server
contém somente seis componentes e aceita Linux. Ambas usam o mesmo núcleo e
impedem componentes de outra edição antes de instalar dependências.

## Matriz de componentes

Gerenciador indica a instalação nova. Atualizações respeitam a origem observada
na máquina, quando ela pode ser comprovada. A coluna macOS descreve Desktop.

| Componente | Desktop | Server | Linux | macOS |
| --- | --- | --- | --- | --- |
| Git (`git`) | Sim | Sim | system | brew |
| GitHub CLI (`gh`) | Sim | Sim | system | brew |
| Docker (`docker`) | Sim | Sim | system | brew |
| Portainer CE (`portainer`) | Sim | Sim | docker | docker |
| Tailscale (`tailscale`) | Sim | Sim | system | brew |
| Coletor nativo (`collector`) | Sim | Sim | native | native |
| mise (`mise`) | Sim | Não | vendor | brew |
| Homebrew (`homebrew`) | Sim | Não | vendor | vendor |
| Herdr (`herdr`) | Sim | Não | vendor | vendor |
| Ansible (`ansible`) | Sim | Não | system | brew |
| Codex (`codex`) | Sim | Não | vendor | vendor |
| Claude Code (`claude`) | Sim | Não | vendor | vendor |
| Antigravity (`antigravity`) | Sim | Não | vendor | vendor |
| OpenCode (`opencode`) | Sim | Não | vendor | vendor |
| Kimi (`kimi`) | Sim | Não | vendor | vendor |
| Node.js (`node`) | Sim | Não | mise | mise |
| Python (`python`) | Sim | Não | mise | mise |
| Go (`go`) | Sim | Não | mise | mise |
| Rust (`rust`) | Sim | Não | mise | mise |
| Php (`php`) | Sim | Não | mise | mise |
| Ruby (`ruby`) | Sim | Não | mise | mise |
| Java (`java`) | Sim | Não | mise | mise |
| Bun (`bun`) | Sim | Não | mise | mise |
| PostgreSQL (`postgresql`) | Sim | Não | docker | docker |
| Redis (`redis`) | Sim | Não | docker | docker |
| Mailpit (`mailpit`) | Sim | Não | docker | docker |

System representa APT nas distribuições Linux habilitadas. Brew é Homebrew,
mise gerencia runtimes globais, vendor usa instalador oficial, docker cria
serviço e native instala a supervisão do coletor. A presença na matriz não
comprova disponibilidade para qualquer versão do sistema ou CPU.

## Sistemas e arquiteturas

| Sistema | Alvo inicial | Resultado executado |
| --- | --- | --- |
| Debian 13 | amd64 e arm64, ambas as edições | Contratos e integrações amd64 com ferramentas reais |
| Debian 12 | amd64 e arm64, ambas as edições | Binário musl, SQLite, coletor e métricas em container amd64 |
| Ubuntu 24.04 | amd64 e arm64, ambas as edições | Binário musl, SQLite, coletor e métricas em container amd64 |
| macOS 14+ | Intel e Apple Silicon, Desktop | Implementação e workflow disponíveis, execução física pendente |
| Outros sistemas | Sem alvo habilitado | Recusa antes de mutações |

Docker Desktop é o runtime escolhido para macOS e precisa estar funcionando
para os serviços. Containers medidos nesse ambiente pertencem à VM Docker,
enquanto CPU, RAM e discos do host vêm do macOS. Essas duas origens não têm
valores automaticamente equivalentes. O coletor usa LaunchAgent em sessão
gráfica, sem prometer o comportamento de um serviço systemd de servidor.

Antigravity exige recursos de CPU do fornecedor. Na máquina de teste, a falta
de PCLMUL produziu recusa antes da instalação. Esse aplicativo ainda precisa
de homologação em hardware adequado. Autenticação, licenças e acesso remoto
dos assistentes não são fornecidos pelo SetupVibe.

## Escolher e conferir a edição

O bootstrap fixa o padrão no executável. A flag substitui esse padrão por
invocação e a variável SETUPVIBE_EDITION permite definir o ambiente. A TUI
permite alternar a edição sem mover os bancos ou alterar componentes.

```bash
setupvibe --edition desktop catalog list
setupvibe --edition server catalog list
setupvibe --edition server catalog show portainer
setupvibe --edition server doctor --output json
setupvibe --edition server component install redis --dry-run
```

O último comando retorna código 3 porque Redis não pertence à Server. Nenhuma
dependência é instalada. Para avaliar a máquina, confira doctor, versões do
sistema e o [mapa de aceitação](ACCEPTANCE.md) antes de assumir suporte testado.

## Condições de sucesso e pendências

A Server deve listar Git, gh, Docker, Portainer, Tailscale e coletor. O catálogo
Desktop lista 26 componentes. Instalações externas permanecem preservadas.
A matriz física macOS/arm64 e a homologação de aplicativos nessas plataformas
continuam pendentes. Os serviços são compartilhados por host e não isolados
automaticamente por projeto. Os [contratos](CONTRACTS.md) registram essas
escolhas e a [distribuição](DISTRIBUTION.md) descreve os artefatos correspondentes.
