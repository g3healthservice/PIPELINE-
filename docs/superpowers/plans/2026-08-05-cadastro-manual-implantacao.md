# Cadastro manual de projetos de implantação Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir cadastrar projetos diretamente na aba Implantação e disponibilizar a solução Dr ao vivo.

**Architecture:** Manter `app.js` como a camada de apresentação e persistência. Extrair para `core.js` a lista compartilhada de soluções e uma fábrica de projetos manuais; o formulário de implantação a consome para criar um registro no formato existente em `implementations`, com etapa `kickoff` e sem vínculo com oportunidade.

**Tech Stack:** JavaScript ES modules, DOM nativo, Supabase REST, Node.js built-in test runner.

## Global Constraints

- Projetos criados manualmente devem iniciar em `kickoff`.
- Município, UF, Solução, Responsável e Próximo marco são obrigatórios.
- Projetos manuais devem persistir em `implementations` com `source_opportunity_id` nulo.
- A opção de solução deve ter exatamente o texto `Dr ao vivo`.

---

### Task 1: Modelo testável de projeto manual e catálogo de soluções

**Files:**
- Modify: `core.test.mjs`
- Modify: `core.js`
- Modify: `app.js`

**Interfaces:**
- Consumes: os valores preenchidos no formulário e `uid(prefix)` de `app.js`.
- Produces: `solutions` e `createManualImplementation(input, id)` em `core.js`.

- [ ] **Step 1: Write the failing test**

```js
test('cria um projeto manual de implantação em kick-off sem oportunidade de origem', () => {
  const project = createManualImplementation({
    municipality: 'BSB', state: 'DF', solution: 'Dr ao vivo', owner: 'Comercial',
    nextMilestone: 'Realizar kick-off', risks: 'Agenda', dependencies: 'Contrato',
  }, 'impl-1');

  assert.deepEqual(project, {
    id: 'impl-1', municipality: 'BSB', state: 'DF', solution: 'Dr ao vivo', owner: 'Comercial',
    stage: 'kickoff', nextMilestone: 'Realizar kick-off', risks: 'Agenda', dependencies: 'Contrato',
  });
  assert.equal('sourceOpportunityId' in project, false);
  assert.ok(solutions.includes('Dr ao vivo'));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test core.test.mjs`

Expected: FAIL because `createManualImplementation` and exported `solutions` do not exist.

- [ ] **Step 3: Write minimal implementation**

```js
export const solutions = [/* existing solutions */, 'Dr ao vivo'];

export function createManualImplementation(input, id) {
  return {
    id, municipality: input.municipality, state: input.state, solution: input.solution,
    owner: input.owner, stage: 'kickoff', nextMilestone: input.nextMilestone,
    risks: input.risks || '', dependencies: input.dependencies || '',
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test core.test.mjs`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add core.js core.test.mjs
git commit -m "feat: add manual implementation project factory"
```

### Task 2: Criar, persistir e exibir o projeto manual

**Files:**
- Modify: `app.js`
- Modify: `app.js`

**Interfaces:**
- Consumes: `uid(prefix)`, `save(data)`, `implementationStages`, `solutions`, `createManualImplementation` e `data.implementations`.
- Produces: `saveImplementation(event, data)`, chamado pelo formulário `#implementation-form`.

- [ ] **Step 1: Write minimal implementation**

```js
function saveImplementation(event, data) {
  event.preventDefault();
  const raw = Object.fromEntries(new FormData(event.currentTarget));
  data.implementations.push(createManualImplementation(raw, uid('impl')));
  save(data); closeForm(); render();
}
```

Bind the new open-button click to `implementationModal()` and bind `#implementation-form` submit to `saveImplementation(event, data)`.

- [ ] **Step 2: Run complete verification**

Run: `npm test && npm run check`

Expected: all test files pass and both JavaScript syntax checks exit with status 0.

- [ ] **Step 3: Commit**

```bash
git add app.js
git commit -m "feat: save manual implementation projects"
```
