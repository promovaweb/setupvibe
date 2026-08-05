# Executáveis do SetupVibe

> Scripts executáveis auxiliares — v0.41.11

O SetupVibe mantém scripts auxiliares reutilizáveis no diretório [`bin/`](../../bin) do repositório. Durante a instalação, as edições Desktop e Server baixam esses arquivos diretamente do repositório para `~/.setupvibe/bin` e aplicam permissão de execução.

## Local de Instalação

| Arquivo fonte | Caminho instalado | Edições |
| ------------- | ----------------- | ------- |
| [`bin/ssh_copy_id`](../../bin/ssh_copy_id) | `~/.setupvibe/bin/ssh_copy_id` | Desktop e Server |

O alias do shell aponta para o executável instalado:

```bash
alias ssh_copy_id="$HOME/.setupvibe/bin/ssh_copy_id"
```

Os instaladores baixam o arquivo de:

```text
https://raw.githubusercontent.com/promovaweb/setupvibe/main/bin/ssh_copy_id
```

## `ssh_copy_id`

Copia sua chave SSH pública local para um servidor remoto usando autenticação por senha. Ele cria `~/.ssh/authorized_keys` no servidor remoto se necessário, aplica permissões seguras e evita adicionar a mesma chave duas vezes.

### Requisitos

- `ssh`
- `sshpass`
- Uma chave SSH pública local, normalmente uma destas:
  - `~/.ssh/id_ed25519.pub`
  - `~/.ssh/id_rsa.pub`
  - `~/.ssh/id_ecdsa.pub`

### Uso

```bash
ssh_copy_id --host HOST --user USUARIO [--pass SENHA] [--key ~/.ssh/id_ed25519.pub] [--port 22]
```

### Argumentos

| Argumento | Obrigatório | Padrão | Descrição |
| --------- | ----------- | ------ | --------- |
| `--host` | Sim | nenhum | Hostname ou IP do servidor remoto. |
| `--user` | Sim | nenhum | Usuário SSH remoto. |
| `--pass` | Não | prompt | Senha SSH remota. Se omitida, o script pergunta com input oculto. |
| `--key` | Não | detecção automática | Arquivo de chave pública a copiar. Um caminho de chave privada sem `.pub` é aceito se o `.pub` correspondente existir. |
| `--port` | Não | `22` | Porta SSH remota. |
| `-h`, `--help` | Não | nenhum | Exibe ajuda de uso. |

### Exemplos

Perguntar a senha com segurança:

```bash
ssh_copy_id --host 192.0.2.10 --user root
```

Passar a senha inline:

```bash
ssh_copy_id --host 192.0.2.10 --user root --pass 'senha'
```

Usar uma chave pública e porta SSH customizadas:

```bash
ssh_copy_id --host 192.0.2.10 --user deploy --key ~/.ssh/id_rsa.pub --port 2222
```

### Comportamento

- Usa `sshpass -e` para passar a senha pela variável de ambiente `SSHPASS` em vez de argumento direto do comando `sshpass`.
- Usa `StrictHostKeyChecking=accept-new` para aceitar uma nova chave de host na primeira conexão, mas continuar rejeitando chaves alteradas.
- Desabilita autenticação por chave pública na etapa de cópia para garantir o uso da senha informada.
- Define permissões remotas `700` para `~/.ssh` e `600` para `authorized_keys`.
- Verifica correspondência exata antes de adicionar a chave, então execuções repetidas são idempotentes.

### Notas de Segurança

Prefira omitir `--pass` para que o script pergunte a senha com input oculto. Passar `--pass` inline é útil para automações, mas pode expor a senha no histórico do shell ou em metadados de processo dependendo do ambiente.

### Solução de Problemas

| Mensagem | Causa | Correção |
| -------- | ----- | -------- |
| `sshpass não encontrado` | `sshpass` não está instalado ou não está no `PATH`. | Execute o SetupVibe novamente ou instale `sshpass`. |
| `chave pública SSH não encontrada` | Nenhuma chave pública suportada foi encontrada. | Crie uma com `ssh-keygen -t ed25519 -C 'email@exemplo.com'` ou use `--key`. |
| `informe --pass ou execute em um terminal interativo` | O comando foi executado sem `--pass` em contexto não interativo. | Passe `--pass` ou execute em um terminal interativo. |
| `Falha ao adicionar a chave SSH` | Login SSH falhou ou o comando remoto falhou. | Verifique host, usuário, senha, porta e se autenticação por senha está habilitada no servidor. |

## Adicionando Novos Executáveis

Ao adicionar outro executável auxiliar:

1. Adicione o script em `bin/`.
2. Mantenha o shebang na linha 1.
3. Adicione cabeçalho com nome, autor, versão, descrição e exemplos de uso.
4. Marque como executável com `chmod +x`.
5. Adicione uma referência direta via `safe_download` em `desktop.sh` e `server.sh`.
6. Adicione ou atualize aliases em `conf/zshrc-*.zsh`.
7. Documente o script neste arquivo e atualize a referência de aliases se necessário.
8. Valide com `bash -n`, `zsh -n` e `markdownlint`.
