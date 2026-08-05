import { commercialStages, implementationStages, canCreateImplementation, createManualImplementation, formatCurrencyInput, parseCurrencyInput, solutions } from './core.js';
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from './supabase-config.js';

const key = 'g3-projetos-piloto-v1';
const today = new Date().toISOString().slice(0, 10);
const initial = {
  opportunities: [
    { id: 'opp-aurora', municipality: 'Aurora', state: 'CE', solution: 'PWG — Esteira do Medicamento', owner: 'Gerson', stage: 'contracted', value: 180000, nextAction: 'Agendar kick-off técnico', due: today, notes: 'Piloto para medicamentos judicializados.', attachments: [] },
    { id: 'opp-serra', municipality: 'Serra Azul', state: 'MG', solution: 'Monitor de Judicialização', owner: 'Comercial', stage: 'proposal', value: 96000, nextAction: 'Retomar proposta', due: today, notes: 'Secretaria avaliando orçamento.', attachments: [] },
    { id: 'opp-rio', municipality: 'Rio Claro', state: 'SP', solution: 'RosalindTest', owner: 'Comercial', stage: 'diagnosis', value: 220000, nextAction: 'Enviar diagnóstico', due: today, notes: 'Rastreio mamário municipal.', attachments: [] },
  ],
  implementations: [],
};

