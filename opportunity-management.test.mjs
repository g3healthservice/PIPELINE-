import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('oferece edição, remoção, cancelamento e anexo na oportunidade', async () => {
  const app = await readFile(new URL('./app.js', import.meta.url), 'utf8');

  assert.match(app, /Unidades móveis/);
  assert.match(app, /data-edit=/);
  assert.match(app, /data-delete=/);
  assert.match(app, /app\.addEventListener\('click'/);
  assert.match(app, /data-close-form/);
  assert.match(app, /type="file" name="attachment"/);
  assert.match(app, /formatCurrencyInput/);
});
