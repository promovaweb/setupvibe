# Revisão do painel de atualização

Verificação local em 4 de novembro de 2026, sem publicação.

O componente usa o contrato TUI-DESIGN-SYSTEM.md do Hub e preserva os seis
tokens existentes. O terminal define a fonte; não há fonte web ou animações.
A ordem é identificação do processo, escolha, leitura e ações.

| Estado | Apresentação e comportamento |
| --- | --- |
| Padrão | Check update e Review rollback, sem consulta automática. |
| Hover | Botões invertem primeiro plano e fundo nos tokens existentes. |
| Foco | Seleção nativa e campo com fundo selected; Tab alterna leitura e controle. |
| Ativo | Confirmação abre campo; ação exige token completo e Enter. |
| Desabilitado | Versão atual ou rollback ausente não habilitam confirmação. |
| Carregamento | Consulta e escrita nomeadas; Esc cancela; escrita aguarda término. |
| Erro | Mensagem na leitura e estado no rodapé; nova consulta disponível. |
| Sucesso | Resultado, artefato ativo e orientação para reiniciar o processo. |

## Verificação visual

As capturas do renderer em 80x24, 129x44 e 160x50 mantêm controles e rodapé
visíveis. Em 80x24 a leitura rola verticalmente, com atalho informado. Abaixo
de 80x24 o guard da aplicação pede redimensionamento e permite cancelar.
Não há novos cards, sombras, gradientes ou ícones decorativos.

Slop test Hallmark: gates aplicáveis à TUI conferidos sem ocorrência.
Gates específicos de DOM, CSS, hero e viewport em pixels não se aplicam.
A repetição das abas preserva a navegação existente; não cria novo template
de página. Autocrítica: propósito 4, hierarquia 4, execução 4, especificidade 4,
contenção 5 e variedade 3, pois segue o componente de painel já adotado.

## Comprovação

Dez testes do painel e o teste de revisão do núcleo passaram. A suíte geral
registra 282 testes aprovados, 19 opt-in ignorados e nenhuma falha. O cenário
real separado teve 50 verificações: dois executáveis compilados, HTTPS com CA
de teste, atualização pelo PTY e rollback sem rede.

A captura [Herdr](captures/about-updates-herdr.txt) mostra a cópia do código-fonte
recusando atualização sem bootstrap. Os arquivos about-home e about-update
em captures usam fornecedor simulado e não comprovam download oficial.

A homologação visual completa das demais áreas e a execução nos outros
sistemas continuam pendentes. Nenhum instalador foi executado no host.
