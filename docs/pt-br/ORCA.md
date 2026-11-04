# Orca em um servidor SetupVibe

> Opcional. O SetupVibe não instala o Orca; este guia descreve uma forma testada de rodá-lo em um servidor preparado pela edição Server.

O [Orca](https://www.onorca.dev) roda agentes de código em worktrees e terminais que ficam em um servidor. Você abre o app desktop ou o Orca Mobile e se conecta a esse servidor, então fechar o notebook não para os agentes. Este guia cobre o lado do servidor Linux e como alcançá-lo de forma privada pelo Tailscale.

## Disponibilidade

| Edição | Sistemas | Estado |
| --- | --- | --- |
| Desktop | macOS, Linux e WSL | Não instalado |
| Server | Distribuições Linux compatíveis | Não instalado |
| Windows (Beta) | Windows nativo | Não instalado |

Os passos abaixo foram testados no Debian 13 (amd64) com o Orca 1.4.247. Outras distribuições, ARM e o servidor dentro de um contêiner não foram testados. Os servidores remotos do Orca são um recurso beta, então consulte a [documentação do Orca](https://www.onorca.dev/docs/remote-servers) se algum comando se comportar de outro jeito.

## Antes de começar

- Rode primeiro a edição Server. Ela instala o Tailscale, o Docker e as CLIs de IA que este guia usa.
- Coloque o servidor, o seu computador e o seu celular na mesma rede Tailscale.
- Use um usuário comum com `sudo`, não o `root`. O servidor do Orca roda como esse usuário.

## Instalar o servidor

Baixe o pacote `.deb` da sua arquitetura na página de [releases do Orca](https://github.com/stablyai/orca/releases). O arquivo se chama `orca-ide_<versão>_amd64.deb`.

```bash
sudo apt-get install -y ./orca-ide_<versão>_amd64.deb xvfb
orca-ide --version
```

O `xvfb` fornece uma tela virtual para o servidor sem monitor. No Linux o comando é `orca-ide`, e não `orca`, para não conflitar com o leitor de tela do GNOME.

## Rodar como serviço

Ative o lingering para o serviço do usuário continuar rodando depois que você sair da sessão, e instale o serviço:

```bash
loginctl enable-linger "$USER"
orca-ide serve service install --port 6768
orca-ide serve service status
```

O serviço executa `orca serve --supervise --no-pairing` e o reinicia se ele parar. A porta leva uns 20 segundos para abrir:

```bash
ss -ltn | grep 6768
```

## Manter a porta privada

O servidor escuta em todas as interfaces e avisa isso na própria saída. Quem alcançar a porta 6768 pode tentar parear, então libere-a só pelo Tailscale. Com `ufw`:

```bash
sudo ufw allow in on tailscale0 to any port 6768 proto tcp
```

Confira de dois lugares. Pelo endereço do Tailscale o servidor deve responder, e pelo endereço público não:

```bash
curl -s -m 6 -o /dev/null -w "%{http_code}\n" http://<ip-do-tailscale>:6768/
curl -s -m 6 -o /dev/null -w "%{http_code}\n" http://<ip-publico>:6768/
```

O primeiro comando imprime `200`. O segundo expira e imprime `000`. Rode o segundo em uma máquina que não esteja na sua rede Tailscale.

## Parear os apps

O serviço não imprime o link de pareamento. Para criar um, pare o serviço, rode o servidor em primeiro plano e copie a linha `Pairing URL`:

```bash
systemctl --user stop orca-serve
orca-ide serve --port 6768 --pairing-address <ip-do-tailscale>
```

Para o celular, acrescente `--mobile-pairing`. Trate o link como uma senha e não o cole em chats ou issues. Ele expira em poucos minutos.

No app desktop, abra Settings, depois Remote Orca Servers, escolha Add Server e cole o link. No Orca Mobile, escolha Pair e cole, com o Tailscale ligado. Um aparelho pareado guarda o próprio token, então não é preciso parear de novo depois de um reinício.

Encerre o servidor em primeiro plano com `Ctrl+C` e inicie o serviço de novo:

```bash
systemctl --user start orca-serve
```

Pareie todos os aparelhos antes de abrir terminais. Reiniciar o servidor matando todos os processos do usuário também fecha os terminais e os agentes que rodam neles. O histórico das conversas continua no disco.

## Organizar projetos

Use Add Project em uma pasta do servidor que contenha vários repositórios Git. O Orca oferece importá-los como um grupo, que funciona como um espaço nomeado na barra lateral. Abra um terminal dentro de cada repositório e inicie o agente ali, para que as instruções do próprio projeto sejam encontradas.

## Solução de problemas

| Sintoma | Verificação |
| --- | --- |
| `orca: command not found` | Use `orca-ide` no Linux. |
| `claude: command not found` em um terminal do Orca | O terminal abriu em `bash`, e o `PATH` está definido no `.zshrc`. Defina o shell do serviço como descrito abaixo. |
| A porta não abre | Espere uns 20 segundos e leia `journalctl --user -u orca-serve -n 30`. |
| O app não conecta | Confirme que o Tailscale está ligado nos dois aparelhos e que o endereço do Tailscale responde na porta 6768. |
| Os terminais parecem lentos | Meça o `ping` até o servidor primeiro. Quase sempre a causa é a distância e o caminho de rede entre você e o servidor, não o Orca. |

### Escolher o shell dos terminais

O Orca abre os terminais no shell indicado pela variável `SHELL` do serviço. Se ela estiver vazia, os terminais abrem em `bash`. Para usar `zsh`:

```bash
mkdir -p ~/.config/systemd/user/orca-serve.service.d
printf '[Service]\nEnvironment=SHELL=/usr/bin/zsh\n' > ~/.config/systemd/user/orca-serve.service.d/shell.conf
systemctl --user daemon-reload
systemctl --user restart orca-serve
```

Terminais que já estavam abertos mantêm o shell antigo até você fechá-los.

## Leitura adicional

- [Documentação do Orca](https://www.onorca.dev/docs)
- [Servidores remotos do Orca](https://www.onorca.dev/docs/remote-servers)
- [Índice da documentação do SetupVibe](../README.md)
