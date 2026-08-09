const maxEmailBytes = 40 * 1024 * 1024;

function escapeHtml(value = '') {
  return String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
}

function money(value) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 2 }).format(Number(value || 0));
}

function attachmentPayload(attachment) {
  const [, content = ''] = String(attachment.data || '').split(',', 2);
  return { filename: attachment.name, content, content_type: attachment.type || 'application/octet-stream' };
}

export function buildOpportunityEmail({ type, record }, recipient) {
  if (!['INSERT', 'UPDATE'].includes(type) || !record?.id) throw new Error('Evento de oportunidade inválido.');
  const created = type === 'INSERT';
  const attachments = (record.attachments || []).map(attachmentPayload);
  const attachmentBytes = attachments.reduce((total, attachment) => total + Math.ceil(attachment.content.length * 0.75), 0);
  if (attachmentBytes > maxEmailBytes) throw new Error('Anexos excedem o limite de 40 MB do e-mail.');

  const action = created ? 'Nova oportunidade' : 'Oportunidade atualizada';
  const label = `${record.municipality} · ${record.state}`;
  const fields = [
    ['Município', label],
    ['Solução', record.solution],
    ['Responsável', record.owner],
    ['Etapa', record.stage],
    ['Valor estimado', money(record.value)],
    ['Próximo passo', record.next_action || 'Não informado'],
    ['Data do próximo passo', record.due || 'Não informada'],
    ['Observações', record.notes || 'Não informadas'],
  ];
  const text = [action, ...fields.map(([name, value]) => `${name}: ${value}`)].join('\n');
  const html = `<h1>${escapeHtml(action)}</h1><dl>${fields.map(([name, value]) => `<dt><strong>${escapeHtml(name)}</strong></dt><dd>${escapeHtml(value)}</dd>`).join('')}</dl>`;

  return {
    to: recipient,
    subject: `${action} — ${label}`,
    text,
    html,
    attachments,
    idempotencyKey: `${record.id}:${created ? 'created' : 'updated'}`,
  };
}
