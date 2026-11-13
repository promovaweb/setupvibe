# SSH Copy ID para Windows 11 (Beta)

> Utilitário PowerShell para copiar uma chave SSH pública do Windows para um servidor remoto.

O código-fonte do núcleo fica em `ssh_copy_id.ps1`. Durante a instalação, ele recebe o nome `ssh_copy_id_core.ps1`, evitando que o PowerShell escolha o núcleo no lugar do lançador seguro `ssh_copy_id.cmd` quando o comando é executado sem extensão.

## Instalação pelo SetupVibe

O `desktop.ps1` instala os dois arquivos em `%USERPROFILE%\.setupvibe\bin` e adiciona esse diretório ao `PATH` do usuário:

```text
%USERPROFILE%\.setupvibe\bin\ssh_copy_id_core.ps1
%USERPROFILE%\.setupvibe\bin\ssh_copy_id.cmd
```

Depois de abrir um novo terminal, execute o utilitário de qualquer diretório:

```powershell
ssh_copy_id
```

Uma nova execução do SetupVibe atualiza os arquivos. O parâmetro `-Uninstall` remove somente os arquivos registrados como gerenciados e a entrada correspondente do `PATH`, preservando outros arquivos que o usuário possa manter em `%USERPROFILE%\.setupvibe`.

## Por Que PowerShell

O PowerShell oferece tratamento nativo de parâmetros, caminhos, processos, códigos de saída, elevação pelo UAC e erros terminantes. Isso torna a implementação mais segura e testável que uma rotina extensa em Batch.

O lançador `.cmd` não contém lógica SSH. Ele procura primeiro o PowerShell 7 (`pwsh.exe`), usa o Windows PowerShell (`powershell.exe`) como alternativa e chama `ssh_copy_id_core.ps1` com `-ExecutionPolicy Bypass` apenas para esse processo. Em uma instalação manual, também aceita o nome original `ssh_copy_id.ps1`.

## O Que O Utilitário Faz

1. Verifica a disponibilidade de `ssh.exe` e `ssh-keygen.exe`.
2. Interrompe com uma orientação clara para executar o SetupVibe quando o OpenSSH assinado não está disponível.
3. Procura uma chave pública válida em `%USERPROFILE%\.ssh`.
4. Confirma que a chave pública corresponde a uma chave privada local antes de selecioná-la.
5. Reconstrói a chave pública quando encontra uma chave privada padrão sem o arquivo `.pub` correspondente.
6. Cria uma chave Ed25519 sem senha quando nenhum par de chaves válido é encontrado, sem sobrescrever arquivos órfãos.
7. Valida o destino no formato `usuario@endereco` e a porta TCP.
8. Copia a chave para `~/.ssh/authorized_keys` sem duplicar uma chave já instalada.
9. Usa `StrictHostKeyChecking=accept-new` para aceitar uma nova chave de host na primeira conexão, mas continuar rejeitando chaves alteradas.
10. Normaliza a quebra de linha do Windows antes de gravar a chave no servidor.
11. Testa a autenticação com a chave privada correspondente e sem fallback para a senha do servidor.
12. Só informa sucesso depois que o servidor aceita a autenticação por chave.
13. Abre uma sessão SSH usando explicitamente a identidade validada, a menos que `-NoConnect` seja informado.

## Uso

### Modo Interativo

Solicite o destino durante a execução:

```powershell
ssh_copy_id
```

### Destino Informado Na Linha De Comando

```powershell
ssh_copy_id deploy@192.0.2.10
```

### Porta SSH Personalizada

```powershell
ssh_copy_id deploy@192.0.2.10 -Port 2222
```

### Escolher Uma Chave Específica

Informe o caminho da chave privada ou pública. O utilitário exige que os dois arquivos formem um par válido e usa a chave privada explicitamente na verificação e na conexão:

```powershell
ssh_copy_id deploy@192.0.2.10 -IdentityFile "$env:USERPROFILE\.ssh\work_ed25519"
```

### Copiar Sem Abrir Uma Sessão

```powershell
ssh_copy_id deploy@192.0.2.10 -NoConnect
```

