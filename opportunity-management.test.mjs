import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { solutions } from './core.js';

test('oferece edição, remoção, cancelamento e anexo na oportunidade', async () => {
  const app = await readFile(new URL('./app.js', import.meta.url), 'utf8');
  const index = await readFile(new URL('./index.html', import.meta.url), 'utf8');
  const config = await readFile(new URL('./supabase-config.js', import.meta.url), 'utf8');

  assert.ok(solutions.includes('Unidades móveis'));
  assert.match(app, /data-edit=/);
  assert.match(app, /data-delete=/);
  assert.match(app, /app\.addEventListener\('click'/);
  assert.doesNotMatch(app, /save\(data\);\n  return data;/);
  assert.match(app, /Não foi possível abrir a edição/);
  // O que importa e que o script seja versionado -- o GitHub Pages serve
  // app.js com cache agressivo e sem isso a correcao nao chega em quem ja
  // abriu o site. Prender o teste a UMA versao fazia toda troca legitima de
  // cache-buster quebrar a suite.
  assert.match(index, /app\.js\?v=\d{8}-\d+/);
  assert.match(index, /supabase-config\.js/);
  assert.match(app, /from '\.\/supabase-config\.js'/);
  assert.match(app, /\/rest\/v1/);
  assert.doesNotMatch(app, /localStorage/);
  assert.match(config, /SUPABASE_URL/);
  assert.match(app, /data-close-form/);
  assert.match(app, /type="file" name="attachment"/);
  assert.match(app, /formatCurrencyInput/);
});

test('oferece formulário para cadastrar projetos diretamente na implantação', async () => {
  const app = await readFile(new URL('./app.js', import.meta.url), 'utf8');

  assert.match(app, /data-open-implementation-form/);
  assert.match(app, /function implementationModal\(/);
  assert.match(app, /id="implementation-form"/);
  assert.match(app, /name="nextMilestone" required/);
  assert.match(app, /function saveImplementation\(event, data, editingId\)/);
});

test('permite editar um projeto de implantação sem perder o vínculo de origem', async () => {
  const app = await readFile(new URL('./app.js', import.meta.url), 'utf8');

  assert.match(app, /data-edit-implementation=/);
  assert.match(app, /function implementationModal\(item\)/);
  // O espalhamento de existing ANTES de raw e o que preserva id, stage e
  // sourceOpportunityId, que nao estao no formulario. Invertido, editar a
  // descricao de um projeto derivado apagaria o vinculo com a oportunidade.
  assert.match(app, /\{ \.\.\.existing, \.\.\.raw \}/);
  // A solucao gravada tem que sobreviver mesmo se sair da lista atual.
  assert.match(app, /function solutionOptions\(atual, includeCustom/);
  assert.doesNotMatch(app, /solutions\.map\(\(x\) => `<option/);
});

test('oferece campo obrigatório para nome quando a solução é avulsa', async () => {
  const app = await readFile(new URL('./app.js', import.meta.url), 'utf8');

  assert.match(app, /name="customSolution"/);
  assert.match(app, /function toggleCustomSolutionField\(form\)/);
  assert.match(app, /normalizeOpportunitySolution\(raw\)/);
});

test('oferece uma janela somente de leitura para detalhes da oportunidade', async () => {
  const app = await readFile(new URL('./app.js', import.meta.url), 'utf8');

  assert.match(app, /data-view=/);
  assert.match(app, /function opportunityDetailsModal\(item\)/);
  assert.match(app, /data-view-detail/);
  assert.match(app, /target\.dataset\.view/);
});

test('abre os detalhes na camada modal da tela', async () => {
  const app = await readFile(new URL('./app.js', import.meta.url), 'utf8');

  assert.match(app, /function openOpportunityDetails\(data, id\)[\s\S]*\.showModal\(\)/);
  assert.match(app, /function opportunityDetailsModal\(item\)[\s\S]*<dialog class="opportunity-dialog">/);
});
