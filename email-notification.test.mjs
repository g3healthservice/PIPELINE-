import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { buildOpportunityEmail } from './email-notification.js';

const opportunity = {
  id: 'opp-1',
  municipality: 'BSB',
  state: 'DF',
  solution: 'PWG',
  owner: 'Comercial',
  stage: 'mapped',
  value: 1200,
  next_action: 'Agendar reunião',
  due: '2026-08-10',
  notes: 'Prioridade alta',
  attachments: [],
};

test('monta aviso de nova oportunidade para o destinatário definido', () => {
  const email = buildOpportunityEmail({ type: 'INSERT', record: opportunity }, 'g3.healthservice@gmail.com');

  assert.equal(email.to, 'g3.healthservice@gmail.com');
  assert.equal(email.subject, 'Nova oportunidade — BSB · DF');
  assert.match(email.text, /PWG/);
  assert.equal(email.idempotencyKey, 'opp-1:created');
});

test('monta aviso de atualização e envia anexos Base64', () => {
  const email = buildOpportunityEmail({
    type: 'UPDATE',
    record: {
      ...opportunity,
      attachments: [{ name: 'proposta.pdf', type: 'application/pdf', data: 'data:application/pdf;base64,QUJD' }],
    },
  }, 'g3.healthservice@gmail.com');

  assert.equal(email.subject, 'Oportunidade atualizada — BSB · DF');
  assert.equal(email.idempotencyKey, 'opp-1:updated');
  assert.deepEqual(email.attachments, [{ filename: 'proposta.pdf', content: 'QUJD', content_type: 'application/pdf' }]);
});

test('recusa anexos que ultrapassam o limite de 40 MB do Resend', () => {
  const oversized = 'A'.repeat(Math.ceil((40 * 1024 * 1024) / 0.75) + 1);

  assert.throws(() => buildOpportunityEmail({
    type: 'INSERT',
    record: { ...opportunity, attachments: [{ name: 'grande.pdf', type: 'application/pdf', data: `data:application/pdf;base64,${oversized}` }] },
  }, 'g3.healthservice@gmail.com'), /Anexos excedem o limite de 40 MB do e-mail/);
});

test('a função de envio exige segredo, chama o Resend e registra o resultado', async () => {
  const source = await readFile(new URL('./supabase/functions/notify-opportunity/index.ts', import.meta.url), 'utf8');

  assert.match(source, /x-notification-secret/);
  assert.match(source, /requiredSecret\('RESEND_API_KEY'\)/);
  assert.match(source, /https:\/\/api\.resend\.com\/emails/);
  assert.match(source, /opportunity_notification_log/);
});

test('a migração notifica apenas inserções e mudanças reais de oportunidade', async () => {
  const sql = await readFile(new URL('./supabase/email-notifications.sql', import.meta.url), 'utf8');

  assert.match(sql, /create table if not exists public\.opportunity_notification_log/i);
  assert.match(sql, /after insert or update on public\.opportunities/i);
  assert.match(sql, /old is not distinct from new/i);
  assert.match(sql, /net\.http_post/i);
  assert.match(sql, /revoke all on public\.opportunity_notification_log from anon/i);
});

test('documenta os secrets sem vazar valores reais', async () => {
  const env = await readFile(new URL('./supabase/.env.example', import.meta.url), 'utf8');
  const readme = await readFile(new URL('./README.md', import.meta.url), 'utf8');
  const packageJson = await readFile(new URL('./package.json', import.meta.url), 'utf8');

  assert.match(env, /^RESEND_API_KEY=$/m);
  assert.match(env, /^OPPORTUNITY_NOTIFICATION_SECRET=$/m);
  assert.match(readme, /g3\.healthservice@gmail\.com/);
  assert.match(readme, /supabase functions deploy notify-opportunity/);
  assert.match(packageJson, /node --check email-notification\.js/);
});
