import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('apresenta a identidade Brain27 e remove a marca anterior do painel', async () => {
  const app = await readFile(new URL('./app.js', import.meta.url), 'utf8');
  const css = await readFile(new URL('./style.css', import.meta.url), 'utf8');

  assert.match(app, /assets\/brain27-logo\.png/);
  assert.match(app, /Gestão de projetos/);
  assert.doesNotMatch(app, /G3 HEALTH SERVICE/);
  assert.doesNotMatch(app, /G3 Projetos/);
  assert.doesNotMatch(app, /Comercial e implantação, conectados sem se confundirem\./);
  assert.match(css, /\.brand-logo/);
});