### Executar O Núcleo Diretamente

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\ssh_copy_id.ps1 deploy@192.0.2.10 -Port 22
```

### Executar Pelo Prompt De Comando

```batch
ssh_copy_id deploy@192.0.2.10 -NoConnect
```

## Parâmetros

| Parâmetro | Padrão | Descrição |
| --- | --- | --- |
| `Remote` | Interativo | Destino no formato `usuario@endereco`; também pode ser o primeiro argumento posicional. |
| `-Port` | `22` | Porta TCP do serviço SSH, entre `1` e `65535`. |
| `-IdentityFile` | Detecção automática | Caminho da chave privada ou pública que deve ser copiada e usada. |
| `-NoConnect` | Desativado | Não abre a sessão interativa depois de copiar e validar a autenticação por chave. |

## Requisitos Do Servidor Remoto

- Serviço SSH acessível pela porta escolhida.
- Autenticação por senha permitida na primeira conexão ou outro método já disponível.
- Permissão para gravar no diretório pessoal da conta remota.
- Ambiente compatível com os comandos POSIX `umask`, `mkdir`, `touch`, `chmod`, `cat`, `grep`, `tr` e `rm`.

O fluxo atual destina-se a servidores Linux, macOS e outros ambientes SSH compatíveis com esses comandos. Ele não instala a chave em um servidor OpenSSH nativo do Windows.

## Chaves Reconhecidas

O utilitário procura primeiro estas chaves públicas:

- `id_ed25519.pub`
- `id_ecdsa.pub`
- `id_rsa.pub`

Em seguida, considera outros arquivos `.pub` válidos em `%USERPROFILE%\.ssh`, ignorando certificados terminados em `-cert.pub`. Uma chave pública só é selecionada quando existe uma chave privada de mesmo nome, sem a extensão `.pub`, e as impressões digitais SHA-256 coincidem. Para evitar que `ssh-keygen` confunda a chave privada com o arquivo `.pub` vizinho, a verificação usa uma cópia temporária da chave privada no mesmo diretório e a remove imediatamente.

Quando encontra apenas `id_ed25519`, `id_ecdsa` ou `id_rsa`, tenta reconstruir o arquivo público com `ssh-keygen -y`. Uma chave privada protegida solicitará sua passphrase durante essa operação.

Use `-IdentityFile` quando quiser selecionar explicitamente outro par. Se arquivos órfãos ocuparem o nome padrão e nenhum par válido estiver disponível, o utilitário cria uma chave com nome reservado ao SetupVibe em vez de substituir os arquivos existentes.

## Instalação Manual

Baixe o núcleo e o lançador da tag da versão atual do SetupVibe:

```powershell
$destino = "$env:USERPROFILE\Downloads\ssh_copy_id"
New-Item -ItemType Directory -Force -Path $destino | Out-Null
$versao = '0.41.22'
$base = "https://raw.githubusercontent.com/promovaweb/setupvibe/v$versao/utils/windows/ssh_copy_id"
Invoke-WebRequest -Uri "$base/ssh_copy_id.ps1" -OutFile "$destino\ssh_copy_id.ps1"
Invoke-WebRequest -Uri "$base/ssh_copy_id.cmd" -OutFile "$destino\ssh_copy_id.cmd"
Set-Location $destino
.\ssh_copy_id.cmd
```

## Solução De Problemas

### OpenSSH Não Está Disponível

Execute o instalador principal do SetupVibe. O helper não usa Recursos sob Demanda, DISM nem Windows Update: o SetupVibe baixa o MSI x64 oficial do Microsoft Win32-OpenSSH, valida sua assinatura Authenticode e instala Cliente e Servidor.

### Conexão Recusada

Confirme o endereço, a porta, o serviço SSH, o firewall e a existência da conta informada.

### Senha Recusada

Verifique se a senha pertence ao usuário informado e se o servidor permite autenticação por senha. Alguns servidores aceitam somente chaves já autorizadas ou bloqueiam acesso direto do usuário `root`.

### Cópia Concluída, Mas A Conexão Final Falhou

O utilitário não informa mais sucesso apenas porque gravou `authorized_keys`. Ele testa a chave privada correspondente sem permitir fallback para senha. Se essa validação falhar, confira `PubkeyAuthentication`, `AuthorizedKeysFile`, a propriedade do diretório pessoal remoto e as permissões de `~/.ssh` e `authorized_keys`.

Para repetir manualmente o mesmo teste com uma chave específica:

```powershell
ssh -p 22 -i "$env:USERPROFILE\.ssh\id_ed25519" -o IdentitiesOnly=yes -o PreferredAuthentications=publickey -o PasswordAuthentication=no -o KbdInteractiveAuthentication=no usuario@endereco
```

## Segurança

A chave criada automaticamente não possui passphrase. Proteja a conta do Windows e nunca compartilhe uma chave privada, como `%USERPROFILE%\.ssh\id_ed25519`.

Somente o arquivo público terminado em `.pub` deve ser copiado ou compartilhado. Na primeira conexão, confira a impressão digital apresentada pelo servidor antes de confirmar a confiança no host.

Uma chave privada existente pode solicitar a própria passphrase durante a validação ou a conexão. Essa passphrase local é diferente da senha da conta no servidor; o utilitário desativa os métodos de senha do servidor depois da cópia.
