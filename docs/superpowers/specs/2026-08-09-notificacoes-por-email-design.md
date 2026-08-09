# Notificações de oportunidades por e-mail — design

## Objetivo

Enviar uma notificação transacional para `g3.healthservice@gmail.com` sempre
que uma oportunidade comercial for criada ou efetivamente alterada, incluindo
mudança de etapa. A mensagem deve conter o resumo do registro e todos os
anexos cadastrados, quando o tamanho total for aceito pelo provedor de e-mail.

## Decisão e limites atuais

O envio será feito por uma Supabase Edge Function integrada ao Resend. A chave
`RESEND_API_KEY` ficará nos secrets do Supabase, nunca no JavaScript público ou
no repositório. Sem acesso ao DNS de `brain27.com.br`, o remetente inicial será
o remetente de testes autorizado pelo Resend. Quando a equipe tiver acesso ao
DNS, a troca para `notificacoes@brain27.com.br` será apenas de configuração do
provedor e da função.

O projeto não possui login. Por isso o navegador não chamará uma API de e-mail
diretamente: a base de dados acionará a função depois de gravar a oportunidade.
Isso mantém o segredo protegido e só notifica alterações que realmente foram
persistidas.

## Fluxo

1. O usuário cria ou edita uma oportunidade no painel.
2. O painel grava os dados normalmente no Supabase.
3. Um gatilho `AFTER INSERT OR UPDATE` em `public.opportunities` chama a Edge
   Function somente no insert ou quando os campos monitorados mudarem. O
   `WHEN (OLD IS DISTINCT FROM NEW)` evita e-mails para os upserts que gravam
   exatamente os mesmos valores.
4. A função recebe a versão nova do registro, monta o resumo em HTML e texto e
   envia pelo Resend para `g3.healthservice@gmail.com`.
5. Os anexos do campo `attachments` são transformados em anexos do e-mail,
   preservando nome e tipo. Se o tamanho total ultrapassar o limite do Resend,
   a função registra a falha e não envia uma mensagem incompleta.
6. Cada tentativa é registrada em `opportunity_notification_log`, com o tipo
   (`created` ou `updated`), a oportunidade, o identificador de entrega do
   Resend ou a descrição do erro.

## Conteúdo da mensagem

- Assunto: `Nova oportunidade — Município · UF` ou
  `Oportunidade atualizada — Município · UF`.
- Dados: município, UF, solução, responsável, etapa, valor estimado, próximo
  passo, data, observações e o motivo da notificação.
- Anexos: todos os documentos salvos na oportunidade, quando presentes.

## Idempotência e falhas

A função deriva uma chave de idempotência do identificador da oportunidade e
do evento gravado. O Resend a utiliza para impedir o reenvio da mesma tentativa
por até 24 horas. Um erro de notificação não reverte nem bloqueia o salvamento
da oportunidade. Ele fica visível no log técnico para nova tentativa manual.

## Arquivos e configuração previstos

- `supabase/functions/notify-opportunity/index.ts`: Edge Function que valida o
  evento, produz a mensagem e chama o Resend.
- `supabase/email-notifications.sql`: tabela de log, gatilho e webhook seguro
  para a função.
- `supabase/.env.example`: nomes dos secrets, sem valores reais.
- `README.md`: procedimento para criar a conta Resend, cadastrar
  `RESEND_API_KEY`, configurar o remetente temporário, executar o SQL e
  publicar a função.
- Testes de unidade para a montagem do payload e os casos de criação, edição,
  anexos, alteração sem conteúdo e falha do provedor.

## Critérios de aceite

1. Criar uma oportunidade envia um e-mail para `g3.healthservice@gmail.com`.
2. Editar qualquer campo ou a etapa envia um e-mail de atualização.
3. Um salvamento sem mudança de dados não envia e-mail.
4. O e-mail apresenta todos os campos definidos e os anexos válidos.
5. Nenhuma chave do Resend aparece no site publicado ou no Git.
6. Falhas de e-mail não impedem a oportunidade de ser salva e ficam
   registradas para diagnóstico.
