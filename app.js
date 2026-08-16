import { commercialStages, implementationStages, canCreateImplementation } from './core.js';

const solutions = ['Raio-X Captação SUS', 'Monitor de Judicialização', 'PWG — Esteira do Medicamento', 'RosalindTest', 'Linda LifeTech', 'PinkPapa', 'Radar de Editais', 'Brain27'];
const key = 'g3-projetos-piloto-v1';
const today = new Date().toISOString().slice(0, 10);
const initial = {
  opportunities: [
    { id: 'opp-aurora', municipality: 'Aurora', state: 'CE', solution: 'PWG — Esteira do Medicamento', owner: 'Gerson', stage: 'contracted', value: 180000, nextAction: 'Agendar kick-off técnico', due: today, notes: 'Piloto para medicamentos judicializados.' },
    { id: 'opp-serra', municipality: 'Serra Azul', state: 'MG', solution: 'Monitor de Judicialização', owner: 'Comercial', stage: 'proposal', value: 96000, nextAction: 'Retomar proposta', due: today, notes: 'Secretaria avaliando orçamento.' },
    { id: 'opp-rio', municipality: 'Rio Claro', state: 'SP', solution: 'RosalindTest', owner: 'Comercial', stage: 'diagnosis', value: 220000, nextAction: 'Enviar diagnóstico', due: today, notes: 'Rastreio mamário municipal.' },
  ],
  implementations: [],
};

function load() { return JSON.parse(localStorage.getItem(key) || JSON.stringify(initial)); }
function save(data) { localStorage.setItem(key, JSON.stringify(data)); }
function money(value) { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(Number(value || 0)); }
function label(stages, value) { return stages.find(([id]) => id === value)?.[1] || value; }
function uid(prefix) { return `${prefix}-${crypto.randomUUID()}`; }

const app = document.querySelector('#app');
let page = 'overview';

