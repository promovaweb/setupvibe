# Aceitação do SetupVibe 2

> Registro de 22/10/2026 para `2.0.0-alpha.1`, branch `v2`. Código local, sem publicação Git.

## Ambientes e alcance

O ambiente principal é Debian 13 amd64, Rust 1.94.1 e Node.js 26.8.1. Testes
com mutações usam HOME privado, comandos controlados ou containers descartáveis.
Não instalam aplicativos nem serviços no host do desenvolvedor. Docker-in-Docker
usa daemon próprio, sem montar socket, volumes ou credenciais do host.

Contrato aprovado em teste não equivale a homologação de todos os sistemas.
A matriz inicial inclui Debian 12/13 e Ubuntu 24.04 amd64/arm64 e macOS 14+
Desktop Intel/Apple Silicon. macOS e arm64 ainda não foram executados nesta
sessão. Os workflows correspondentes foram implementados e validados
estaticamente; não há comprovação de execução remota.

## Cenários A01–A22

| ID | Cenário | Resultado e comprovação |
| --- | --- | --- |
| A01 | Bootstrap por edição | Aprovado: HTTPS local com certificado validado, SHA-256 e executáveis musl reais Desktop/Server; edição padrão e override conferidos |
| A02 | Plataforma desconhecida | Aprovado no contrato: catálogo/planejador e bootstrap recusam plataformas e arquiteturas fora da matriz antes de mutações |
| A03 | Download inválido | Aprovado: checksum divergente, HTML e falha de transporte preservam executável anterior e removem staging |
| A04 | SSH sem TTY | Aprovado no contrato sem TTY: stdin fechado, timeouts e resultados finitos; não foi aberta uma conexão SSH de produção |
| A05 | TUI e CLI | Aprovado: TUI chama o mesmo executável NDJSON; PTY exige revisão antes de gravar operação e verifica resultado no histórico |
| A06 | Catálogo inválido | Aprovado: campos desconhecidos, ciclos, dependências/templates ausentes, duplicados e opções inválidas são recusados |
| A07 | Server | Aprovado: seis componentes; Redis, PostgreSQL, Ansible, Herdr e assistentes recusados antes de dependências |
| A08 | Instalação externa | Aprovado: origem e caminho conferidos, sem adoção; serviço externo não recebe controle; arquivos externos não são sobrescritos pelo bootstrap |
| A09 | Atualização parcial | Aprovado: gerenciadores controlados simulam falha de um componente; outro conclui, histórico individual e código 5 |
| A10 | Porta ou recurso externo | Aprovado: conflito 6379 entre serviços recusado em Docker real antes de criar substituto; propriedade externa preservada |
| A11 | Persistência | Aprovado: chave Redis permanece após atualização/recriação real; falha controlada restaura container anterior sem remover volume |
| A12 | Coletor independente | Aprovado: teste PTY fecha TUI e processo coletor continua; supervisão real mantém processo separado |
| A13 | Suspensão | Aprovado por SIGSTOP/SIGCONT: lacuna temporal registrada, CPU nula na retomada e deltas reiniciados; não simula suspensão física do hardware |
| A14 | Retenção | Aprovado: amostras com mais de sete dias ficam fora da consulta; 4.500 linhas vencidas são limpas em lotes, sem VACUUM a cada coleta |
| A15 | Docker indisponível | Aprovado: host mantém ciclos enquanto Docker falha ou excede timeout; fonte indisponível não vira consumo zero |
| A16 | SQLite ocupado/interrompido | Aprovado: timeout finito, migração revertida, schema futuro recusado, backup consistente e operação interrompida reconciliada sem inventar sucesso |
| A17 | Agente consulta | Aprovado: JSON atual/histórico paginado não cria banco ou altera recursos; registros futuros/antigos excluídos e atualidade explícita |
| A18 | Tailscale sem login | Aprovado: instalação real 1.104.2 e verificação distinguem pacote de autenticação; estado e arquivos existentes preservados |
| A19 | Serve/Services/Funnel | Aprovado: comandos fora do catálogo e da superfície CLI; nenhum login ou token administrativo é solicitado |
| A20 | Reexecução | Aprovado: instalação presente retorna unchanged; não instala gerenciador desnecessário; update ausente não instala dependências; repetição real preserva perfis |
| A21 | Segredos e terminal | Aprovado: projeção pública Docker, token Swarm por stdin, filtragem de logs/ANSI, PTY e cancelamento; não é promessa de reconhecer qualquer segredo arbitrário |
| A22 | Dois coletores | Aprovado: lock exclusivo por diretório/escopo, leitores concorrentes e reabertura após SIGTERM |

## Testes de contratos

A suíte completa passou com 105 testes após as correções de aceitação. Os
casos incluem troca de contexto Docker, recusa de sistemas/arquiteturas
desconhecidos e primeira instalação de serviço sem Docker. Contadores do mesmo
ID em endpoints diferentes não são combinados. Execute a suíte completa com:

```bash
npm ci
npm run check
npm run bootstrap:check
npm test
```

`npm test` compila o executável e executa Node Test Runner sem concorrência entre
arquivos. Os testes PTY usam `/usr/bin/script` de Linux; a execução completa foi
feita em Linux. Há consultas reais locais do host, mas gerenciadores e Docker
são substituídos por processos controlados nesses testes.

