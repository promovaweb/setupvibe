# Guia do PM2

O SetupVibe instala o [PM2](https://pm2.keymetrics.io/) globalmente e o configura para inicialização automática na edição Desktop.

- **macOS:** inicialização automática via launchd; baixa `ecosystem.config.js` do repositório para `~/ecosystem.config.js`
- **Linux:** inicialização automática via systemd; baixa `ecosystem.config.js` do repositório para `~/ecosystem.config.js`

---

## O que é o PM2?

O PM2 é um **gerenciador de processos para Node.js em produção** — mantém seus aplicativos funcionando, reinicia-os em caso de falha, gerencia logs e integra-se com sistemas de init do sistema operacional.

**Conceitos principais:**

| Conceito           | Descrição                                                                 |
| ------------------ | ------------------------------------------------------------------------- |
| **App**            | Um processo gerenciado pelo PM2 (Node.js, Python, Go ou qualquer binário) |
| **Ecosystem file** | `ecosystem.config.js` — configuração declarativa para um ou mais apps     |
| **Cluster mode**   | Cria múltiplas instâncias entre os núcleos da CPU (somente Node.js)       |
| **Fork mode**      | Processo único, funciona com qualquer runtime (padrão)                    |

---

## Primeiros Passos

```bash
# Iniciar um app diretamente
pm2 start app.js

# Iniciar com nome
pm2 start app.js --name meuapp

# Iniciar usando ecosystem file
pm2 start ecosystem.config.js

# Iniciar um app específico do ecosystem file
pm2 start ecosystem.config.js --only meuapp

# Iniciar com ambiente específico
pm2 start ecosystem.config.js --env production

# Listar todos os processos gerenciados
pm2 list

# Mostrar informações detalhadas de um app
pm2 show meuapp

# Monitorar todos os apps em tempo real
pm2 monit
```

---

## Comandos Comuns

### Controle de Processos

```bash
pm2 stop meuapp         # Parar (mantém na lista)
pm2 restart meuapp      # Reiniciar
pm2 reload meuapp       # Reload sem downtime (cluster mode)
pm2 delete meuapp       # Parar e remover da lista

pm2 stop all            # Parar todos os apps
pm2 restart all         # Reiniciar todos os apps
pm2 delete all          # Remover todos os apps
```

### Logs

```bash
pm2 logs                # Transmitir todos os logs
pm2 logs meuapp         # Transmitir logs de um app
pm2 logs --lines 200    # Mostrar as últimas 200 linhas
pm2 flush               # Limpar todos os arquivos de log
pm2 reloadLogs          # Reabrir arquivos de log (útil após rotação)
```

### Persistência

```bash
pm2 save                # Salvar lista de processos atual em disco
pm2 resurrect           # Restaurar lista de processos salva
```

### Inicialização

```bash
# Gerar e configurar integração com sistema de init
pm2 startup             # Exibe um comando — execute-o com sudo

# Remover hook de inicialização
pm2 unstartup
```

---

## Ecosystem File

O ecosystem file (`ecosystem.config.js`) é a forma recomendada de gerenciar apps. Um template é gerado em `~/ecosystem.config.js` durante a configuração.

### Template Padrão

```js
module.exports = {
  apps: [
    {
      name: "app",
      script: "./index.js",
      instances: 1,
      exec_mode: "fork",
      watch: false,
      ignore_watch: ["node_modules", "logs", ".git"],
      max_memory_restart: "300M",
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      merge_logs: true,
      time: true,
      autorestart: true,
      max_restarts: 10,
      restart_delay: 1000,
      kill_timeout: 3000,
      wait_ready: false,
      env: {
        NODE_ENV: "development",
      },
      env_production: {
        NODE_ENV: "production",
      },
    },
  ],
};
```

---

## Referência de Configuração

### Geral

| Opção              | Tipo    | Padrão         | Descrição                                                         |
| ------------------ | ------- | -------------- | ----------------------------------------------------------------- |
| `name`             | string  | nome do script | Identificador usado em `pm2 list` e comandos                      |
| `script`           | string  | —              | Caminho para o script de entrada (obrigatório)                    |
| `cwd`              | string  | —              | Diretório de trabalho do processo                                 |
| `args`             | string  | —              | Argumentos CLI passados ao script                                 |
| `interpreter`      | string  | `node`         | Caminho para o interpretador do runtime                           |
| `interpreter_args` | string  | —              | Flags passadas ao interpretador (ex: `--max-old-space-size=4096`) |
| `force`            | boolean | `false`        | Permite iniciar o mesmo script mais de uma vez                    |

### Escalabilidade

| Opção       | Tipo   | Padrão | Descrição                                                |
| ----------- | ------ | ------ | -------------------------------------------------------- |
| `instances` | number | `1`    | Número de instâncias; `-1` = todos os núcleos da CPU     |
| `exec_mode` | string | `fork` | `fork` (qualquer runtime) ou `cluster` (somente Node.js) |

### Estabilidade e Reinicialização

| Opção                   | Tipo          | Padrão  | Descrição                                                         |
| ----------------------- | ------------- | ------- | ----------------------------------------------------------------- |
| `autorestart`           | boolean       | `true`  | Reiniciar em caso de falha                                        |
| `max_restarts`          | number        | `10`    | Máximo de reinicializações instáveis consecutivas antes de parar  |
| `min_uptime`            | string/number | —       | Tempo mínimo para ser considerado estável (ms ou `"2s"`)          |
| `restart_delay`         | number        | `0`     | Milissegundos de espera antes de reiniciar app com falha          |
| `max_memory_restart`    | string        | —       | Reiniciar se RSS exceder este valor (ex: `"300M"`, `"1G"`)        |
| `kill_timeout`          | number        | `1600`  | Milissegundos antes de SIGKILL após SIGTERM                       |
| `shutdown_with_message` | boolean       | `false` | Usar `process.send('shutdown')` em vez de SIGTERM                 |
| `wait_ready`            | boolean       | `false` | Aguardar `process.send('ready')` antes de considerar o app online |
| `listen_timeout`        | number        | —       | Milissegundos para aguardar sinal `ready` antes de forçar reload  |

### Watch

| Opção          | Tipo          | Padrão  | Descrição                                                    |
| -------------- | ------------- | ------- | ------------------------------------------------------------ |
| `watch`        | boolean/array | `false` | Reiniciar em mudanças de arquivo; passe um array de caminhos |
| `ignore_watch` | array         | —       | Caminhos ou padrões glob excluídos do watch                  |

### Logging

| Opção                         | Tipo    | Padrão                         | Descrição                                           |
| ----------------------------- | ------- | ------------------------------ | --------------------------------------------------- |
| `log_date_format`             | string  | —                              | Formato do timestamp (ex: `"YYYY-MM-DD HH:mm:ss"`)  |
| `out_file`                    | string  | `~/.pm2/logs/<name>-out.log`   | Caminho para log de stdout                          |
| `error_file`                  | string  | `~/.pm2/logs/<name>-error.log` | Caminho para log de stderr                          |
| `log_file`                    | string  | —                              | Caminho para log combinado stdout+stderr            |
| `merge_logs` / `combine_logs` | boolean | `false`                        | Desabilitar sufixos de log por instância no cluster |
| `time`                        | boolean | `false`                        | Prefixar cada linha de log com timestamp            |

### Ambiente

| Opção             | Tipo    | Descrição                                                              |
| ----------------- | ------- | ---------------------------------------------------------------------- |
| `env`             | object  | Variáveis injetadas em todos os modos                                  |
| `env_<name>`      | object  | Variáveis injetadas com `--env <name>` (ex: `env_production`)          |
| `filter_env`      | array   | Remover variáveis de ambiente global com esses prefixos                |
| `instance_var`    | string  | Nome da variável com índice da instância (padrão: `NODE_APP_INSTANCE`) |
| `appendEnvToName` | boolean | Acrescentar nome do ambiente ao nome do app                            |

### Source Maps e Diversos

| Opção                | Tipo    | Padrão | Descrição                                                          |
| -------------------- | ------- | ------ | ------------------------------------------------------------------ |
| `source_map_support` | boolean | `true` | Habilitar suporte a source map para stack traces                   |
| `vizion`             | boolean | `true` | Rastrear metadados do controle de versão                           |
| `cron_restart`       | string  | —      | Expressão cron para reinicializações agendadas (ex: `"0 3 * * *"`) |
| `post_update`        | array   | —      | Comandos a executar após uma atualização `pm2 pull`                |

---

## Configurações Globais do PM2

O SetupVibe configura as seguintes durante a instalação:

| Configuração          | Valor                 | Descrição                                          |
| --------------------- | --------------------- | -------------------------------------------------- |
| `pm2:autodump`        | `true`                | Auto-salvar lista de processos em qualquer mudança |
| `pm2:log_date_format` | `YYYY-MM-DD HH:mm:ss` | Formato de timestamp padrão para todos os logs     |

```bash
pm2 set pm2:autodump true
pm2 set pm2:log_date_format "YYYY-MM-DD HH:mm:ss"
pm2 get                      # Listar todas as configurações atuais do módulo PM2
```

---

## Cluster Mode (Node.js)

```js
{
  instances: "max",   // ou um número, ou -1
  exec_mode: "cluster",
}
```

```bash
pm2 reload meuapp     # Reload rolling sem downtime em cluster mode
pm2 scale meuapp 4    # Escalar para 4 instâncias em tempo real
pm2 scale meuapp +2   # Adicionar 2 instâncias
```

---

## Inicialização Automática

O SetupVibe configura o PM2 para iniciar automaticamente no boot:

- **macOS** — registra um agente launchd (`pm2 startup launchd`)
- **Linux** — registra um serviço systemd (`pm2 startup systemd`)

Para refazer manualmente:

```bash
pm2 startup            # Exibe o comando a executar
pm2 save               # Salva a lista de processos atual
```

Para remover:

```bash
pm2 unstartup
```

---
> Follow the formatting guide: [Markdown Format Guide](.claude/commands/markdown-format.md)
