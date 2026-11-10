---
name: setupvibe-setup
description: Prepara e confere o ambiente local com o SetupVibe, identifica a edição correta e valida ferramentas, arquivos e skills do projeto.
---

# Configurar o SetupVibe

Use esta skill para preparar um computador novo, repetir uma instalação ou
conferir um ambiente que já usa o SetupVibe.

## Fluxo

1. Identifique o sistema e escolha a edição correta: Desktop para macOS,
   Linux ou WSL, Server para Linux sem ambiente gráfico e Windows para o
   Windows 11 x64 compatível.
2. Antes de executar um script remoto, abra a documentação da edição e confira
   os requisitos de versão, arquitetura, privilégios e reinicialização.
3. Execute somente o comando canônico da edição:

   ```bash
   curl --proto '=https' --tlsv1.2 -fsSL https://desktop.setupvibe.dev | bash
   ```

   Para servidor, troque o endereço por `server.setupvibe.dev`. No Windows,
   siga o comando PowerShell publicado na documentação da edição.
4. Confira os comandos e ferramentas instalados com `node --version`,
   `npm --version`, `npx --version`, `git --version` e as CLIs esperadas pela
   edição escolhida.
5. Para instalar skills em um projeto depois do ambiente pronto, use sempre
   `npx skills add <origem>`. Não copie skills diretamente para diretórios de
   agente.
6. Registre o sistema, a edição, os comandos conferidos e qualquer etapa que
   exija reinicialização ou ação manual.

## Regras

- Não execute a edição Desktop com `sudo` no macOS.
- Preserve perfis de shell, credenciais de agentes e configurações que não
  pertencem ao SetupVibe.
- Reexecute a mesma edição para reparar ferramentas ausentes, sem criar uma
  configuração paralela.
