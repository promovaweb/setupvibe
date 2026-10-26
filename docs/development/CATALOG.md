# Catálogo e planejador

> Implementado em `2.0.0-alpha.1`; validado localmente em Debian 13 x86_64.

O arquivo `catalog/components.json` é incorporado ao binário por `include_str!`.
Consultas não dependem de rede. A presença no catálogo não comprova instalação:
a descoberta real pertence aos adaptadores.

## Schema

`schema_version` vale 1. `catalog_version` identifica os dados usados pelo
plano. Categorias têm IDs e rótulos; componentes têm ID, nome, categoria,
edições, plataformas, dependências, operações, opções e referências a templates.
Campos desconhecidos são recusados.

Cada plataforma declara sistema, arquiteturas, gerenciador e pacote.
Gerenciadores aceitos: system, brew, mise, vendor, docker e native.
Operações aceitas: install, verify e update. O JSON não aceita comandos shell.
Opções são inteiros com limites ou escolhas enumeradas; o padrão precisa ser
válido. Templates referenciam IDs conhecidos pelo código.

A validação recusa IDs repetidos, categorias e dependências ausentes, ciclos,
plataformas vazias, operações desconhecidas e dependências de outra edição.
Server aceita apenas docker, portainer, git, gh, tailscale e collector.

## Planejamento

O núcleo primeiro confere todos os componentes solicitados e a edição;
depois valida o alvo, resolve dependências e opções. A ordem é topológica,
estável e sem duplicação. O plano inclui schema, versão do catálogo, edição,
plataforma e etapas com gerenciador, pacote, ação, opções e dependências.

A prévia consulta presença e gerenciador proprietário. O plano efetivo conserva os IDs solicitados em `requested` e remove dependências que já não são necessárias. Instalação de componente presente não reinstala dependências. Atualização não instala dependências implicitamente.

Um serviço solicitado sem Docker disponível recebe descoberta adiada explícita. O executor instala o runtime necessário e só então descobre o serviço. Docker presente com daemon inacessível produz uma falha de pré-condição, sem presumir ausência do runtime.

## Exemplo do catálogo embarcado

O JSON abaixo é extraído do componente Redis. Os comentários ficam no texto porque JSON não admite comentários.

```json
{
  "id": "redis",
  "name": "Redis",
  "category": "services",
  "editions": [
    "desktop"
  ],
  "platforms": [
    {
      "os": "linux",
      "architectures": [
        "x86_64",
        "aarch64"
      ],
      "manager": "docker",
      "package": "redis:7"
    },
    {
      "os": "macos",
      "architectures": [
        "x86_64",
        "aarch64"
      ],
      "manager": "docker",
      "package": "redis:7"
    }
  ],
  "dependencies": [
    "docker"
  ],
  "operations": [
    "install",
    "verify",
    "update"
  ],
  "options": {
    "port": {
      "type": "integer",
      "min": 1024,
      "max": 65535,
      "default": 6379
    },
    "bind": {
      "type": "choice",
      "values": [
        "127.0.0.1",
        "0.0.0.0"
      ],
      "default": "127.0.0.1"
    }
  },
  "template_refs": [
    "redis"
  ]
}
```

O campo de edições exclui Server. A opção de porta é validada antes da execução. A referência ao template seleciona dados conhecidos pelo código em `catalog/templates/`. O template lógico do coletor é renderizado por `src/supervisor.rs`, conforme systemd ou launchd. Nenhum campo é avaliado como shell.

## Consultas disponíveis

Todos os exemplos usam o executável compilado em `target/debug/setupvibe`.
`--output json` produz um envelope com schema_version, success e data/error.
Nenhum destes comandos exige privilégios ou altera pacotes.

### catalog list

Lista apenas os componentes da edição. A edição padrão depende do artefato.

```bash
setupvibe catalog list
setupvibe --edition server catalog list
setupvibe --output json catalog list
setupvibe --edition server --output json catalog list
setupvibe --output ndjson catalog list
```

### catalog show

Recebe um ID obrigatório. ID desconhecido retorna 2; edição incompatível, 3.

```bash
setupvibe catalog show git
setupvibe catalog show portainer
setupvibe --edition server catalog show tailscale
setupvibe --output json catalog show collector
setupvibe --edition server catalog show redis
```

### catalog validate

Valida os dados embarcados ou um arquivo indicado por `--file`.
O arquivo externo nunca substitui o catálogo de execução.

```bash
setupvibe catalog validate
setupvibe --output json catalog validate
setupvibe catalog validate --file catalog/components.json
setupvibe --edition server catalog validate
setupvibe --output ndjson catalog validate --file catalog/components.json
```

### component install

Recebe um ou mais IDs e opções `CHAVE=VALOR`. Use `--dry-run` para revisar e `--yes` para aplicar.
Portas aceitam inteiros entre 1024 e 65535. Opções repetidas são recusadas.

```bash
setupvibe component install git --dry-run
setupvibe --edition server component install docker portainer --dry-run
setupvibe component install redis --option port=7000 --dry-run
setupvibe component install node python --dry-run
setupvibe component install portainer --option role=agent --dry-run
```

### component update

Produz plano de atualização pelo proprietário observado. Dependências não são instaladas. Reconfiguração de serviços durante update é recusada para preservar dados e portas.

```bash
setupvibe component update git --dry-run
setupvibe --edition server component update gh --dry-run
setupvibe component update node python --dry-run
setupvibe component update portainer --dry-run
setupvibe --output json component update tailscale --dry-run
```

## Verificação

Execute `npm test` dentro do repositório. Os testes Node.js usam o executável
real, catálogos inválidos em diretórios temporários e HOME descartável.
A suíte final passou com 105 testes e 10 integrações. Consulte o [mapa de aceitação](ACCEPTANCE.md) para resultados e limites de plataforma.