let dataCache = { opportunities: [], implementations: [] };
const api = (path, options = {}) => fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
  ...options,
  headers: { apikey: SUPABASE_PUBLISHABLE_KEY, Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`, 'Content-Type': 'application/json', ...(options.headers || {}) },
});
const opportunityRecord = (item) => ({ id: item.id, municipality: item.municipality, state: item.state, solution: item.solution, owner: item.owner, stage: item.stage, value: item.value, next_action: item.nextAction, due: item.due || null, notes: item.notes, attachments: item.attachments || [] });
const implementationRecord = (item) => ({ id: item.id, source_opportunity_id: item.sourceOpportunityId, municipality: item.municipality, state: item.state, solution: item.solution, owner: item.owner, stage: item.stage, next_milestone: item.nextMilestone || '', risks: item.risks || '', dependencies: item.dependencies || '' });
async function hydrate() {
  try {
    const [opportunities, implementations] = await Promise.all([api('opportunities?select=*'), api('implementations?select=*')]);
    if (!opportunities.ok || !implementations.ok) throw new Error('Falha ao conectar a base compartilhada.');
    const [rawOpportunities, rawImplementations] = await Promise.all([opportunities.json(), implementations.json()]);
    dataCache = { opportunities: rawOpportunities.map((x) => ({ ...x, nextAction: x.next_action, attachments: x.attachments || [] })), implementations: rawImplementations.map((x) => ({ ...x, sourceOpportunityId: x.source_opportunity_id, nextMilestone: x.next_milestone })) };
  } catch (error) { console.error(error); alert('Não foi possível conectar à base compartilhada. Verifique sua internet e atualize a página.'); }
}
function load() { return dataCache; }
async function save(data) {
  try {
    const deletedImplementations = await api('implementations?id=not.is.null', { method: 'DELETE' });
    const deletedOpportunities = await api('opportunities?id=not.is.null', { method: 'DELETE' });
    if (!deletedImplementations.ok || !deletedOpportunities.ok) throw new Error('Falha ao preparar o salvamento.');
    if (data.opportunities.length) {
      const opportunities = await api('opportunities', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(data.opportunities.map(opportunityRecord)) });
      if (!opportunities.ok) throw new Error('Falha ao salvar oportunidades.');
    }
    if (data.implementations.length) {
      const implementations = await api('implementations', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(data.implementations.map(implementationRecord)) });
      if (!implementations.ok) throw new Error('Falha ao salvar implantações.');
    }
  } catch (error) { console.error(error); alert('Não foi possível salvar na base compartilhada. Tente novamente.'); }
}
function money(value) { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 2 }).format(Number(value || 0)); }
function uid(prefix) { return `${prefix}-${crypto.randomUUID()}`; }
function escapeHtml(value = '') { return String(value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char])); }

const app = document.querySelector('#app');
let page = 'overview';

function nav() {
  return `<header><div class="brand"><img class="brand-logo" src="./assets/brain27-logo.png" alt="Brain27" /><span class="brand-title">Gestão de projetos</span></div><nav>${[['overview','Visão geral'],['commercial','Comercial'],['implementation','Implantação']].map(([id, name]) => `<button class="nav ${page === id ? 'active' : ''}" data-page="${id}">${name}</button>`).join('')}</nav></header>`;
}
function attachmentLinks(attachments = []) {
  if (!attachments.length) return '';
  return `<div class="attachments">${attachments.map((file) => `<a href="${file.data}" download="${escapeHtml(file.name)}">📎 ${escapeHtml(file.name)}</a>`).join('')}</div>`;
}
function card(item, stages, type, data) {
  const canConvert = type === 'commercial' && canCreateImplementation(item, data.implementations);
  const controls = type === 'commercial'
    ? `<button class="ghost compact" data-edit="${item.id}">Editar</button><button class="danger compact" data-delete="${item.id}">Remover</button>${canConvert ? `<button class="primary compact" data-convert="${item.id}">Criar implantação</button>` : ''}`
    : '';
  return `<article class="card"><span class="tag">${escapeHtml(item.solution)}</span><h3>${escapeHtml(item.municipality)} · ${escapeHtml(item.state)}</h3><p>${type === 'commercial' ? money(item.value) : `Responsável: ${escapeHtml(item.owner)}`}</p><p class="muted">${escapeHtml(type === 'commercial' ? item.nextAction : item.nextMilestone || 'Definir próximo marco')}</p>${type === 'commercial' ? attachmentLinks(item.attachments) : ''}<div class="card-actions"><select data-move="${type}" data-id="${item.id}">${stages.map(([id, name]) => `<option value="${id}" ${id === item.stage ? 'selected' : ''}>${name}</option>`).join('')}</select>${controls}</div></article>`;
}
function board(stages, items, type, data) { return `<section class="board">${stages.map(([id, name]) => `<div class="column"><div class="column-title"><strong>${name}</strong><span>${items.filter((x) => x.stage === id).length}</span></div>${items.filter((x) => x.stage === id).map((x) => card(x, stages, type, data)).join('') || '<p class="empty">Sem itens</p>'}</div>`).join('')}</section>`; }
function overview(data) {
  const pipeline = data.opportunities.reduce((sum, x) => sum + Number(x.value || 0), 0);
  const active = data.implementations.filter((x) => !['operation', 'expansion'].includes(x.stage)).length;
  const due = data.opportunities.filter((x) => x.due && x.due <= today).length;
  return `<main><section class="hero"><div><span class="eyebrow">PAINEL OPERACIONAL</span><p>Registre municípios, conduza negociações e transforme contratos em projetos de implantação.</p></div><button class="primary" data-open-form>Nova oportunidade</button></section><section class="stats"><div><span>Pipeline comercial</span><strong>${money(pipeline)}</strong></div><div><span>Oportunidades abertas</span><strong>${data.opportunities.length}</strong></div><div><span>Implantações em andamento</span><strong>${active}</strong></div><div><span>Próximas ações hoje</span><strong>${due}</strong></div></section><section class="notice"><strong>Proteção de dados:</strong> este piloto é administrativo. Não registre dados de pacientes, prontuários ou decisões judiciais individualizadas.</section><section class="split"><div><h2>Comercial</h2><p>Municípios, soluções, valor estimado e próximo passo.</p><button class="ghost" data-page="commercial">Abrir pipeline →</button></div><div><h2>Implantação</h2><p>Projetos contratados, marcos, riscos e pendências.</p><button class="ghost" data-page="implementation">Abrir implantações →</button></div></section></main>`;
}
function commercial(data) { return `<main><section class="page-title"><div><span class="eyebrow">PIPELINE</span><h2>Comercial</h2><p>Oportunidades por município e solução.</p></div><button class="primary" data-open-form>+ Nova oportunidade</button></section>${board(commercialStages, data.opportunities, 'commercial', data)}</main>`; }
function implementation(data) { return `<main><section class="page-title"><div><span class="eyebrow">OPERAÇÃO</span><h2>Gestão da implantação</h2><p>Projetos criados manualmente ou após a contratação.</p></div><div class="page-actions"><span class="pill">${data.implementations.length} projetos</span><button class="primary" data-open-implementation-form>+ Novo projeto</button></div></section>${board(implementationStages, data.implementations, 'implementation', data)}</main>`; }
function modal(item) {
  const editing = Boolean(item);
  const value = item ? formatCurrencyInput(Math.round(Number(item.value || 0) * 100)) : 'R$ 0,00';
  const attachments = item?.attachments || [];
  return `<dialog open class="opportunity-dialog"><form id="opportunity-form"><div class="modal-title"><div><span class="eyebrow">${editing ? 'GERENCIAR OPORTUNIDADE' : 'NOVA OPORTUNIDADE'}</span><h2>${editing ? 'Editar oportunidade' : 'Nova oportunidade'}</h2></div><button type="button" data-close-form aria-label="Fechar">×</button></div><div class="form-grid"><label>Município<input name="municipality" required value="${escapeHtml(item?.municipality)}" placeholder="Ex.: Sobral" /></label><label>UF<input name="state" required maxlength="2" value="${escapeHtml(item?.state)}" placeholder="CE" /></label><label>Solução<select name="solution">${solutions.map((x) => `<option ${x === item?.solution ? 'selected' : ''}>${x}</option>`).join('')}</select></label><label>Responsável<input name="owner" required value="${escapeHtml(item?.owner || 'Comercial')}" /></label><label>Valor estimado (R$)<input name="value" required inputmode="numeric" value="${value}" /></label><label>Próximo passo<input name="nextAction" required value="${escapeHtml(item?.nextAction)}" placeholder="Ex.: agendar diagnóstico" /></label><label>Data do próximo passo<input name="due" type="date" value="${item?.due || today}" /></label><label>Observações<textarea name="notes" placeholder="Contexto da oportunidade">${escapeHtml(item?.notes)}</textarea></label><label class="attachment-field">Anexar documento<input type="file" name="attachment" accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg" /><small>Arquivos de até 1,5 MB ficam neste navegador.</small>${attachmentLinks(attachments)}</label></div><div class="modal-footer"><button type="button" class="ghost" data-close-form>Cancelar</button>${editing ? `<button type="button" class="danger" data-delete="${item.id}">Remover</button>` : ''}<button class="primary">${editing ? 'Salvar alterações' : 'Salvar oportunidade'}</button></div></form></dialog>`;
}
function implementationModal() {
  return `<dialog open class="opportunity-dialog"><form id="implementation-form"><div class="modal-title"><div><span class="eyebrow">NOVO PROJETO</span><h2>Cadastrar implantação</h2></div><button type="button" data-close-form aria-label="Fechar">×</button></div><div class="form-grid"><label>Município<input name="municipality" required placeholder="Ex.: Sobral" /></label><label>UF<input name="state" required maxlength="2" placeholder="CE" /></label><label>Solução<select name="solution">${solutions.map((x) => `<option>${x}</option>`).join('')}</select></label><label>Responsável<input name="owner" required value="Implantação" /></label><label>Próximo marco<input name="nextMilestone" required placeholder="Ex.: realizar kick-off" /></label><label>Riscos<textarea name="risks" placeholder="Ex.: agenda do município"></textarea></label><label class="attachment-field">Dependências<textarea name="dependencies" placeholder="Ex.: contrato assinado, acesso aos sistemas"></textarea></label></div><div class="modal-footer"><button type="button" class="ghost" data-close-form>Cancelar</button><button class="primary">Salvar projeto</button></div></form></dialog>`;
}
function closeForm() { app.querySelector('.opportunity-dialog')?.remove(); }
function readAttachment(file) { return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve({ name: file.name, type: file.type, data: reader.result }); reader.onerror = reject; reader.readAsDataURL(file); }); }
async function saveOpportunity(event, data, editingId) {
  event.preventDefault();
  const form = event.currentTarget;
  const raw = Object.fromEntries(new FormData(form));
  const existing = editingId ? data.opportunities.find((item) => item.id === editingId) : undefined;
  const file = form.elements.attachment.files[0];
  let attachments = existing?.attachments || [];
  if (file) {
    if (file.size > 1_500_000) return alert('Escolha um arquivo de até 1,5 MB para este piloto.');
    attachments = [...attachments, await readAttachment(file)];
  }
  const item = { ...existing, ...raw, id: editingId || uid('opp'), stage: existing?.stage || 'mapped', value: parseCurrencyInput(raw.value), attachments };
  if (editingId) data.opportunities = data.opportunities.map((current) => current.id === editingId ? item : current);
  else data.opportunities.push(item);
  save(data); closeForm(); page = 'commercial'; render();
}
function render() {
  const data = load();
  app.innerHTML = nav() + (page === 'overview' ? overview(data) : page === 'commercial' ? commercial(data) : implementation(data));
  app.querySelectorAll('[data-move]').forEach((el) => el.addEventListener('change', () => { const list = el.dataset.move === 'commercial' ? data.opportunities : data.implementations; list.find((item) => item.id === el.dataset.id).stage = el.value; save(data); render(); }));
}
function openOpportunityModal(data, item) {
  try { app.insertAdjacentHTML('beforeend', modal(item)); bindForm(data, item?.id); }
  catch (error) { console.error(error); alert('Não foi possível abrir a edição. Atualize a página e tente novamente.'); }
}
function openImplementationModal(data) {
  app.insertAdjacentHTML('beforeend', implementationModal());
  const form = app.querySelector('#implementation-form');
  form.querySelectorAll('[data-close-form]').forEach((button) => button.addEventListener('click', closeForm));
  form.addEventListener('submit', (event) => saveImplementation(event, data));
}
function saveImplementation(event, data) {
  event.preventDefault();
  const raw = Object.fromEntries(new FormData(event.currentTarget));
  data.implementations.push(createManualImplementation(raw, uid('impl')));
  save(data); closeForm(); page = 'implementation'; render();
}
function removeOpportunity(data, id) {
  if (!window.confirm('Remover esta oportunidade? Esta ação não pode ser desfeita.')) return;
  data.opportunities = data.opportunities.filter((item) => item.id !== id);
  save(data); closeForm(); render();
}
app.addEventListener('click', (event) => {
  const target = event.target.closest('[data-page], [data-open-form], [data-open-implementation-form], [data-edit], [data-delete], [data-convert]');
  if (!target) return;
  const data = load();
  if (target.dataset.page) { page = target.dataset.page; render(); return; }
  if (target.hasAttribute('data-open-form')) { openOpportunityModal(data); return; }
  if (target.hasAttribute('data-open-implementation-form')) { openImplementationModal(data); return; }
  if (target.dataset.edit) { openOpportunityModal(data, data.opportunities.find((item) => item.id === target.dataset.edit)); return; }
  if (target.dataset.delete) { removeOpportunity(data, target.dataset.delete); return; }
  if (target.dataset.convert) {
    const source = data.opportunities.find((item) => item.id === target.dataset.convert);
    if (!canCreateImplementation(source, data.implementations)) return;
    data.implementations.push({ id: uid('impl'), sourceOpportunityId: source.id, municipality: source.municipality, state: source.state, solution: source.solution, owner: source.owner, stage: 'kickoff', nextMilestone: 'Realizar reunião de kick-off', risks: '', dependencies: '' });
    save(data); page = 'implementation'; render();
  }
});
function bindForm(data, editingId) {
  const form = app.querySelector('#opportunity-form');
  form.querySelectorAll('[data-close-form]').forEach((button) => button.addEventListener('click', closeForm));
  const value = form.elements.value;
  value.addEventListener('input', () => { value.value = formatCurrencyInput(value.value); });
  form.addEventListener('submit', (event) => saveOpportunity(event, data, editingId));
}
render();
hydrate().then(render);
