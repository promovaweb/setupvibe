# Guia do Cronboard
>
> Dashboard de monitoramento Cron TUI — v0.41.7

O SetupVibe instala o [Cronboard](https://github.com/antoniorodr/cronboard) para fornecer uma interface visual (TUI) para gerenciamento de tarefas cron.

---

## O que é o Cronboard?

O Cronboard é um dashboard baseado em terminal para gerenciar jobs do cron de forma local e remota. Ele permite visualizar, criar, editar, pausar e excluir tarefas de forma intuitiva, sem a necessidade de editar arquivos de texto manualmente.

**Recursos principais:**

- **Interface Visual (TUI):** Gerenciamento amigável via teclado.
- **Validação:** Feedback em tempo real sobre a validade da expressão cron.
- **Linguagem Natural:** Converte expressões cron em descrições legíveis (ex: "Todos os dias às 00:00").
- **Suporte Remoto:** Conexão via SSH para gerenciar crontabs em outros servidores.
- **Busca:** Filtro rápido por palavras-chave.

---

## Uso Básico

```bash
# Abrir o dashboard do Cronboard
cronboard

# Ou use o atalho do SetupVibe
cronb
```

### Comandos de Teclado no Dashboard

| Tecla | Ação |
|---|---|
| `j` / `k` ou `↑` / `↓` | Navegar entre as tarefas |
| `n` | Criar uma nova tarefa |
| `e` | Editar a tarefa selecionada |
| `p` | Pausar/Retomar tarefa (comenta/descomenta no crontab) |
| `d` | Excluir tarefa |
| `s` | Salvar alterações |
| `f` | Filtrar tarefas |
| `q` | Sair do Cronboard |

---

## Gerenciamento Remoto

O Cronboard permite gerenciar servidores via SSH. Você pode configurar conexões no arquivo de configuração do Cronboard.

Para mais detalhes sobre configurações avançadas, visite a [documentação oficial](https://antoniorodr.github.io/cronboard/configuration/).

---
