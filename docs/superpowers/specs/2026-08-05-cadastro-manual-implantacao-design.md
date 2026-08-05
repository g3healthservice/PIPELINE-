# Cadastro manual de projetos de implantação

## Objetivo

Permitir que a equipe cadastre um projeto diretamente na aba **Implantação**, sem depender de uma oportunidade previamente contratada no funil comercial.

## Experiência

- A página **Implantação** exibirá o botão **+ Novo projeto** ao lado do total de projetos.
- O botão abrirá um formulário próprio para projetos de implantação.
- Campos obrigatórios: Município, UF, Solução, Responsável e Próximo marco.
- Campos opcionais: Riscos e Dependências.
- Todo projeto criado manualmente começa na etapa **Kick-off** e aparece imediatamente no quadro.
- A opção **Dr ao vivo** será acrescentada à lista de soluções em todos os formulários que usam essa lista.

## Dados e persistência

- O novo projeto usará a estrutura de `implementations` já existente.
- Projetos criados manualmente não terão `source_opportunity_id`; conversões do Comercial continuarão preenchendo esse campo.
- O salvamento seguirá a integração atual com a base compartilhada.

## Validação

- O formulário não será salvo sem os campos obrigatórios.
- O projeto salvo deverá ser exibido na coluna Kick-off e atualizar o contador da aba.
- A nova solução deverá estar selecionável nos formulários Comercial e Implantação.