function nav() {
  return `<header><div><span class="eyebrow">G3 HEALTH SERVICE</span><h1>Projetos-pipeline</h1></div><nav>${[['overview','Visão geral'],['commercial','Comercial'],['implementation','Implantação']].map(([id, name]) => `<button class="nav ${page === id ? 'active' : ''}" data-page="${id}">${name}</button>`).join('')}</nav></header>`;
}
function card(item, stages, type, data) {
  const canConvert = type === 'commercial' && canCreateImplementation(item, data.implementations);
  return `<article class="card"><span class="tag">${item.solution}</span><h3>${item.municipality} · ${item.state}</h3><p>${type === 'commercial' ? money(item.value) : `Responsável: ${item.owner}`}</p><p class="muted">${type === 'commercial' ? item.nextAction : item.nextMilestone || 'Definir próximo marco'}</p><div class="card-actions"><select data-move="${type}" data-id="${item.id}">${stages.map(([id, name]) => `<option value="${id}" ${id === item.stage ? 'selected' : ''}>${name}</option>`).join('')}</select>${canConvert ? `<button class="primary compact" data-convert="${item.id}">Criar implantação</button>` : ''}</div></article>`;
}
function board(stages, items, type, data) {
  return `<section class="board">${stages.map(([id, name]) => `<div class="column"><div class="column-title"><strong>${name}</strong><span>${items.filter((x) => x.stage === id).length}</span></div>${items.filter((x) => x.stage === id).map((x) => card(x, stages, type, data)).join('') || '<p class="empty">Sem itens</p>'}</div>`).join('')}</section>`;
}
function overview(data) {
  const pipeline = data.opportunities.reduce((sum, x) => sum + Number(x.value || 0), 0);
  const active = data.implementations.filter((x) => !['operation', 'expansion'].includes(x.stage)).length;
  const due = data.opportunities.filter((x) => x.due && x.due <= today).length;
  return `<main><section class="hero"><div><span class="eyebrow">PILOTO OPERACIONAL</span><h2>Comercial e implantação, conectados sem se confundirem.</h2><p>Registre municípios, conduza negociações e só então transforme contratos em projetos de implantação.</p></div><button class="primary" data-page="commercial">Nova oportunidade</button></section><section class="stats"><div><span>Pipeline comercial</span><strong>${money(pipeline)}</strong></div><div><span>Oportunidades abertas</span><strong>${data.opportunities.length}</strong></div><div><span>Implantações em andamento</span><strong>${active}</strong></div><div><span>Próximas ações hoje</span><strong>${due}</strong></div></section><section class="notice"><strong>Proteção de dados:</strong> este piloto é administrativo. Não registre dados de pacientes, prontuários ou decisões judiciais individualizadas.</section><section class="split"><div><h2>Comercial</h2><p>Municípios, soluções, valor estimado e próximo passo.</p><button class="ghost" data-page="commercial">Abrir pipeline →</button></div><div><h2>Implantação</h2><p>Projetos contratados, marcos, riscos e pendências.</p><button class="ghost" data-page="implementation">Abrir implantações →</button></div></section></main>`;
}
function commercial(data) {
  return `<main><section class="page-title"><div><span class="eyebrow">PIPELINE</span><h2>Comercial</h2><p>Oportunidades por município e solução.</p></div><button class="primary" data-open-form>+ Nova oportunidade</button></section>${board(commercialStages, data.opportunities, 'commercial', data)}</main>`;
}
function implementation(data) {
  return `<main><section class="page-title"><div><span class="eyebrow">OPERAÇÃO</span><h2>Gestão da implantação</h2><p>Projetos criados exclusivamente após a contratação.</p></div><span class="pill">${data.implementations.length} projetos</span></section>${board(implementationStages, data.implementations, 'implementation', data)}</main>`;
}
function modal() {
  return `<dialog open><form method="dialog" id="opportunity-form"><div class="modal-title"><h2>Nova oportunidade</h2><button value="cancel" aria-label="Fechar">×</button></div><div class="form-grid"><label>Município<input name="municipality" required placeholder="Ex.: Sobral" /></label><label>UF<input name="state" required maxlength="2" placeholder="CE" /></label><label>Solução<select name="solution">${solutions.map((x) => `<option>${x}</option>`).join('')}</select></label><label>Responsável<input name="owner" required value="Comercial" /></label><label>Valor estimado (R$)<input name="value" type="number" min="0" value="0" /></label><label>Próximo passo<input name="nextAction" required placeholder="Ex.: agendar diagnóstico" /></label><label>Data do próximo passo<input name="due" type="date" value="${today}" /></label><label>Observações<textarea name="notes" placeholder="Contexto da oportunidade"></textarea></label></div><div class="modal-footer"><button value="cancel" class="ghost">Cancelar</button><button class="primary">Salvar oportunidade</button></div></form></dialog>`;
}
function render() {
  const data = load();
  app.innerHTML = nav() + (page === 'overview' ? overview(data) : page === 'commercial' ? commercial(data) : implementation(data));
  app.querySelectorAll('[data-page]').forEach((el) => el.addEventListener('click', () => { page = el.dataset.page; render(); }));
  app.querySelectorAll('[data-move]').forEach((el) => el.addEventListener('change', () => { const list = el.dataset.move === 'commercial' ? data.opportunities : data.implementations; const item = list.find((x) => x.id === el.dataset.id); item.stage = el.value; save(data); render(); }));
  app.querySelectorAll('[data-convert]').forEach((el) => el.addEventListener('click', () => { const source = data.opportunities.find((x) => x.id === el.dataset.convert); if (!canCreateImplementation(source, data.implementations)) return; data.implementations.push({ id: uid('impl'), sourceOpportunityId: source.id, municipality: source.municipality, state: source.state, solution: source.solution, owner: source.owner, stage: 'kickoff', nextMilestone: 'Realizar reunião de kick-off', risks: '', dependencies: '' }); save(data); page = 'implementation'; render(); }));
  app.querySelector('[data-open-form]')?.addEventListener('click', () => { app.insertAdjacentHTML('beforeend', modal()); const form = app.querySelector('#opportunity-form'); form.addEventListener('submit', (event) => { event.preventDefault(); const value = Object.fromEntries(new FormData(form)); data.opportunities.push({ ...value, id: uid('opp'), stage: 'mapped', value: Number(value.value) }); save(data); render(); }); });
}
render();
