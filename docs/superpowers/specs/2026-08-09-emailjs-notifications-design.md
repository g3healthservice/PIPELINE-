# Notificações de oportunidades via EmailJS — design

## Objetivo

Enviar para `g3.healthservice@gmail.com` uma mensagem personalizada pelo
modelo EmailJS `template_rzlj9wb` quando uma oportunidade for criada,
editada ou movida de etapa no Pipeline.

## Decisão

O navegador chamará o EmailJS somente depois que o Supabase confirmar o
salvamento da oportunidade. Esta é a arquitetura suportada pelo EmailJS para
uso no cliente: o Service ID `service_65fdx1s`, o Template ID
`template_rzlj9wb` e a Public Key `DWHN0tLW2X0KGJg6w` serão publicados junto
ao site. Nenhuma senha do Gmail ou chave privada será usada ou armazenada.

O EmailJS deve restringir o uso ao domínio
`https://g3healthservice.github.io` na sua allowlist. O aplicativo também
limitará o envio a uma tentativa por 10 segundos, evitando duplicações por
cliques repetidos.

## Fluxo

1. O usuário cria, edita ou move uma oportunidade.
2. O Pipeline aguarda o retorno bem-sucedido do Supabase.
3. Em seguida, monta os parâmetros compatíveis com o modelo: `tipo_notificacao`,
   `municipio`, `uf`, `solucao`, `responsavel`, `etapa`, `valor`,
   `proximo_passo`, `data_proximo_passo`, `observacoes` e `anexos`.
4. O navegador faz POST para a API do EmailJS com os três identificadores
   públicos fornecidos.
5. A interface continua disponível se o EmailJS falhar; o erro é registrado no
   console para diagnóstico sem desfazer a alteração salva no Supabase.

## Anexos

O corpo do e-mail sempre lista os nomes dos anexos em `{{anexos}}`. Para
enviá-los como arquivos, o usuário configura na aba **Anexos** do modelo uma
entrada **Variable Attachment** com parâmetro `anexo_0`, nome
`{{anexo_0_nome}}` e o tipo de conteúdo correspondente. O Pipeline envia o
primeiro anexo na variável `anexo_0`; quando houver outros, seus nomes seguem
no resumo. Isso respeita os limites do plano EmailJS e evita que uma mensagem
falhe por exceder o tamanho permitido de parâmetros.

## Arquivos afetados

- `app.js`: espera a persistência, monta os parâmetros e chama o EmailJS.
- `index.html`: inclui o SDK do EmailJS com versão fixa.
- `opportunity-management.test.mjs`: valida os IDs e o envio após persistência.
- `README.md`: substitui a configuração Resend pelas instruções EmailJS e
  registra a allowlist e o anexo dinâmico.

## Critérios de aceite

1. Criar uma oportunidade salva no Supabase e envia uma notificação EmailJS.
2. Editar ou alterar a etapa de uma oportunidade salva e envia atualização.
3. O template recebe todos os campos personalizados definidos acima.
4. O primeiro anexo é enviado como arquivo quando `anexo_0` estiver configurado
   no modelo, e todos os nomes de anexos aparecem no corpo.
5. Falhas de e-mail não cancelam alterações já salvas.
6. A Public Key pode ficar no site; não há senha do Gmail ou chave privada no
   repositório.
