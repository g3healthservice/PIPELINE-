import { commercialStages, implementationStages, canCreateImplementation, formatCurrencyInput, parseCurrencyInput } from './core.js';

const solutions = ['Raio-X Captação SUS', 'Monitor de Judicialização', 'PWG — Esteira do Medicamento', 'RosalindTest', 'Linda LifeTech', 'PinkPapa', 'Radar de Editais', 'Unidades móveis'];
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

function load() {
  const data = JSON.parse(localStorage.getItem(key) || JSON.stringify(initial));
  data.opportunities = data.opportunities.map((item) => ({
    ...item,
    solution: item.solution === 'Brain27' ? 'Unidades móveis' : item.solution,
    attachments: item.attachments || [],
  }));
  save(data);
  return data;
}
function save(data) { localStorage.setItem(key, JSON.stringify(data)); }
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
function implementation(data) { return `<main><section class="page-title"><div><span class="eyebrow">OPERAÇÃO</span><h2>Gestão da implantação</h2><p>Projetos criados exclusivamente após a contratação.</p></div><span class="pill">${data.implementations.length} projetos</span></section>${board(implementationStages, data.implementations, 'implementation', data)}</main>`; }
function modal(item) {
  const editing = Boolean(item);
  const value = item ? formatCurrencyInput(Math.round(Number(item.value || 0) * 100)) : 'R$ 0,00';
  const attachments = item?.attachments || [];
  return `<dialog open class="opportunity-dialog"><form id="opportunity-form"><div class="modal-title"><div><span class="eyebrow">${editing ? 'GERENCIAR OPORTUNIDADE' : 'NOVA OPORTUNIDADE'}</span><h2>${editing ? 'Editar oportunidade' : 'Nova oportunidade'}</h2></div><button type="button" data-close-form aria-label="Fechar">×</button></div><div class="form-grid"><label>Município<input name="municipality" required value="${escapeHtml(item?.municipality)}" placeholder="Ex.: Sobral" /></label><label>UF<input name="state" required maxlength="2" value="${escapeHtml(item?.state)}" placeholder="CE" /></label><label>Solução<select name="solution">${solutions.map((x) => `<option ${x === item?.solution ? 'selected' : ''}>${x}</option>`).join('')}</select></label><label>Responsável<input name="owner" required value="${escapeHtml(item?.owner || 'Comercial')}" /></label><label>Valor estimado (R$)<input name="value" required inputmode="numeric" value="${value}" /></label><label>Próximo passo<input name="nextAction" required value="${escapeHtml(item?.nextAction)}" placeholder="Ex.: agendar diagnóstico" /></label><label>Data do próximo passo<input name="due" type="date" value="${item?.due || today}" /></label><label>Observações<textarea name="notes" placeholder="Contexto da oportunidade">${escapeHtml(item?.notes)}</textarea></label><label class="attachment-field">Anexar documento<input type="file" name="attachment" accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg" /><small>Arquivos de até 1,5 MB ficam neste navegador.</small>${attachmentLinks(attachments)}</label></div><div class="modal-footer"><button type="button" class="ghost" data-close-form>Cancelar</button>${editing ? `<button type="button" class="danger" data-delete="${item.id}">Remover</button>` : ''}<button class="primary">${editing ? 'Salvar alterações' : 'Salvar oportunidade'}</button></div></form></dialog>`;
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
  app.querySelectorAll('[data-page]').forEach((el) => el.addEventListener('click', () => { page = el.dataset.page; render(); }));
  app.querySelectorAll('[data-move]').forEach((el) => el.addEventListener('change', () => { const list = el.dataset.move === 'commercial' ? data.opportunities : data.implementations; list.find((item) => item.id === el.dataset.id).stage = el.value; save(data); render(); }));
  app.querySelectorAll('[data-open-form]').forEach((el) => el.addEventListener('click', () => { app.insertAdjacentHTML('beforeend', modal()); bindForm(data); }));
  app.querySelectorAll('[data-edit]').forEach((el) => el.addEventListener('click', () => { app.insertAdjacentHTML('beforeend', modal(data.opportunities.find((item) => item.id === el.dataset.edit))); bindForm(data, el.dataset.edit); }));
  app.querySelectorAll('[data-delete]').forEach((el) => el.addEventListener('click', () => { if (window.confirm('Remover esta oportunidade? Esta ação não pode ser desfeita.')) { data.opportunities = data.opportunities.filter((item) => item.id !== el.dataset.delete); save(data); closeForm(); render(); } }));
  app.querySelectorAll('[data-convert]').forEach((el) => el.addEventListener('click', () => { const source = data.opportunities.find((item) => item.id === el.dataset.convert); if (!canCreateImplementation(source, data.implementations)) return; data.implementations.push({ id: uid('impl'), sourceOpportunityId: source.id, municipality: source.municipality, state: source.state, solution: source.solution, owner: source.owner, stage: 'kickoff', nextMilestone: 'Realizar reunião de kick-off', risks: '', dependencies: '' }); save(data); page = 'implementation'; render(); }));
}
function bindForm(data, editingId) {
  const form = app.querySelector('#opportunity-form');
  form.querySelectorAll('[data-close-form]').forEach((button) => button.addEventListener('click', closeForm));
  const value = form.elements.value;
  value.addEventListener('input', () => { value.value = formatCurrencyInput(value.value); });
  form.addEventListener('submit', (event) => saveOpportunity(event, data, editingId));
  form.querySelector('[data-delete]')?.addEventListener('click', () => { if (window.confirm('Remover esta oportunidade? Esta ação não pode ser desfeita.')) { data.opportunities = data.opportunities.filter((item) => item.id !== editingId); save(data); closeForm(); render(); } });
}
render();
