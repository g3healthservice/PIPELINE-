import test from 'node:test';
import assert from 'node:assert/strict';
import { canCreateImplementation, createManualImplementation, customSolutionLabel, formatCurrencyInput, normalizeOpportunitySolution, parseCurrencyInput, solutions } from './core.js';

test('permite criar implantação apenas para oportunidade contratada sem projeto derivado', () => {
  const opportunity = { id: 'opp-1', stage: 'contracted' };
  assert.equal(canCreateImplementation(opportunity, []), true);
  assert.equal(canCreateImplementation({ ...opportunity, stage: 'proposal' }, []), false);
  assert.equal(
    canCreateImplementation(opportunity, [{ sourceOpportunityId: 'opp-1' }]),
    false,
  );
});

test('formata e converte valores monetários brasileiros', () => {
  assert.equal(formatCurrencyInput('175000'), 'R$ 1.750,00');
  assert.equal(parseCurrencyInput('R$ 1.750,00'), 1750);
});

test('cria um projeto manual de implantação em kick-off sem oportunidade de origem', () => {
  const project = createManualImplementation({
    municipality: 'BSB', state: 'DF', solution: 'Dr ao vivo', owner: 'Comercial',
    nextMilestone: 'Realizar kick-off', risks: 'Agenda', dependencies: 'Contrato',
  }, 'impl-1');

  assert.deepEqual(project, {
    id: 'impl-1', sourceOpportunityId: null,
    municipality: 'BSB', state: 'DF', solution: 'Dr ao vivo', owner: 'Comercial',
    stage: 'kickoff', nextMilestone: 'Realizar kick-off', risks: 'Agenda', dependencies: 'Contrato',
  });
  // A chave PRECISA existir valendo null. Omiti-la fazia JSON.stringify nao
  // enviar a coluna, e o insert no Supabase era recusado -- o projeto aparecia
  // na tela e sumia no primeiro salvamento.
  assert.equal('sourceOpportunityId' in project, true);
  assert.equal(project.sourceOpportunityId, null);
  assert.ok(solutions.includes('Dr ao vivo'));
});

test('salva o nome digitado quando a oportunidade usa solução avulsa', () => {
  assert.equal(
    normalizeOpportunitySolution({ solution: customSolutionLabel, customSolution: '  Serviço especial  ' }),
    'Serviço especial',
  );
  assert.equal(normalizeOpportunitySolution({ solution: 'Dr ao vivo', customSolution: '' }), 'Dr ao vivo');
});

test('projeto manual não impede uma oportunidade contratada de virar projeto', () => {
  const manual = createManualImplementation({
    municipality: 'BSB', state: 'DF', solution: 'Dr ao vivo', owner: 'Comercial',
    nextMilestone: 'Realizar kick-off',
  }, 'impl-manual');
  const opportunity = { id: 'opp-1', stage: 'contracted' };

  // Esta e a regra central do piloto vista pelo outro lado: um projeto sem
  // origem nao pode "consumir" a oportunidade de ninguem.
  assert.equal(canCreateImplementation(opportunity, [manual]), true);
  assert.equal(canCreateImplementation(opportunity, [manual, { sourceOpportunityId: 'opp-1' }]), false);
});
