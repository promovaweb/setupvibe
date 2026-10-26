# Voz — guia aprofundado

[`../description.md`](../description.md) é a fonte normativa para
posicionamento, promessa, tagline e descrições institucionais. Este guia define
como a voz do SetupVibe funciona em documentação, terminal, interface e
comunicação pública.

## Princípios

1. Comece pela plataforma, ação ou resultado.
2. Use verbos concretos: instalar, configurar, preservar, remover, validar.
3. Mostre o comando somente depois de declarar o que ele altera.
4. Diferencie suporte confirmado, comportamento em Beta e limitação conhecida.
5. Termine com uma verificação observável ou um próximo passo.

## Glossário de termos canônicos

| Termo | Grafia fixa | Evite | Regra |
| --- | --- | --- | --- |
| SetupVibe | `SetupVibe` | Setup Vibe, setup-vibe | Preserve a caixa e a união do nome. |
| Desktop | `Desktop Edition` | versão completa, instalação padrão | Use para macOS, Linux desktop e WSL2. |
| Server | `Server Edition` | modo servidor, versão mínima | Use para a edição Linux voltada à operação. |
| script | script | instalador mágico, comando universal | O arquivo é público e precisa ser revisado. |
| ambiente | ambiente de desenvolvimento | máquina perfeita, stack pronta | Nomeie a parte configurada quando houver possibilidade de ambiguidade. |
| validação | validar | conferir se deu certo | Diga o comando, versão, arquivo ou serviço usado como evidência. |
| suporte | compatível com / suportado em | funciona em qualquer sistema | Declare sistema, versão e arquitetura quando forem relevantes. |

## Estrutura das mensagens

Uma instrução operacional segue esta ordem:

1. **Contexto:** edição, sistema e pré-requisito.
2. **Impacto:** arquivos, pacotes, permissões ou serviços alterados.
3. **Ação:** comando exato ou procedimento.
4. **Validação:** resultado observável que confirma a etapa.
5. **Limite:** condição que exige interrupção, restauração ou investigação.

## Exemplos por canal

**Documentação de instalação:**

> Use a Desktop Edition no macOS, Linux ou WSL2. Leia o script antes de
> executá-lo e depois valide o shell, o `PATH` e as versões dos runtimes.

**Mensagem de terminal:**

```text
Node.js instalado: v24.x
Validação pendente: abra um novo terminal e execute node --version.
```

**Aviso de impacto:**

> O próximo passo altera pacotes e arquivos de configuração do usuário.
> Preserve uma cópia das configurações existentes antes de continuar.

**Mensagem de erro:**

```text
OpenSSH não iniciou.
Consulte o log informado acima e confirme o estado do serviço sshd antes de
executar novamente.
```

**Anúncio público:**

> SetupVibe separa a preparação do ambiente em edições para Desktop e
> Server. Escolha a edição, revise o script e valide o resultado.

## Evite e prefira

| Evite | Prefira |
| --- | --- |
| “Seu ambiente perfeito em um comando.” | “Prepare o ambiente com o script correspondente ao seu sistema.” |
| “Funciona em qualquer máquina.” | “Consulte os sistemas e arquiteturas suportados por cada edição.” |
| “A instalação não pode falhar.” | “Revise o script, preserve suas configurações e valide o resultado.” |
| “Tudo pronto!” | “A instalação terminou; as validações listadas abaixo passaram.” |
| “Algo deu errado.” | “O serviço não iniciou; consulte o log e confirme a porta configurada.” |
| “Basta executar.” | “Leia o impacto descrito acima antes de executar.” |

## Tom por contexto

- **README:** objetivo, escopo das edições, início rápido e limites.
- **Guia técnico:** sequencial, preciso e verificável.
- **Terminal:** curto, com estado, causa conhecida e próxima ação.
- **Erro:** específico, sem humor, culpa ou desculpa performática.
- **Changelog:** factual, com versão, plataforma e comportamento alterado.
- **Comunicação pública:** explica o mecanismo antes do benefício.

## Idioma

Português do Brasil é o idioma do repositório e da interface. Materiais públicos
podem usar Português do Brasil, inglês, espanhol ou francês, mas nomes de
edição, comandos, caminhos, variáveis, versões e identificadores permanecem
iguais em todas as traduções.

Não traduza `Desktop Edition`, `Server Edition`,
nomes de ferramentas, comandos ou caminhos. Traduza a explicação ao redor.
