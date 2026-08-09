import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildEmail, notifyReady, sendNotification, loadNotifyConfig, saveNotifyConfig, EVENT_LABELS,
} from './notify.js';

const CFG = {
  enabled: true, serviceId: 'service_x', templateId: 'template_x',
  publicKey: 'pk_x', to: 'g3.healthservice@gmail.com',
};

test('o e-mail de uma oportunidade traz nome, assunto, valor, status, ação, prazo e anexos', () => {
  const { subject, message } = buildEmail({
    tipo: 'oportunidade_nova',
    item: {
      municipality: 'Aurora', state: 'CE', solution: 'PWG — Esteira do Medicamento',
      owner: 'Gerson', value: 180000, stage: 'contracted',
      nextAction: 'Agendar kick-off', due: '2026-08-09', attachments: [{ name: 'a.pdf' }],
    },
  });
  assert.match(subject, /Nova oportunidade — Aurora · CE/);
  assert.match(message, /Nome:\s+Aurora · CE/);
  assert.match(message, /Assunto:\s+PWG — Esteira do Medicamento/);
  assert.match(message, /Valor:\s+R\$\s?180\.000,00/);
  assert.match(message, /Status:\s+Contratado/);           // rótulo, não o id 'contracted'
  assert.match(message, /Ação:\s+Agendar kick-off/);
  assert.match(message, /Prazo:\s+2026-08-09/);
  assert.match(message, /Anexos:\s+1 arquivo/);
});

test('mudança de etapa usa o rótulo legível da etapa', () => {
  const { subject, message } = buildEmail({
    tipo: 'oportunidade_etapa',
    item: { municipality: 'Serra Azul', state: 'MG', solution: 'X', owner: 'C', value: 1, stage: 'negotiation', nextAction: '-', due: '', attachments: [] },
  });
  assert.match(subject, /mudou de etapa/i);
  assert.match(message, /Status:\s+Negociação/);
});

test('o e-mail de implantação mostra etapa, marco, riscos e dependências — e não valor/prazo', () => {
  const { message } = buildEmail({
    tipo: 'implantacao_nova',
    item: {
      municipality: 'BSB', state: 'DF', solution: 'Brain27', owner: 'Implantação',
      stage: 'training', nextMilestone: 'Migrar base', risks: 'Agenda', dependencies: 'Contrato',
    },
  });
  assert.match(message, /Status:\s+Treinamento/);
  assert.match(message, /Ação:\s+Migrar base/);
  assert.match(message, /Riscos:\s+Agenda/);
  assert.match(message, /Dependências: Contrato/);
  assert.doesNotMatch(message, /Valor:/);   // implantação não tem valor
  assert.doesNotMatch(message, /Prazo:/);
});

test('todo tipo de evento tem um rótulo', () => {
  for (const tipo of Object.keys(EVENT_LABELS)) {
    const { subject } = buildEmail({ tipo, item: { municipality: 'M', state: 'SP' } });
    assert.ok(subject.includes(EVENT_LABELS[tipo]), tipo);
  }
});

test('notifyReady exige os três IDs, destinatário e o interruptor ligado', () => {
  assert.equal(notifyReady(CFG), true);
  assert.equal(notifyReady({ ...CFG, enabled: false }), false);
  assert.equal(notifyReady({ ...CFG, serviceId: '' }), false);
  assert.equal(notifyReady({ ...CFG, to: '' }), false);
});

test('sem configuração, sendNotification pula em silêncio e não chama a rede', async () => {
  let chamou = false;
  const r = await sendNotification(
    { tipo: 'oportunidade_nova', item: {} },
    { ...CFG, enabled: false },
    { fetch: async () => { chamou = true; return { ok: true }; } },
  );
  assert.equal(r.skipped, true);
  assert.equal(chamou, false);
});

test('configurado, envia o payload no formato do EmailJS', async () => {
  let capturado = null;
  const r = await sendNotification(
    { tipo: 'oportunidade_nova', item: { municipality: 'Aurora', state: 'CE', solution: 'X', owner: 'G', value: 1, stage: 'mapped', nextAction: '-', due: '', attachments: [] } },
    CFG,
    { fetch: async (url, opts) => { capturado = { url, body: JSON.parse(opts.body) }; return { ok: true }; } },
  );
  assert.equal(r.ok, true);
  assert.match(capturado.url, /api\.emailjs\.com/);
  assert.equal(capturado.body.service_id, 'service_x');
  assert.equal(capturado.body.template_id, 'template_x');
  assert.equal(capturado.body.user_id, 'pk_x');            // chave pública
  assert.equal(capturado.body.template_params.to_email, 'g3.healthservice@gmail.com');
  assert.match(capturado.body.template_params.subject, /Nova oportunidade/);
  assert.ok(capturado.body.template_params.message.includes('Aurora'));
});

test('falha de rede vira relato, nunca exceção', async () => {
  const r = await sendNotification(
    { tipo: 'oportunidade_nova', item: {} },
    CFG,
    { fetch: async () => { throw new Error('rede caiu'); } },
  );
  assert.equal(r.ok, false);
  assert.match(r.erro, /rede caiu/);
});

test('HTTP não-ok vira relato com status', async () => {
  const r = await sendNotification(
    { tipo: 'oportunidade_nova', item: {} },
    CFG,
    { fetch: async () => ({ ok: false, status: 403, text: async () => 'origem não autorizada' }) },
  );
  assert.equal(r.ok, false);
  assert.equal(r.status, 403);
  assert.match(r.detalhe, /origem/);
});

test('load/save de configuração usam um storage injetável', () => {
  const mem = new Map();
  const storage = { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, v) };
  assert.equal(loadNotifyConfig(storage).to, 'g3.healthservice@gmail.com');  // default
  saveNotifyConfig({ enabled: true, serviceId: ' s ', templateId: 't', publicKey: 'p', to: ' x@y.com ' }, storage);
  const lido = loadNotifyConfig(storage);
  assert.equal(lido.enabled, true);
  assert.equal(lido.serviceId, 's');       // trim
  assert.equal(lido.to, 'x@y.com');
});
