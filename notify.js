// Notificação por e-mail das mudanças do pipeline.
//
// O G3 Projetos é um site estático (GitHub Pages + Supabase): não tem
// servidor onde guardar uma senha de e-mail. A forma correta de um site
// estático enviar e-mail é por um serviço próprio para isso — aqui, o EmailJS
// —, que guarda as credenciais do lado dele e só libera o envio para o
// domínio que você autorizar. O que fica no navegador (chave pública, IDs) não
// é segredo.
//
// Como TODO cadastro e TODA mudança do pipeline passam por esta página, enviar
// no momento de salvar cobre todos os casos. Não é preciso servidor nem
// webhook.
//
// Regra de ouro deste módulo: notificar NUNCA pode quebrar nem atrasar o
// salvamento. Todas as funções de envio são "dispare e esqueça" e engolem o
// próprio erro — se o e-mail falha, o dado já está salvo assim mesmo.

import { commercialStages, implementationStages } from './core.js';
import { NOTIFY_DEFAULTS } from './notify-config.js';

const LS_KEY = 'g3-notify-config';
const EMAILJS_URL = 'https://api.emailjs.com/api/v1.0/email/send';

// Rótulo legível de cada tipo de evento. A chave é o que o app dispara.
export const EVENT_LABELS = {
  oportunidade_nova: 'Nova oportunidade',
  oportunidade_editada: 'Oportunidade atualizada',
  oportunidade_etapa: 'Oportunidade mudou de etapa',
  oportunidade_removida: 'Oportunidade removida',
  implantacao_nova: 'Novo projeto de implantação',
  implantacao_derivada: 'Implantação criada a partir de contrato',
  implantacao_editada: 'Implantação atualizada',
  implantacao_etapa: 'Implantação mudou de etapa',
};

export function loadNotifyConfig(storage = globalThis.localStorage) {
  let salvo = {};
  try {
    salvo = JSON.parse(storage?.getItem(LS_KEY) || '{}') || {};
  } catch { salvo = {}; }
  return { ...NOTIFY_DEFAULTS, ...salvo };
}

export function saveNotifyConfig(cfg, storage = globalThis.localStorage) {
  const limpo = {
    enabled: Boolean(cfg.enabled),
    serviceId: String(cfg.serviceId || '').trim(),
    templateId: String(cfg.templateId || '').trim(),
    publicKey: String(cfg.publicKey || '').trim(),
    to: String(cfg.to || '').trim(),
  };
  storage?.setItem(LS_KEY, JSON.stringify(limpo));
  return limpo;
}

// Só está "pronto" quando tem os três IDs do EmailJS, um destinatário, e está
// ligado. Faltando qualquer um, o envio é pulado em silêncio.
export function notifyReady(cfg) {
  return Boolean(cfg && cfg.enabled && cfg.serviceId && cfg.templateId
    && cfg.publicKey && cfg.to);
}

function moneyBRL(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency', currency: 'BRL', maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

function stageLabel(item) {
  const tabela = 'nextMilestone' in item || 'risks' in item
    ? implementationStages : commercialStages;
  return tabela.find(([id]) => id === item.stage)?.[1] || item.stage || '—';
}

// Formatador PURO: dado o evento, devolve assunto e corpo. Sem rede, sem
// localStorage -- é o que os testes exercitam.
export function buildEmail(evento) {
  const item = evento.item || {};
  const rotulo = EVENT_LABELS[evento.tipo] || 'Atualização no pipeline';
  const isComercial = evento.tipo.startsWith('oportunidade');
  const nome = [item.municipality, item.state].filter(Boolean).join(' · ') || '—';
  const acao = isComercial
    ? (item.nextAction || '—')
    : (item.nextMilestone || '—');
  const anexos = Array.isArray(item.attachments) ? item.attachments.length : 0;

  const linhas = [
    rotulo.toUpperCase(),
    '',
    `Nome:        ${nome}`,
    `Assunto:     ${item.solution || '—'}`,
    `Responsável: ${item.owner || '—'}`,
  ];
  if (isComercial) linhas.push(`Valor:       ${moneyBRL(item.value)}`);
  linhas.push(`Status:      ${stageLabel(item)}`);
  linhas.push(`Ação:        ${acao}`);
  if (isComercial) {
    linhas.push(`Prazo:       ${item.due || '—'}`);
    linhas.push(`Anexos:      ${anexos} arquivo(s)`);
  } else {
    if (item.risks) linhas.push(`Riscos:      ${item.risks}`);
    if (item.dependencies) linhas.push(`Dependências: ${item.dependencies}`);
  }
  linhas.push('', '— Enviado automaticamente pelo G3 Projetos.');

  const subject = `[G3 Projetos] ${rotulo} — ${nome}`;
  return { subject, message: linhas.join('\n') };
}

// Envia (ou pula). NUNCA levanta: devolve um relato. `deps` permite injetar
// fetch nos testes.
export async function sendNotification(evento, cfg = loadNotifyConfig(), deps = {}) {
  const fetchFn = deps.fetch || globalThis.fetch;
  if (!notifyReady(cfg)) return { skipped: true, motivo: 'nao configurado' };
  const { subject, message } = buildEmail(evento);
  const corpo = {
    service_id: cfg.serviceId,
    template_id: cfg.templateId,
    user_id: cfg.publicKey,
    template_params: {
      to_email: cfg.to,
      subject,
      title: EVENT_LABELS[evento.tipo] || 'Pipeline',
      message,
    },
  };
  try {
    const resp = await fetchFn(EMAILJS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(corpo),
    });
    if (resp.ok) return { ok: true };
    const texto = await resp.text().catch(() => '');
    return { ok: false, status: resp.status, detalhe: texto.slice(0, 200) };
  } catch (error) {
    return { ok: false, erro: String(error && error.message || error) };
  }
}
