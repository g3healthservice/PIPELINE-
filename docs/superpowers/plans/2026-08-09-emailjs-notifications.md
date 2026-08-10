# EmailJS Notifications Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Notificar `g3.healthservice@gmail.com` por EmailJS após criar, editar ou mover uma oportunidade salva com sucesso.

**Architecture:** Um módulo puro monta os parâmetros do modelo `template_rzlj9wb` e chama a API pública do EmailJS com `service_65fdx1s`. `app.js` aguarda o Supabase e só dispara o e-mail para a oportunidade que o usuário alterou; falhas de e-mail não desfazem a alteração já persistida.

**Tech Stack:** JavaScript ES modules, Fetch API, EmailJS REST API, Supabase REST, `node:test`.

## Global Constraints

- Usar `service_65fdx1s`, `template_rzlj9wb` e Public Key `DWHN0tLW2X0KGJg6w`.
- A Public Key pode ser publicada; não incluir senha Gmail ou chave privada.
- Configurar a allowlist EmailJS para `https://g3healthservice.github.io` antes da publicação.
- Enviar após persistência bem-sucedida; uma falha de e-mail não impede o usuário de salvar.
- Passar todos os campos do modelo e o primeiro anexo em `anexo_0` quando existir.
- Limitar solicitações EmailJS a uma por 10 segundos no navegador.

---

## Estrutura de arquivos

- Criar `emailjs-notification.js`: constrói parâmetros do template e faz a chamada ao EmailJS.
- Criar `emailjs-notification.test.mjs`: valida eventos, campos e primeiro anexo.
- Modificar `app.js`: aguarda `save`, identifica criação/edição/movimentação e chama o módulo.
- Modificar `opportunity-management.test.mjs`: protege a integração na interface.
- Modificar `README.md`: configuração da allowlist e anexo dinâmico `anexo_0`.
- Modificar `index.html`: incrementa o cache-buster após publicar.

### Task 1: Criar o cliente EmailJS testável

**Files:**
- Create: `emailjs-notification.js`
- Create: `emailjs-notification.test.mjs`

**Interfaces:**
- Produces: `emailjsParams(type, item)` e `sendOpportunityEmail(type, item, fetcher = fetch)`.

- [ ] **Step 1: Write the failing test**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { emailjsParams } from './emailjs-notification.js';

