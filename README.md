# G3 Projetos — piloto

Aplicação web estática para validar o fluxo entre Comercial e Gestão da Implantação.

## Rodar localmente

Abra `index.html` em um navegador moderno.

**Atenção:** os dados **não** ficam mais no navegador. Desde a conexão com o Supabase, tudo que você digita aqui vai para a base compartilhada — inclusive rodando localmente. Não existe modo de demonstração isolado: editar local altera o que os outros veem.

## Base compartilhada online

`supabase/schema.sql` descreve a estrutura da base. As credenciais ficam em `supabase-config.js`.

Como o piloto **não tem login**, a política de acesso libera leitura e escrita para qualquer visitante do site. Quem tiver o endereço pode criar, alterar e apagar registros. Isso é aceitável para um piloto administrativo e **não** é aceitável para dado pessoal: não registre pacientes, prontuários, documentos judiciais individualizados ou qualquer dado sensível.

### Migração pendente na base que está no ar

A base foi criada com `source_opportunity_id NOT NULL`, o que faz o banco **recusar** todo projeto cadastrado pelo botão `+ Novo projeto` (um projeto manual não tem oportunidade de origem). Rode uma vez, no SQL Editor do Supabase:

```sql
alter table public.implementations alter column source_opportunity_id drop not null;
```

Enquanto isso não for feito, o projeto manual aparece na tela e não é gravado.

## Como um projeto de implantação nasce

1. **Derivado** — botão `Criar implantação` no card do Comercial. Só aparece para oportunidade em *Contratado* que ainda não gerou projeto, e a oportunidade fica registrada em `sourceOpportunityId`.
2. **Manual** — botão `+ Novo projeto` na aba Implantação, para contrato antigo, adesão a ata ou projeto herdado. Nasce com `sourceOpportunityId: null`, o que garante que ele nunca bloqueie a conversão de uma oportunidade legítima do funil.

## Verificação

`npm test` valida a regra central — só uma oportunidade contratada sem implantação derivada pode criar um projeto — e que o projeto manual não interfere nela.

`npm run check` valida a sintaxe de `app.js` e `core.js`.

## Notificações de oportunidades por e-mail

O projeto já contém a função e a migração para enviar notificações para
`g3.healthservice@gmail.com` na criação, edição ou mudança de etapa de uma
oportunidade. O envio acontece depois da gravação no banco; uma falha de
e-mail nunca desfaz a oportunidade.

### Ativação necessária

1. Crie uma conta no [Resend](https://resend.com) e gere uma API key de envio.
   Sem acesso ao DNS de `brain27.com.br`, use o remetente de testes autorizado
   pelo Resend no campo `RESEND_FROM`.
2. Copie `supabase/.env.example` para `supabase/.env` e preencha apenas na sua
   máquina `RESEND_API_KEY`, `RESEND_FROM`, `OPPORTUNITY_NOTIFICATION_SECRET`
   (uma sequência longa e aleatória) e `SUPABASE_SERVICE_ROLE_KEY`. Não envie
   esse arquivo por e-mail, chat ou Git.
3. Instale a CLI do Supabase, autentique-se no projeto `bpycttojdgafwfjbmtya`
   e execute:

   ```bash
   supabase secrets set --env-file supabase/.env
   supabase functions deploy notify-opportunity --no-verify-jwt
   ```

4. No SQL Editor do Supabase, crie os dois segredos do banco, substituindo
   apenas o valor aleatório pelo mesmo valor de `OPPORTUNITY_NOTIFICATION_SECRET`:

   ```sql
   select vault.create_secret(
     'https://bpycttojdgafwfjbmtya.supabase.co/functions/v1/notify-opportunity',
     'opportunity_notification_url'
   );
   select vault.create_secret(
     'substitua-pelo-segredo-aleatorio',
     'opportunity_notification_secret'
   );
   ```

5. Ainda no SQL Editor, aplique todo o conteúdo de `supabase/email-notifications.sql`.
6. Crie uma oportunidade e depois altere sua etapa. Devem chegar dois e-mails:
   um de criação e outro de atualização, com resumo e anexos. Se algum envio
   falhar, consulte `opportunity_notification_log` no Supabase.

O Resend limita cada e-mail, já codificado em Base64, a 40 MB. Quando os anexos
ultrapassarem esse total, o registro fica marcado como falho no log em vez de
ser enviada uma mensagem parcial. Quando houver acesso ao DNS, valide
`brain27.com.br` no Resend e altere somente o secret `RESEND_FROM` para usar o
remetente institucional.
