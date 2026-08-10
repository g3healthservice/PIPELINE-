import test from 'node:test';
import assert from 'node:assert/strict';
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

test('recusa anexos que ultrapassam o limite de 40 MB do e-mail', () => {
  const oversized = 'A'.repeat(Math.ceil((40 * 1024 * 1024) / 0.75) + 1);

  assert.throws(() => buildOpportunityEmail({
    type: 'INSERT',
    record: { ...opportunity, attachments: [{ name: 'grande.pdf', type: 'application/pdf', data: `data:application/pdf;base64,${oversized}` }] },
  }, 'g3.healthservice@gmail.com'), /Anexos excedem o limite de 40 MB do e-mail/);
});