Casos adicionais da auditoria verificam propriedade de executáveis, ausência de
permissão de execução, versão global mise diferente da solicitada, dependências
na primeira instalação e atualização sem instalação implícita. O teste de
rollback Docker espera falha 1 quando só Redis foi solicitado; uma dependência
sem alteração não é contada como sucesso artificial para produzir código 5.

## Integrações com ferramentas reais

| Ambiente descartável | Operações conferidas |
| --- | --- |
| Debian 13 amd64, Git 2.47.3 | Instalação APT, repetição, atualização e preservação de gitconfig |
| Debian 13 amd64, fornecedores | mise 2026.10.17, Herdr 0.9.5, Codex 0.163.0, Claude 2.1.308, OpenCode 1.19.4 e Kimi 2.3.0; recibos e repetição sem editar bashrc |
| Debian 13 amd64, Node.js 24.22.1 | Instalação e atualização por mise com prefixo 24, JSON global e preservação de mise.toml do projeto |
| Debian 13 amd64, Docker Engine 29.9.2 | Instalação oficial, Redis/PostgreSQL/Mailpit saudáveis, Portainer Server/Agent, portas, volumes, logs, controles, Swarm e atualização de serviços |
| Debian 13 amd64, Tailscale 1.104.2 | Instalação, verificação sem login, repetição e atualização preservando arquivos |
| Debian 13 amd64, systemd real | Unidade Server, coleta, restart com PID novo, configure, stop/start e update; paths com espaço, dólar e porcentagem |
| Debian 12/13 e Ubuntu 24.04 amd64 | Binários musl reais executam catálogo, SQLite, coleta única e consulta de métricas |
| HTTPS local | Bootstrap real Desktop/Server com CA de teste explícita, TLS ativo, repetição e checksum dos binários |

As versões acima são as observadas em 22/10/2026. Não são pins de todos os
fornecedores. Imagens e endpoints podem mudar; testes futuros registram as
versões recebidas. Antigravity foi recusado corretamente porque a CPU disponível
não oferece PCLMUL; sua instalação não está homologada neste hardware.

```bash
npm run build:linux
npm run test:integration
```

O teste de distribuição precisa dos artefatos em `dist/`. As demais integrações
usam o executável de desenvolvimento. Docker deve estar disponível ao usuário.
Os testes de Docker e supervisão usam containers privilegiados descartáveis,
com isolamento próprio; não alteram o daemon ou o systemd do host.

## Interface e arquivos

`npm run capture:tui` gera quatro capturas do frame Ratatui. Foram conferidas
Home e Aplicativos Desktop, Aplicativos Server em 80x24 e Métricas em 160x50.
Testes também cobrem 129x44, todas as abas e contraste AA dos pares de texto.
Capturas estão em `docs/assets/tui/`; contexto visual em `.hallmark/`.

Markdown recursivo, incluindo `.codex/` e `.claude/`, passou no markdownlint.
Bash passou em `bash -n` e ShellCheck. O workflow passou no actionlint 1.7.12.
O build Dockerfile/Buildx produziu os mesmos hashes da compilação isolada da
mesma fonte, antes das correções posteriores; artefatos devem ser regenerados
sempre que o código mudar, sem reutilizar hashes de uma revisão anterior.

## Conferência documental

`npm run docs:check` passou com 97 entradas de ajuda, 75 comandos finais,
375 exemplos de comandos aceitos pelo parser e links locais de 39 arquivos
Markdown. Cada entrada e opção possui cinco exemplos. A referência é gerada
de contratos autorados e comparada ao executável. Esse check também roda no CI.
Os exemplos são analisados com `--help`, sem executar suas mutações.

As 15 partes e a visão geral foram salvas e relidas pelo MCP do ClickUp.
Títulos, hierarquia, conteúdo e links foram conferidos. O Hub recebeu contexto
próprio, e Codex/Claude receberam a skill de manutenção da v2.

A estrutura do Hub e os checks de blog, ebooks e changelogs passaram, sem
alterações pendentes de sincronização. O Markdown do SetupVibe e dos arquivos
Hub alterados nesta tarefa passou. A validação Markdown global do Hub encontrou
falhas anteriores em skills editoriais/Hallmark e `ebooks-check-*.md`, fora
deste trabalho. Esses arquivos foram preservados.

## Pendências externas à implementação local

- Executar builds e homologação de aplicativos em macOS Intel/ARM e Linux arm64.
- Validar Antigravity em CPU com as instruções exigidas pelo fornecedor.
- Quando houver autorização de publicação, criar versão/tag/GitHub Release e
  servir os bootstraps corretos nos dois domínios; conferir download remoto.
- Assinatura e notarização Apple exigem fluxo e credenciais de distribuição;
  o bootstrap não oferece contorno das proteções do sistema.

Esses itens impedem chamar a matriz inteira de homologada ou os endpoints de
publicados. Não impedem revisar e executar a implementação local nos ambientes
com resultado registrado. A documentação deve manter essa distinção.

## Revisão posterior

A [segunda rodada](ROUND-2.md), em 23/10/2026, elevou a suíte para 110 testes
aprovados. O relatório acima preserva a execução inicial. Os artefatos
reconstruídos e as verificações posteriores ficam em `ROUND-2.json`.
