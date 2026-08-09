# Detalhes da oportunidade e solução avulsa

## Objetivo

Permitir consultar rapidamente os detalhes de uma oportunidade comercial e cadastrar produtos ou serviços que não façam parte do catálogo predefinido.

## Consulta de oportunidade

- O corpo de todo card comercial será clicável.
- O clique abrirá uma janela de detalhes somente para leitura.
- A janela exibirá solução, município/UF, responsável, valor estimado, próximo passo, data do próximo passo, observações e anexos.
- Editar, Remover, o seletor de etapa e links de anexos manterão suas ações próprias e não abrirão a janela de detalhes.
- A janela poderá ser fechada pelo botão de fechar ou Cancelar/Fechar.

## Solução avulsa

- Os formulários de nova oportunidade e edição incluirão `Outro / avulso` no seletor Solução.
- Ao escolher essa opção, será exibido o campo obrigatório `Nome do produto/serviço`.
- Ao salvar, o nome digitado substituirá `Outro / avulso` no registro persistido.
- Ao editar uma oportunidade que já use uma solução avulsa, o seletor será apresentado como `Outro / avulso` e o nome existente preencherá o campo livre.

## Dados e persistência

- Não haverá alteração de schema: o texto da solução avulsa será salvo na coluna existente `solution`.
- A visualização usará os dados de oportunidade já carregados e não modificará nenhum dado.

## Validação

- A opção avulsa não poderá ser salva sem um nome preenchido.
- O valor persistido de uma solução avulsa será o nome fornecido, nunca o rótulo `Outro / avulso`.
- A abertura de detalhes não acionará os controles de edição, remoção, movimentação de etapa nem downloads.
