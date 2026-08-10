export const emailjsConfig = { serviceId: 'service_65fdx1s', templateId: 'template_rzlj9wb', publicKey: 'DWHN0tLW2X0KGJg6w' };

function money(value) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 2 }).format(Number(value || 0));
}

export function emailjsParams(type, item) {
  const firstAttachment = item.attachments?.[0];
  return {
    tipo_notificacao: type === 'created' ? 'Nova oportunidade' : 'Oportunidade atualizada',
    municipio: item.municipality, uf: item.state, solucao: item.solution,
    responsavel: item.owner, etapa: item.stage, valor: money(item.value),
    proximo_passo: item.nextAction, data_proximo_passo: item.due,
    observacoes: item.notes || 'Não informado',
    anexos: item.attachments?.map((file) => file.name).join(', ') || 'Sem anexos',
    ...(firstAttachment ? { anexo_0: firstAttachment.data, anexo_0_nome: firstAttachment.name } : {}),
  };
}

export async function sendOpportunityEmail(type, item, fetcher = fetch) {
  const response = await fetcher('https://api.emailjs.com/api/v1.0/email/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      service_id: emailjsConfig.serviceId,
      template_id: emailjsConfig.templateId,
      user_id: emailjsConfig.publicKey,
      template_params: emailjsParams(type, item),
    }),
  });

  if (!response.ok) throw new Error('EmailJS request failed.');
  return response;
}
