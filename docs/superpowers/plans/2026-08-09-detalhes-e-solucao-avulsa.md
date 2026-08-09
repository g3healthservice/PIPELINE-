# Detalhes da oportunidade e solução avulsa Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir consultar oportunidades comerciais sem edição e registrar uma solução digitada livremente.

**Architecture:** `core.js` definirá o rótulo especial e normalizará a solução salva, mantendo o catálogo compartilhado. `app.js` renderizará uma janela de detalhes para os cards comerciais e alternará o campo de texto avulso dentro do formulário de oportunidade.

**Tech Stack:** JavaScript ES modules, DOM nativo, Supabase REST, Node.js built-in test runner.

## Global Constraints

- A janela de detalhes é somente leitura e não altera dados.
- Editar, Remover, movimentação de etapa e links de anexo preservam seus comportamentos existentes.
- O rótulo especial é exatamente `Outro / avulso`.
- Uma solução avulsa deve ser salva como seu nome digitado, nunca como `Outro / avulso`.

---

### Task 1: Normalizar a solução avulsa

**Files:**
- Modify: `core.js`
- Modify: `core.test.mjs`

**Interfaces:**
- Consumes: `solution` e `customSolution` recebidos de `FormData`.
- Produces: `customSolutionLabel` e `normalizeOpportunitySolution(input)`, que retorna a solução predefinida ou o nome avulso limpo.

- [ ] **Step 1: Write the failing test**

```js
test('salva o nome digitado quando a oportunidade usa solução avulsa', () => {
  assert.equal(normalizeOpportunitySolution({ solution: customSolutionLabel, customSolution: '  Serviço especial  ' }), 'Serviço especial');
  assert.equal(normalizeOpportunitySolution({ solution: 'Dr ao vivo', customSolution: '' }), 'Dr ao vivo');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test core.test.mjs`

Expected: FAIL because `customSolutionLabel` and `normalizeOpportunitySolution` do not exist.

- [ ] **Step 3: Write minimal implementation**

```js
export const customSolutionLabel = 'Outro / avulso';

export function normalizeOpportunitySolution(input) {
  return input.solution === customSolutionLabel ? input.customSolution.trim() : input.solution;
}
```

Do not add `customSolutionLabel` to the shared `solutions` catalog: it is exclusive to the Commercial form. The Commercial form appends it while rendering its select options.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test core.test.mjs`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add core.js core.test.mjs
git commit -m "feat: support custom opportunity solutions"
```

### Task 2: Formulário com solução avulsa

**Files:**
- Modify: `app.js`
- Modify: `opportunity-management.test.mjs`

**Interfaces:**
- Consumes: `customSolutionLabel`, `normalizeOpportunitySolution(input)` e `solutions` de `core.js`.
- Produces: `toggleCustomSolutionField(form)` e um formulário de oportunidade que exibe e exige `customSolution` somente para `Outro / avulso`.

- [ ] **Step 1: Write the failing test**

```js
test('oferece campo obrigatório para nome quando a solução é avulsa', async () => {
  const app = await readFile(new URL('./app.js', import.meta.url), 'utf8');

  assert.match(app, /name="customSolution"/);
  assert.match(app, /function toggleCustomSolutionField\(form\)/);
  assert.match(app, /normalizeOpportunitySolution\(raw\)/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test opportunity-management.test.mjs`

Expected: FAIL because the extra solution field, toggle, and normalization call do not exist.

- [ ] **Step 3: Write minimal implementation**

```js
function toggleCustomSolutionField(form) {
  const isCustom = form.elements.solution.value === customSolutionLabel;
  form.elements.customSolution.closest('label').hidden = !isCustom;
  form.elements.customSolution.required = isCustom;
}

const item = {
  ...existing, ...raw,
  solution: normalizeOpportunitySolution(raw),
  // existing fields remain unchanged
};
```

Render `<input name="customSolution" />` beneath Solução, prefilled whenever an existing `item.solution` is not in the predefined catalog. Bind the solution `change` event to `toggleCustomSolutionField(form)` and call it once when opening the modal.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test opportunity-management.test.mjs`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app.js opportunity-management.test.mjs
git commit -m "feat: add custom opportunity solution input"
```

### Task 3: Janela de detalhes da oportunidade

**Files:**
- Modify: `app.js`
- Modify: `style.css`
- Modify: `opportunity-management.test.mjs`

**Interfaces:**
- Consumes: o objeto de oportunidade existente e `attachmentLinks(attachments)`.
- Produces: `opportunityDetailsModal(item)`, aberto por `data-view` no card comercial e fechado com `data-close-form`.

- [ ] **Step 1: Write the failing test**

```js
test('oferece uma janela somente de leitura para detalhes da oportunidade', async () => {
  const app = await readFile(new URL('./app.js', import.meta.url), 'utf8');

  assert.match(app, /data-view=/);
  assert.match(app, /function opportunityDetailsModal\(item\)/);
  assert.match(app, /data-view-detail/);
  assert.match(app, /target\.dataset\.view/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test opportunity-management.test.mjs`

Expected: FAIL because cards do not expose `data-view` and no details modal exists.

- [ ] **Step 3: Write minimal implementation**

```js
function opportunityDetailsModal(item) {
  return `<dialog open class="opportunity-dialog"><section class="details-dialog">...${escapeHtml(item.notes || 'Sem observações.')}...</section></dialog>`;
}

function openOpportunityDetails(data, id) {
  const item = data.opportunities.find((opportunity) => opportunity.id === id);
  app.insertAdjacentHTML('beforeend', opportunityDetailsModal(item));
  app.querySelector('[data-close-form]').addEventListener('click', closeForm);
}
```

Place `data-view` on a dedicated, button-like card summary area. Keep the stage selector, Editar, Remover, Criar implantação and attachment links outside that interactive area. Bind `data-view` in the delegated click handler before `data-edit`.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test opportunity-management.test.mjs`

Expected: PASS.

- [ ] **Step 5: Run complete verification**

Run: `npm test && npm run check`

Expected: all test files pass and both JavaScript syntax checks exit with status 0.

- [ ] **Step 6: Commit**

```bash
git add app.js style.css opportunity-management.test.mjs
git commit -m "feat: add opportunity detail view"
```
