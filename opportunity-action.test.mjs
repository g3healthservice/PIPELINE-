import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('o botão principal Nova oportunidade abre diretamente o formulário', async () => {
  const app = await readFile(new URL('./app.js', import.meta.url), 'utf8');

  assert.match(app, /class="primary" data-open-form>Nova oportunidade<\/button>/);
  assert.doesNotMatch(app, /class="primary" data-page="commercial">Nova oportunidade<\/button>/);
});
