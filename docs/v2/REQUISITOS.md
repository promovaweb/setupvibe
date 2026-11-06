# Requisitos do SetupVibe 2

## Produto

Bun executa o núcleo TypeScript. CLI e TUI OpenTUI compartilham catálogo,
planejador, executor e consultas. Toda alteração exige revisão do plano e
confirmação. Consultas e prévias não criam bancos nem instalam componentes.
Instalação e autenticação são operações distintas.

## Idioma das interfaces

Comandos, subcomandos, opções, parâmetros e valores de controle da CLI são
em inglês. Toda a TUI deve ser em inglês, incluindo navegação, campos, ajuda,
confirmações, estados, avisos e erros. Confirmações digitadas usam `INSTALL`,
`UNINSTALL` e `EXECUTE`. Documentação técnica e conversa permanecem em português do Brasil.
Essa orientação do usuário prevalece sobre o padrão de idioma do Hub para
as interfaces do SetupVibe v2.

## Recursos e ações

A aba `Resources` permite marcar recursos, escolher `Install` ou `Uninstall`
e acionar o botão `Execute action`. A revisão apresenta o conjunto antes da
confirmação. Toda desinstalação verifica propriedade e identidade; componentes
externos não podem ser removidos silenciosamente. Dependentes devem ser
removidos antes dos componentes dos quais dependem. Volumes persistentes e
configurações de projeto são preservados pelo fluxo inicial de remoção.

## Edições e plataformas

| Edição | Sistemas pretendidos | Componentes |
| --- | --- | --- |
| Desktop | Debian 12/13, Ubuntu 24.04, macOS 14+ | mise, runtimes, assistentes, Git, gh, Docker, serviços, Tailscale e coletor |
| Server | Debian 12/13, Ubuntu 24.04 | Docker/Swarm, Portainer, Git, gh, Tailscale e coletor |

x64 e ARM64 dependem da disponibilidade conjunta do runtime, OpenTUI,
bibliotecas nativas e componentes selecionados. Nenhuma platform está
homologada nesta fase. Windows e Omarchy ficam fora da matriz inicial.

## Contratos e aceitação

- Catálogo: schema validado, IDs únicos, dependências sem ciclos e plano
  determinístico. Recusar componentes incompatíveis com edição ou platform.
- Execução: subprocessos recebem argumentos separados; segredos não aparecem
  em logs. Cancelamento encerra subprocessos e registra resultado parcial.
- Preservação: identificar instalações externas e recusar assumir controle.
  Atualizações preservam configurações, versões de projeto e volumes.
- Estado: SQLite com migrações, WAL, permissões, lock e backup consistente.
  Operações interrompidas são reconciliadas sem registrar sucesso fictício.
- CLI: inglês, ajuda, JSON final, eventos NDJSON e códigos de saída.
  Sem TTY, alterações exigem confirmação explícita por argumento.
- mise: gerenciar runtimes Desktop sem sobrescrever configuração de projeto.
- Docker: validar portas, binds, volumes e propriedade antes das operações.
  Tokens Swarm entram por canal protegido.
- Métricas: coletor independente, retenção de sete dias, intervalo configurável,
  supervisão systemd/launchd e consultas paginadas. Ausência não equivale a zero.
- TUI: Home, Resources, Services, Metrics, History e About; foco visível,
  teclado, mouse, busca, ajuda, revisão e cancelamento. Validar 80x24, 129x44
  e 160x50 com capturas reais.
- Distribuição: TLS, checksums, assets nativos, atualização atômica e
  recuperação após download inválido ou interrompido.
- Homologação: instalação limpa, repetição, atualização, falha parcial,
  concorrência e cancelamento em ambientes isolados, por sistema e arquitetura.
- Documentação: comandos reais, exemplos, limitações e matriz comprovada.
  A preparação da release inclui versão, changelog e artefatos verificáveis.

## Rastreabilidade

As etapas 02 a 10 implementam os contratos acima. A etapa 11 executa os
cenários integrados e registra resultados por platform. A etapa 12 confere
manual e prepara a release. O acompanhamento permanece no
[ClickUp](https://app.clickup.com/9007154145/v/l/6-1400510000002240-1).
