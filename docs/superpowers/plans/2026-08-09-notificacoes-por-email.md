# Notificações de oportunidades por e-mail Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enviar e-mails para `g3.healthservice@gmail.com` quando uma oportunidade for criada ou alterada, com resumo e anexos, sem expor credenciais no site.

**Architecture:** Um gatilho PostgreSQL chama uma Supabase Edge Function após inserts e alterações reais em `public.opportunities`. A função usa o secret `RESEND_API_KEY` para chamar a API do Resend, registra cada entrega em uma tabela de auditoria e nunca bloqueia a gravação da oportunidade caso o e-mail falhe.

**Tech Stack:** JavaScript ES modules e `node:test`; PostgreSQL/Supabase Database Webhooks; Supabase Edge Functions (Deno/TypeScript); Resend Email API.

## Global Constraints

- O destinatário inicial é `g3.healthservice@gmail.com`.
- Não gravar `RESEND_API_KEY`, chaves de webhook ou dados de teste no Git nem no JavaScript público.
- O remetente inicial será o remetente de testes autorizado pelo Resend; trocar pelo domínio Brain27 depende de acesso ao DNS.
- A notificação é disparada somente após persistência bem-sucedida no banco.
- Enviar anexos apenas se o conjunto todo respeitar o limite de 40 MB do Resend após Base64; registrar falha em vez de enviar mensagem incompleta.
- O salvamento da oportunidade não pode falhar por erro de e-mail.

---

## Estrutura de arquivos

- Criar `email-notification.js`: funções puras para identificar o evento, criar assunto/corpo e converter anexos em payload do Resend.
- Criar `email-notification.test.mjs`: testes Node para a regra de criação, atualização, anexos e limite de tamanho.
- Criar `supabase/functions/notify-opportunity/index.ts`: endpoint privado que valida a requisição de webhook, usa o secret e registra a tentativa.
- Criar `supabase/email-notifications.sql`: tabela de log, função SQL de webhook e gatilho `AFTER INSERT OR UPDATE`.
- Criar `supabase/.env.example`: lista de secrets exigidos, sem valores sensíveis.
- Modificar `README.md`: instalação e ativação no Supabase/Resend, incluindo o passo manual do remetente temporário.

### Task 1: Criar o construtor testável do e-mail

**Files:**
- Create: `email-notification.js`
- Create: `email-notification.test.mjs`

**Interfaces:**
- Consumes: um registro de oportunidade com `id`, `municipality`, `state`, `solution`, `owner`, `stage`, `value`, `next_action`, `due`, `notes` e `attachments`.
- Produces: `buildOpportunityEmail(event, recipient)` que devolve `{ subject, html, text, attachments, idempotencyKey }` ou lança `Error('Anexos excedem o limite de 40 MB do e-mail.')`.

- [ ] **Step 1: Write the failing test**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildOpportunityEmail } from './email-notification.js';

const opportunity = {
  id: 'opp-1', municipality: 'BSB', state: 'DF', solution: 'PWG',
  owner: 'Comercial', stage: 'mapped', value: 1200, next_action: 'Agendar',
  due: '2026-08-10', notes: 'Prioridade alta', attachments: [],
};

