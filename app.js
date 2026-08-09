import { commercialStages, implementationStages, canCreateImplementation, createManualImplementation, customSolutionLabel, formatCurrencyInput, normalizeOpportunitySolution, parseCurrencyInput, solutions } from './core.js';
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
const implementationRecord = (item) => ({ id: item.id, source_opportunity_id: item.sourceOpportunityId ?? null, municipality: item.municipality, state: item.state, solution: item.solution, owner: item.owner, stage: item.stage, next_milestone: item.nextMilestone || '', risks: item.risks || '', dependencies: item.dependencies || '' });
async function hydrate() {
  try {
    const [opportunities, implementations] = await Promise.all([api('opportunities?select=*'), api('implementations?select=*')]);
    if (!opportunities.ok || !implementations.ok) throw new Error('Falha ao conectar a base compartilhada.');
    const [rawOpportunities, rawImplementations] = await Promise.all([opportunities.json(), implementations.json()]);
    dataCache = { opportunities: rawOpportunities.map((x) => ({ ...x, nextAction: x.next_action, attachments: x.attachments || [] })), implementations: rawImplementations.map((x) => ({ ...x, sourceOpportunityId: x.source_opportunity_id, nextMilestone: x.next_milestone })) };
  } catch (error) { console.error(error); alert('Não foi possível conectar à base compartilhada. Verifique sua internet e atualize a página.'); }
}
function load() { return dataCache; }
// Grava primeiro, apaga depois -- e apaga so o que sumiu da tela.
//
// A versao anterior fazia o contrario: DELETE em tudo, depois INSERT em tudo.
// Isso significa que qualquer falha DEPOIS do delete (queda de rede, aba
// fechada, insert recusado pelo banco) deixava a base vazia, com o unico
// exemplar dos dados vivo na memoria daquela aba. E a mensagem "tente
// novamente" era enganosa: nao havia mais o que tentar.
//
// Nao resolve edicao simultanea -- duas pessoas mexendo ao mesmo tempo ainda
// se sobrescrevem linha a linha. Resolve a destruicao.
async function upsert(tabela, registros) {
  if (!registros.length) return;
  const resposta = await api(tabela, {
    method: 'POST',
    headers: { Prefer: 'return=minimal,resolution=merge-duplicates' },
    body: JSON.stringify(registros),
  });
  if (!resposta.ok) throw new Error(`Falha ao salvar ${tabela}: ${resposta.status}`);
}
async function removerAusentes(tabela, itens) {
  const filtro = itens.length
    ? `id=not.in.(${itens.map((item) => `"${item.id}"`).join(',')})`
    : 'id=not.is.null';
  const resposta = await api(`${tabela}?${filtro}`, { method: 'DELETE' });
  if (!resposta.ok) throw new Error(`Falha ao remover de ${tabela}: ${resposta.status}`);
}
async function save(data) {
  try {
    // Oportunidade antes de implantacao: a implantacao derivada tem chave
    // estrangeira para a oportunidade e o insert falha se ela ainda nao existe.
    await upsert('opportunities', data.opportunities.map(opportunityRecord));
    await upsert('implementations', data.implementations.map(implementationRecord));
    // Na remocao, a ordem se inverte pelo mesmo motivo.
    await removerAusentes('implementations', data.implementations);
    await removerAusentes('opportunities', data.opportunities);
  } catch (error) { console.error(error); alert('Não foi possível salvar na base compartilhada. Nada foi apagado — tente novamente.'); }
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
// Se a solucao gravada nao estiver mais na lista (a lista ja mudou uma vez, e
// vai mudar de novo), ela entra como opcao mesmo assim. Sem isso, abrir a
// edicao de um registro antigo trocaria a solucao dele em silencio pela
// primeira da lista -- o usuario salva achando que so mexeu na descricao.
function solutionOptions(atual, includeCustom = false) {
  const lista = !atual || solutions.includes(atual) ? [...solutions] : [atual, ...solutions];
  if (includeCustom && !lista.includes(customSolutionLabel)) lista.push(customSolutionLabel);
  return lista.map((x) => `<option ${x === atual ? 'selected' : ''}>${escapeHtml(x)}</option>`).join('');
}
function card(item, stages, type, data) {
  const canConvert = type === 'commercial' && canCreateImplementation(item, data.implementations);
  const controls = type === 'commercial'
    ? `<button class="ghost compact" data-edit="${item.id}">Editar</button><button class="danger compact" data-delete="${item.id}">Remover</button>${canConvert ? `<button class="primary compact" data-convert="${item.id}">Criar implantação</button>` : ''}`
    : `<button class="ghost compact" data-edit-implementation="${item.id}">Editar</button>`;
  const summary = `<span class="tag">${escapeHtml(item.solution)}</span><h3>${escapeHtml(item.municipality)} · ${escapeHtml(item.state)}</h3><p>${type === 'commercial' ? money(item.value) : `Responsável: ${escapeHtml(item.owner)}`}</p><p class="muted">${escapeHtml(type === 'commercial' ? item.nextAction : item.nextMilestone || 'Definir próximo marco')}</p>`;
  const clickableSummary = type === 'commercial'
    ? `<button type="button" class="card-summary" data-view="${item.id}" aria-label="Ver detalhes de ${escapeHtml(item.municipality)}">${summary}</button>`
    : `<button type="button" class="card-summary" data-view-implementation="${item.id}" aria-label="Ver detalhes de ${escapeHtml(item.municipality)}">${summary}</button>`;
  return `<article class="card">${clickableSummary}${type === 'commercial' ? attachmentLinks(item.attachments) : ''}<div class="card-actions"><select data-move="${type}" data-id="${item.id}">${stages.map(([id, name]) => `<option value="${id}" ${id === item.stage ? 'selected' : ''}>${name}</option>`).join('')}</select>${controls}</div></article>`;
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
  const isCustomSolution = item && !solutions.includes(item.solution);
  const selectedSolution = isCustomSolution ? customSolutionLabel : item?.solution;
  const customSolution = isCustomSolution ? item.solution : '';
  return `<dialog class="opportunity-dialog"><form id="opportunity-form"><div class="modal-title"><div><span class="eyebrow">${editing ? 'GERENCIAR OPORTUNIDADE' : 'NOVA OPORTUNIDADE'}</span><h2>${editing ? 'Editar oportunidade' : 'Nova oportunidade'}</h2></div><button type="button" data-close-form aria-label="Fechar">×</button></div><div class="form-grid"><label>Município<input name="municipality" required value="${escapeHtml(item?.municipality)}" placeholder="Ex.: Sobral" /></label><label>UF<input name="state" required maxlength="2" value="${escapeHtml(item?.state)}" placeholder="CE" /></label><label>Solução<select name="solution">${solutionOptions(selectedSolution, true)}</select></label><label class="custom-solution-field" ${isCustomSolution ? '' : 'hidden'}>Nome do produto/serviço<input name="customSolution" value="${escapeHtml(customSolution)}" placeholder="Ex.: consultoria especializada" /></label><label>Responsável<input name="owner" required value="${escapeHtml(item?.owner || 'Comercial')}" /></label><label>Valor estimado (R$)<input name="value" required inputmode="numeric" value="${value}" /></label><label>Próximo passo<input name="nextAction" required value="${escapeHtml(item?.nextAction)}" placeholder="Ex.: agendar diagnóstico" /></label><label>Data do próximo passo<input name="due" type="date" value="${item?.due || today}" /></label><label>Observações<textarea name="notes" placeholder="Contexto da oportunidade">${escapeHtml(item?.notes)}</textarea></label><label class="attachment-field">Anexar documento<input type="file" name="attachment" accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg" /><small>Arquivos de até 1,5 MB ficam neste navegador.</small>${attachmentLinks(attachments)}</label></div><div class="modal-footer"><button type="button" class="ghost" data-close-form>Cancelar</button>${editing ? `<button type="button" class="danger" data-delete="${item.id}">Remover</button>` : ''}<button class="primary">${editing ? 'Salvar alterações' : 'Salvar oportunidade'}</button></div></form></dialog>`;
}
function implementationModal(item) {
  const editing = Boolean(item);
  const origem = item?.sourceOpportunityId
    ? '<p class="muted small">Projeto derivado de uma oportunidade contratada. Editar aqui não desfaz esse vínculo.</p>'
    : '';
  return `<dialog class="opportunity-dialog"><form id="implementation-form"><div class="modal-title"><div><span class="eyebrow">${editing ? 'EDITAR PROJETO' : 'NOVO PROJETO'}</span><h2>${editing ? 'Editar implantação' : 'Cadastrar implantação'}</h2></div><button type="button" data-close-form aria-label="Fechar">×</button></div>${origem}<div class="form-grid"><label>Município<input name="municipality" required value="${escapeHtml(item?.municipality)}" placeholder="Ex.: Sobral" /></label><label>UF<input name="state" required maxlength="2" value="${escapeHtml(item?.state)}" placeholder="CE" /></label><label>Solução<select name="solution">${solutionOptions(item?.solution)}</select></label><label>Responsável<input name="owner" required value="${escapeHtml(item?.owner || 'Implantação')}" /></label><label>Próximo marco<input name="nextMilestone" required value="${escapeHtml(item?.nextMilestone)}" placeholder="Ex.: realizar kick-off" /></label><label>Riscos<textarea name="risks" placeholder="Ex.: agenda do município">${escapeHtml(item?.risks)}</textarea></label><label class="attachment-field">Dependências<textarea name="dependencies" placeholder="Ex.: contrato assinado, acesso aos sistemas">${escapeHtml(item?.dependencies)}</textarea></label></div><div class="modal-footer"><button type="button" class="ghost" data-close-form>Cancelar</button><button class="primary">${editing ? 'Salvar alterações' : 'Salvar projeto'}</button></div></form></dialog>`;
}
function opportunityDetailsModal(item) {
  const field = (label, value) => `<div><dt>${label}</dt><dd>${escapeHtml(value || 'Não informado')}</dd></div>`;
  return `<dialog class="opportunity-dialog"><section class="details-dialog" data-view-detail><div class="modal-title"><div><span class="eyebrow">DETALHES DA OPORTUNIDADE</span><h2>${escapeHtml(item.municipality)} · ${escapeHtml(item.state)}</h2></div><button type="button" data-close-form aria-label="Fechar">×</button></div><dl class="details-grid">${field('Solução', item.solution)}${field('Responsável', item.owner)}${field('Valor estimado', money(item.value))}${field('Próximo passo', item.nextAction)}${field('Data do próximo passo', item.due)}${field('Observações', item.notes)}</dl><div class="detail-attachments"><strong>Anexos</strong>${attachmentLinks(item.attachments) || '<p class="muted">Sem anexos.</p>'}</div><div class="modal-footer"><button type="button" class="ghost" data-close-form>Fechar</button></div></section></dialog>`;
}
function implementationDetailsModal(item) {
  const field = (label, value) => `<div><dt>${label}</dt><dd>${escapeHtml(value || 'Não informado')}</dd></div>`;
  const stage = implementationStages.find(([id]) => id === item.stage)?.[1] || item.stage;
  return `<dialog class="opportunity-dialog"><section class="details-dialog" data-view-implementation-detail><div class="modal-title"><div><span class="eyebrow">DETALHES DA IMPLANTAÇÃO</span><h2>${escapeHtml(item.municipality)} · ${escapeHtml(item.state)}</h2></div><button type="button" data-close-form aria-label="Fechar">×</button></div><dl class="details-grid">${field('Solução', item.solution)}${field('Responsável', item.owner)}${field('Etapa', stage)}${field('Próximo marco', item.nextMilestone)}${field('Riscos', item.risks)}${field('Dependências', item.dependencies)}</dl><div class="modal-footer"><button type="button" class="ghost" data-close-form>Fechar</button></div></section></dialog>`;
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
  const { customSolution, ...opportunityFields } = raw;
  const item = { ...existing, ...opportunityFields, solution: normalizeOpportunitySolution(raw), id: editingId || uid('opp'), stage: existing?.stage || 'mapped', value: parseCurrencyInput(raw.value), attachments };
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
  try { app.insertAdjacentHTML('beforeend', modal(item)); app.querySelector('.opportunity-dialog').showModal(); bindForm(data, item?.id); }
  catch (error) { console.error(error); alert('Não foi possível abrir a edição. Atualize a página e tente novamente.'); }
}
function openOpportunityDetails(data, id) {
  const item = data.opportunities.find((opportunity) => opportunity.id === id);
  if (!item) return;
  app.insertAdjacentHTML('beforeend', opportunityDetailsModal(item));
  app.querySelector('.opportunity-dialog').showModal();
  app.querySelectorAll('[data-close-form]').forEach((button) => button.addEventListener('click', closeForm));
}
function openImplementationDetails(data, id) {
  const item = data.implementations.find((implementation) => implementation.id === id);
  if (!item) return;
  app.insertAdjacentHTML('beforeend', implementationDetailsModal(item));
  app.querySelector('.opportunity-dialog').showModal();
  app.querySelectorAll('[data-close-form]').forEach((button) => button.addEventListener('click', closeForm));
}
function openImplementationModal(data, item) {
  app.insertAdjacentHTML('beforeend', implementationModal(item));
  app.querySelector('.opportunity-dialog').showModal();
  const form = app.querySelector('#implementation-form');
  form.querySelectorAll('[data-close-form]').forEach((button) => button.addEventListener('click', closeForm));
  form.addEventListener('submit', (event) => saveImplementation(event, data, item?.id));
}
function saveImplementation(event, data, editingId) {
  event.preventDefault();
  const raw = Object.fromEntries(new FormData(event.currentTarget));
  if (editingId) {
    const existing = data.implementations.find((item) => item.id === editingId);
    // O espalhamento de "existing" vem PRIMEIRO e nao e detalhe: id, stage e
    // sourceOpportunityId nao estao no formulario. Se o objeto fosse montado
    // do zero a partir do formulario, editar a descricao de um projeto
    // derivado apagaria o vinculo com a oportunidade -- e a oportunidade
    // voltaria a poder virar um segundo projeto.
    const atualizado = { ...existing, ...raw };
    data.implementations = data.implementations.map((current) => current.id === editingId ? atualizado : current);
  } else {
    data.implementations.push(createManualImplementation(raw, uid('impl')));
  }
  save(data); closeForm(); page = 'implementation'; render();
}
function removeOpportunity(data, id) {
  if (!window.confirm('Remover esta oportunidade? Esta ação não pode ser desfeita.')) return;
  data.opportunities = data.opportunities.filter((item) => item.id !== id);
  save(data); closeForm(); render();
}
app.addEventListener('click', (event) => {
  const target = event.target.closest('[data-page], [data-open-form], [data-open-implementation-form], [data-view], [data-view-implementation], [data-edit], [data-edit-implementation], [data-delete], [data-convert]');
  if (!target) return;
  const data = load();
  if (target.dataset.page) { page = target.dataset.page; render(); return; }
  if (target.hasAttribute('data-open-form')) { openOpportunityModal(data); return; }
  if (target.hasAttribute('data-open-implementation-form')) { openImplementationModal(data); return; }
  if (target.dataset.view) { openOpportunityDetails(data, target.dataset.view); return; }
  if (target.dataset.viewImplementation) { openImplementationDetails(data, target.dataset.viewImplementation); return; }
  if (target.dataset.editImplementation) { openImplementationModal(data, data.implementations.find((item) => item.id === target.dataset.editImplementation)); return; }
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
  form.elements.solution.addEventListener('change', () => toggleCustomSolutionField(form));
  toggleCustomSolutionField(form);
  form.addEventListener('submit', (event) => saveOpportunity(event, data, editingId));
}
function toggleCustomSolutionField(form) {
  const isCustom = form.elements.solution.value === customSolutionLabel;
  const field = form.elements.customSolution;
  field.closest('.custom-solution-field').hidden = !isCustom;
  field.required = isCustom;
}
render();
hydrate().then(render);
