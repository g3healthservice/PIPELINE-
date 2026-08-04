import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('oferece edição, remoção, cancelamento e anexo na oportunidade', async () => {
  const app = await readFile(new URL('./app.js', import.meta.url), 'utf8');
  const index = await readFile(new URL('./index.html', import.meta.url), 'utf8');
  const config = await readFile(new URL('./supabase-config.js', import.meta.url), 'utf8');

  assert.match(app, /Unidades móveis/);
  assert.match(app, /data-edit=/);
  assert.match(app, /data-delete=/);
  assert.match(app, /app\.addEventListener\('click'/);
  assert.doesNotMatch(app, /save\(data\);\n  return data;/);
  assert.match(app, /Não foi possível abrir a edição/);
  assert.match(index, /app\.js\?v=/);
  assert.match(index, /supabase-config\.js/);
  assert.match(app, /from '\.\/supabase-config\.js'/);
  assert.match(app, /\/rest\/v1/);
  assert.doesNotMatch(app, /localStorage/);
  assert.match(config, /SUPABASE_URL/);
  assert.match(app, /data-close-form/);
  assert.match(app, /type="file" name="attachment"/);
  assert.match(app, /formatCurrencyInput/);
});
