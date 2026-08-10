import test from 'node:test';
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { emailjsConfig, emailjsParams, sendOpportunityEmail } from './emailjs-notification.js';

test('monta os parâmetros personalizados e o primeiro anexo do EmailJS', () => {
  const params = emailjsParams('created', { id: 'opp-1', municipality: 'BSB', state: 'DF', solution: 'PWG', owner: 'Comercial', stage: 'mapped', value: 10, nextAction: 'Agendar', due: '2026-08-10', notes: '', attachments: [{ name: 'proposta.pdf', data: 'data:application/pdf;base64,QUJD' }] });
  assert.equal(params.tipo_notificacao, 'Nova oportunidade');
  assert.equal(params.municipio, 'BSB');
  assert.equal(params.anexo_0, 'data:application/pdf;base64,QUJD');
  assert.equal(params.anexo_0_nome, 'proposta.pdf');
});

test('monta parâmetros de atualização sem anexos', () => {
  const params = emailjsParams('updated', {
    municipality: 'Goiânia', state: 'GO', solution: 'PWG', owner: 'Comercial', stage: 'proposal',
    value: 20, nextAction: 'Retornar', due: '2026-08-11', notes: '', attachments: [],
  });

  assert.equal(params.tipo_notificacao, 'Oportunidade atualizada');
  assert.equal(params.anexos, 'Sem anexos');
  assert.equal('anexo_0' in params, false);
});

test('envia os parâmetros para a API EmailJS', async () => {
  let request;
  const fetcher = async (url, options) => {
    request = { url, options };
    return { ok: true };
  };
  const item = {
    municipality: 'BSB', state: 'DF', solution: 'PWG', owner: 'Comercial', stage: 'mapped',
    value: 10, nextAction: 'Agendar', due: '2026-08-10', notes: '', attachments: [],
  };

  await sendOpportunityEmail('created', item, fetcher);

  assert.equal(request.url, 'https://api.emailjs.com/api/v1.0/email/send');
  assert.equal(request.options.method, 'POST');
  assert.equal(request.options.headers['Content-Type'], 'application/json');
  assert.deepEqual(JSON.parse(request.options.body), {
    service_id: emailjsConfig.serviceId,
    template_id: emailjsConfig.templateId,
    user_id: emailjsConfig.publicKey,
    template_params: emailjsParams('created', item),
  });
});

test('rejeita quando a API EmailJS responde com erro', async () => {
  await assert.rejects(
    sendOpportunityEmail('created', { attachments: [] }, async () => ({ ok: false })),
    /EmailJS/,
  );
});

test('documenta a allowlist e o anexo dinâmico do EmailJS', async () => {
  const readme = await readFile(new URL('./README.md', import.meta.url), 'utf8');
  const index = await readFile(new URL('./index.html', import.meta.url), 'utf8');

  assert.match(readme, /https:\/\/g3healthservice\.github\.io/);
  assert.match(readme, /anexo_0/);
  assert.match(index, /app\.js\?v=\d{8}-\d+/);
});
