import { buildOpportunityEmail } from '../../../email-notification.js';

type EventType = 'INSERT' | 'UPDATE';
type OpportunityEvent = { type: EventType; record: { id: string; [key: string]: unknown } };

const recipient = 'g3.healthservice@gmail.com';
const requiredSecret = (name: string) => {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Configuração ausente: ${name}.`);
  return value;
};

async function readJson(response: Response) {
  const text = await response.text();
  try { return text ? JSON.parse(text) : {}; }
  catch { return { message: text }; }
}

async function writeLog(record: Record<string, unknown>) {
  const serviceRoleKey = requiredSecret('SUPABASE_SERVICE_ROLE_KEY');
  const response = await fetch(`${requiredSecret('SUPABASE_URL')}/rest/v1/opportunity_notification_log`, {
    method: 'POST',
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(record),
  });
  if (!response.ok) throw new Error('Não foi possível registrar a notificação.');
}

function validEvent(event: unknown): event is OpportunityEvent {
  if (!event || typeof event !== 'object') return false;
  const candidate = event as Partial<OpportunityEvent>;
  return (candidate.type === 'INSERT' || candidate.type === 'UPDATE') && Boolean(candidate.record?.id);
}

Deno.serve(async (request) => {
  if (request.method !== 'POST') return Response.json({ error: 'Método não permitido.' }, { status: 405 });
  if (request.headers.get('x-notification-secret') !== Deno.env.get('OPPORTUNITY_NOTIFICATION_SECRET')) {
    return Response.json({ error: 'Não autorizado.' }, { status: 401 });
  }

  let event: unknown;
  try { event = await request.json(); }
  catch { return Response.json({ error: 'Evento inválido.' }, { status: 400 }); }
  if (!validEvent(event)) return Response.json({ error: 'Evento inválido.' }, { status: 400 });

  const eventType = event.type === 'INSERT' ? 'created' : 'updated';
  try {
    const email = buildOpportunityEmail(event, recipient);
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${requiredSecret('RESEND_API_KEY')}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': email.idempotencyKey,
      },
      body: JSON.stringify({ from: requiredSecret('RESEND_FROM'), ...email }),
    });
    const payload = await readJson(response);
    await writeLog({
      opportunity_id: event.record.id,
      event_type: eventType,
      status: response.ok ? 'sent' : 'failed',
      resend_email_id: payload.id ?? null,
      error_message: response.ok ? null : (payload.message ?? 'Resend recusou o envio.'),
    });
    if (!response.ok) return Response.json({ ok: false, error: 'Não foi possível enviar a notificação.' }, { status: 500 });
    return Response.json({ ok: true, emailId: payload.id });
  } catch (error) {
    try {
      await writeLog({
        opportunity_id: event.record.id,
        event_type: eventType,
        status: 'failed',
        error_message: error instanceof Error ? error.message : 'Falha desconhecida no envio.',
      });
    } catch (logError) { console.error(logError); }
    console.error(error);
    return Response.json({ ok: false, error: 'Não foi possível enviar a notificação.' }, { status: 500 });
  }
});