test('monta os parâmetros personalizados e o primeiro anexo do EmailJS', () => {
  const params = emailjsParams('created', { id: 'opp-1', municipality: 'BSB', state: 'DF', solution: 'PWG', owner: 'Comercial', stage: 'mapped', value: 10, nextAction: 'Agendar', due: '2026-08-10', notes: '', attachments: [{ name: 'proposta.pdf', data: 'data:application/pdf;base64,QUJD' }] });
  assert.equal(params.tipo_notificacao, 'Nova oportunidade');
  assert.equal(params.municipio, 'BSB');
  assert.equal(params.anexo_0, 'data:application/pdf;base64,QUJD');
  assert.equal(params.anexo_0_nome, 'proposta.pdf');
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test emailjs-notification.test.mjs`

Expected: FAIL because the module does not exist.

- [ ] **Step 3: Write the minimal implementation**

```js
export const emailjsConfig = { serviceId: 'service_65fdx1s', templateId: 'template_rzlj9wb', publicKey: 'DWHN0tLW2X0KGJg6w' };

export function emailjsParams(type, item) {
  const firstAttachment = item.attachments?.[0];
  return {
    tipo_notificacao: type === 'created' ? 'Nova oportunidade' : 'Oportunidade atualizada',
    municipio: item.municipality, uf: item.state, solucao: item.solution,
    responsavel: item.owner, etapa: item.stage, valor: money(item.value),
    proximo_passo: item.nextAction, data_proximo_passo: item.due,
    observacoes: item.notes || 'Não informado',
    anexos: item.attachments?.map((file) => file.name).join(', ') || 'Sem anexos',
    ...(firstAttachment ? { anexo_0: firstAttachment.data, anexo_0_nome: firstAttachment.name } : {}),
  };
}
```

- [ ] **Step 4: Add transport behavior and verify it**

Add `sendOpportunityEmail` with `POST https://api.emailjs.com/api/v1.0/email/send`, JSON body containing `service_id`, `template_id`, `user_id` and `template_params`. Add tests for update subject, no attachment, request body and a rejected response. Run: `node --test emailjs-notification.test.mjs`.

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add emailjs-notification.js emailjs-notification.test.mjs
git commit -m "feat: add EmailJS notification client"
```

### Task 2: Disparar somente após o Supabase confirmar o salvamento

**Files:**
- Modify: `app.js`
- Modify: `opportunity-management.test.mjs`

**Interfaces:**
- Consumes: `sendOpportunityEmail(type, item)` da Task 1.
- Produces: `save(data)` retorna `true` em sucesso e `false` em falha; `notifyAfterSave(type, item, saved)` chama EmailJS apenas quando `saved` é `true`.

- [ ] **Step 1: Write the failing test**

```js
test('notifica EmailJS somente após salvar a oportunidade', async () => {
  const app = await readFile(new URL('./app.js', import.meta.url), 'utf8');
  assert.match(app, /import \{ sendOpportunityEmail \} from '\.\/emailjs-notification\.js'/);
  assert.match(app, /async function notifyAfterSave\(type, item, saved\)/);
  assert.match(app, /if \(!saved\) return/);
  assert.match(app, /const saved = await save\(data\)/);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test opportunity-management.test.mjs`

Expected: FAIL because `app.js` has no EmailJS integration.

- [ ] **Step 3: Write the minimal implementation**

```js
async function notifyAfterSave(type, item, saved) {
  if (!saved) return;
  try { await sendOpportunityEmail(type, item); }
  catch (error) { console.error('Não foi possível enviar a notificação por e-mail.', error); }
}

async function saveOpportunity(event, data, editingId) {
  // monta item, atualiza data.opportunities
  const saved = await save(data);
  await notifyAfterSave(editingId ? 'updated' : 'created', item, saved);
  if (!saved) return;
  closeForm(); page = 'commercial'; render();
}
```

- [ ] **Step 4: Handle stage movement and verify all behavior**

Make the `[data-move]` listener async. Keep `const item = list.find(...)`, assign `item.stage`, await `save(data)`, then call `notifyAfterSave('updated', item, saved)` only for `data-move === 'commercial'`. Make `save` return `true` after the four Supabase operations and return `false` in its catch. Run: `npm test && npm run check`.

Expected: existing tests and the new integration test pass.

- [ ] **Step 5: Commit**

```bash
git add app.js opportunity-management.test.mjs
git commit -m "feat: notify EmailJS after opportunity changes"
```

### Task 3: Documentar a configuração EmailJS e publicar sem cache antigo

**Files:**
- Modify: `README.md`
- Modify: `index.html`
- Modify: `emailjs-notification.test.mjs`

**Interfaces:**
- Consumes: modelo `template_rzlj9wb` já criado no painel EmailJS.
- Produces: instruções para allowlist e `anexo_0`; nova versão de `app.js` carregada pelo Pages.

- [ ] **Step 1: Write the failing test**

```js
test('documenta a allowlist e o anexo dinâmico do EmailJS', async () => {
  const readme = await readFile(new URL('./README.md', import.meta.url), 'utf8');
  const index = await readFile(new URL('./index.html', import.meta.url), 'utf8');
  assert.match(readme, /https:\/\/g3healthservice\.github\.io/);
  assert.match(readme, /anexo_0/);
  assert.match(index, /app\.js\?v=\d{8}-\d+/);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test emailjs-notification.test.mjs`

Expected: FAIL because the README still describes Resend.

- [ ] **Step 3: Write the documentation and cache update**

Replace the Email notification section of `README.md` with EmailJS instructions: add the Pages domain to EmailJS Domains allowlist; in the template **Anexos** tab add a **Variable Attachment** named `anexo_0`, use `{{anexo_0_nome}}` as its filename, and save. Bump `index.html` from `app.js?v=20260809-5` to `app.js?v=20260809-6`.

- [ ] **Step 4: Run the complete verification**

Run: `npm test && npm run check && git diff --check`.

Expected: every test passes and no whitespace errors are reported.

- [ ] **Step 5: Commit**

```bash
git add README.md index.html emailjs-notification.test.mjs
git commit -m "docs: configure EmailJS notifications"
```

## Self-review

- Task 1 covers EmailJS payloads, fields and anexo_0; Task 2 covers post-save behavior and errors; Task 3 covers domain protection, dashboard configuration and cache invalidation.
- The names `emailjsParams`, `sendOpportunityEmail` and `notifyAfterSave` are consistent across all tasks.
- The EmailJS template must have the Variable Attachment `anexo_0` before the first attachment can be delivered as a file.