test('monta aviso de nova oportunidade para o destinatário definido', () => {
  const email = buildOpportunityEmail({ type: 'INSERT', record: opportunity }, 'g3.healthservice@gmail.com');
  assert.equal(email.subject, 'Nova oportunidade — BSB · DF');
  assert.match(email.text, /PWG/);
  assert.equal(email.idempotencyKey, 'opp-1:created');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test email-notification.test.mjs`

Expected: FAIL because `email-notification.js` does not exist.

- [ ] **Step 3: Write minimal implementation**

```js
const maxEmailBytes = 40 * 1024 * 1024;

export function buildOpportunityEmail({ type, record }, recipient) {
  const created = type === 'INSERT';
  const attachments = (record.attachments || []).map(({ name, type: contentType, data }) => ({
    filename: name,
    content: data.split(',')[1],
    contentType,
  }));
  const bytes = attachments.reduce((sum, file) => sum + Math.ceil(file.content.length * 0.75), 0);
  if (bytes > maxEmailBytes) throw new Error('Anexos excedem o limite de 40 MB do e-mail.');
  const label = `${record.municipality} · ${record.state}`;
  const action = created ? 'Nova oportunidade' : 'Oportunidade atualizada';
  return {
    to: recipient,
    subject: `${action} — ${label}`,
    text: `${action}\nSolução: ${record.solution}\nResponsável: ${record.owner}\nEtapa: ${record.stage}`,
    html: `<h1>${action}</h1><p><strong>Solução:</strong> ${record.solution}</p>`,
    attachments,
    idempotencyKey: `${record.id}:${created ? 'created' : 'updated'}`,
  };
}
```

- [ ] **Step 4: Expand the test cases and verify them**

Add assertions for `UPDATE` (`Oportunidade atualizada` and `opp-1:updated`), for one data-URL attachment (`filename` and Base64 content), and for an attachment set above 40 MB. Run: `node --test email-notification.test.mjs`.

Expected: PASS for all four tests.

- [ ] **Step 5: Commit**

```bash
git add email-notification.js email-notification.test.mjs
git commit -m "feat: build opportunity email payloads"
```

### Task 2: Criar a Edge Function privada de envio e auditoria

**Files:**
- Create: `supabase/functions/notify-opportunity/index.ts`
- Modify: `email-notification.test.mjs`

**Interfaces:**
- Consumes: POST interno com `{ type: 'INSERT' | 'UPDATE', record: OpportunityRecord }` e cabeçalho `x-notification-secret`.
- Produces: `200 { ok: true, emailId }` para entrega aceita, `400` para evento inválido, `401` para segredo inválido e `500` quando o provedor rejeitar a entrega.

- [ ] **Step 1: Write the failing test**

```js
test('documenta que a função exige segredo e chama o Resend pelo payload puro', async () => {
  const source = await readFile(new URL('./supabase/functions/notify-opportunity/index.ts', import.meta.url), 'utf8');
  assert.match(source, /x-notification-secret/);
  assert.match(source, /Deno\.env\.get\('RESEND_API_KEY'\)/);
  assert.match(source, /https:\/\/api\.resend\.com\/emails/);
  assert.match(source, /opportunity_notification_log/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test email-notification.test.mjs`

Expected: FAIL because the Edge Function does not exist.

- [ ] **Step 3: Write minimal implementation**

```ts
import { buildOpportunityEmail } from '../../../email-notification.js';

const recipient = 'g3.healthservice@gmail.com';

Deno.serve(async (request) => {
  if (request.headers.get('x-notification-secret') !== Deno.env.get('OPPORTUNITY_NOTIFICATION_SECRET')) {
    return Response.json({ error: 'Não autorizado.' }, { status: 401 });
  }
  const event = await request.json();
  if (!['INSERT', 'UPDATE'].includes(event.type) || !event.record?.id) {
    return Response.json({ error: 'Evento inválido.' }, { status: 400 });
  }
  const email = buildOpportunityEmail(event, recipient);
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': email.idempotencyKey,
    },
    body: JSON.stringify({ from: Deno.env.get('RESEND_FROM'), ...email }),
  });
  const payload = await response.json();
  await fetch(`${Deno.env.get('SUPABASE_URL')}/rest/v1/opportunity_notification_log`, {
    method: 'POST',
    headers: {
      apikey: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      opportunity_id: event.record.id,
      event_type: event.type === 'INSERT' ? 'created' : 'updated',
      status: response.ok ? 'sent' : 'failed',
      resend_email_id: payload.id ?? null,
      error_message: response.ok ? null : (payload.message ?? 'Resend recusou o envio.'),
    }),
  });
  return Response.json(response.ok ? { ok: true, emailId: payload.id } : { ok: false }, { status: response.ok ? 200 : 500 });
});
```

- [ ] **Step 4: Make the implementation complete and run checks**

Wrap the Resend request and the audit POST in this error path so no secret is returned to the caller:

```ts
try {
  // Resend request followed by the audit POST shown in Step 3.
} catch (error) {
  await writeLog({
    opportunity_id: event.record.id,
    event_type: event.type === 'INSERT' ? 'created' : 'updated',
    status: 'failed',
    error_message: error instanceof Error ? error.message : 'Falha desconhecida no envio.',
  });
  return Response.json({ ok: false, error: 'Não foi possível enviar a notificação.' }, { status: 500 });
}
```

Define `writeLog(record)` as the audit POST shown in Step 3 and have it throw when its response is not `ok`. Run: `node --test email-notification.test.mjs && deno check supabase/functions/notify-opportunity/index.ts`.

Expected: tests pass and `deno check` reports no TypeScript errors.

- [ ] **Step 5: Commit**

```bash
git add email-notification.test.mjs supabase/functions/notify-opportunity/index.ts
git commit -m "feat: send opportunity notifications from edge function"
```

### Task 3: Adicionar o gatilho persistente e o log de notificações

**Files:**
- Create: `supabase/email-notifications.sql`
- Modify: `email-notification.test.mjs`

**Interfaces:**
- Consumes: operações INSERT e UPDATE persistidas em `public.opportunities`.
- Produces: uma chamada HTTP autenticada para `functions/v1/notify-opportunity` e linhas de auditoria em `public.opportunity_notification_log`.

- [ ] **Step 1: Write the failing test**

```js
test('a migração notifica apenas inserções e mudanças reais de oportunidade', async () => {
  const sql = await readFile(new URL('./supabase/email-notifications.sql', import.meta.url), 'utf8');
  assert.match(sql, /create table public\.opportunity_notification_log/i);
  assert.match(sql, /after insert or update on public\.opportunities/i);
  assert.match(sql, /old is distinct from new/i);
  assert.match(sql, /net\.http_post/i);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test email-notification.test.mjs`

Expected: FAIL because the SQL migration does not exist.

- [ ] **Step 3: Write minimal implementation**

```sql
create extension if not exists pg_net;

create table public.opportunity_notification_log (
  id bigint generated always as identity primary key,
  opportunity_id text not null references public.opportunities(id) on delete cascade,
  event_type text not null check (event_type in ('created', 'updated')),
  status text not null check (status in ('sent', 'failed')),
  resend_email_id text,
  error_message text,
  created_at timestamptz not null default now()
);

create or replace function public.notify_opportunity()
returns trigger language plpgsql security definer as $$
declare
  function_url text;
  notification_secret text;
begin
  if tg_op = 'UPDATE' and old is not distinct from new then return new; end if;
  select decrypted_secret into function_url
  from vault.decrypted_secrets where name = 'opportunity_notification_url';
  select decrypted_secret into notification_secret
  from vault.decrypted_secrets where name = 'opportunity_notification_secret';
  if function_url is null or notification_secret is null then return new; end if;
  perform net.http_post(
    url := function_url,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-notification-secret', notification_secret),
    body := jsonb_build_object('type', tg_op, 'record', to_jsonb(new))
  );
  return new;
end;
$$;

create trigger opportunity_email_notification
after insert or update on public.opportunities
for each row execute function public.notify_opportunity();
```

-- [ ] **Step 4: Make the migration safe and verify it**

Add `revoke all on public.opportunity_notification_log from anon;` after the table creation. Create the two Vault values through the Supabase SQL Editor before applying the trigger, using this exact pattern with real local values substituted only in the SQL Editor:

```sql
select vault.create_secret('https://bpycttojdgafwfjbmtya.supabase.co/functions/v1/notify-opportunity', 'opportunity_notification_url');
select vault.create_secret('replace-with-a-long-random-secret', 'opportunity_notification_secret');
```

Run: `node --test email-notification.test.mjs` and apply the SQL in a non-production Supabase project before production.

Expected: tests pass; an INSERT creates one queued HTTP request; an UPDATE with unchanged values creates none; a changed stage creates one.

- [ ] **Step 5: Commit**

```bash
git add email-notification.test.mjs supabase/email-notifications.sql
git commit -m "feat: trigger opportunity email notifications"
```

### Task 4: Documentar e configurar a ativação segura

**Files:**
- Create: `supabase/.env.example`
- Modify: `README.md`
- Modify: `package.json`

**Interfaces:**
- Consumes: conta Resend, chave `RESEND_API_KEY` e secrets do projeto Supabase.
- Produces: instruções reproduzíveis para definir secrets, publicar a função, aplicar SQL e testar uma oportunidade sem adicionar segredos ao repositório.

- [ ] **Step 1: Write the failing test**

```js
test('documenta os secrets sem vazar valores reais', async () => {
  const env = await readFile(new URL('./supabase/.env.example', import.meta.url), 'utf8');
  const readme = await readFile(new URL('./README.md', import.meta.url), 'utf8');
  assert.match(env, /^RESEND_API_KEY=$/m);
  assert.match(env, /^OPPORTUNITY_NOTIFICATION_SECRET=$/m);
  assert.match(readme, /g3\.healthservice@gmail\.com/);
  assert.match(readme, /supabase functions deploy notify-opportunity/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test email-notification.test.mjs`

Expected: FAIL because the example environment file and instructions do not exist.

- [ ] **Step 3: Write minimal implementation**

```dotenv
RESEND_API_KEY=
RESEND_FROM=
OPPORTUNITY_NOTIFICATION_SECRET=
SUPABASE_SERVICE_ROLE_KEY=
```

Add to `README.md` these ordered commands, replacing only placeholders locally:

```bash
supabase secrets set --env-file supabase/.env
supabase functions deploy notify-opportunity --no-verify-jwt
```

Also document: create a Resend account, set `RESEND_FROM` to its authorized test sender, apply `supabase/email-notifications.sql` in SQL Editor, set the database webhook URL and secret as Vault values, then create and edit a test opportunity.

- [ ] **Step 4: Add full project verification and run it**

Add `node --check email-notification.js` to `npm run check`. Run: `npm test && npm run check && git diff --check`. Manually create one opportunity and edit its stage in the configured environment; confirm two messages reach `g3.healthservice@gmail.com`, each has the expected summary and any attached test file.

Expected: all automated checks pass; the manual test produces one creation and one update message.

- [ ] **Step 5: Commit**

```bash
git add README.md package.json supabase/.env.example email-notification.test.mjs
git commit -m "docs: explain email notification setup"
```

## Self-review

- Cobertura: Tasks 1 e 2 formam e enviam e-mails com anexos; Task 3 liga a persistência ao envio sem alertas para upserts idênticos; Task 4 mantém secrets fora do site e documenta a ativação.
- Sem placeholders: cada tarefa contém arquivos, interfaces, teste que falha, comando de execução, implementação de referência, verificação e commit.
- Consistência: `buildOpportunityEmail` é a única interface de formação de mensagem usada pela Edge Function; `opportunity_notification_log` é criado pelo SQL e escrito pela função.
