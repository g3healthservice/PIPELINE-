import test from 'node:test';
import assert from 'node:assert/strict';
import {
  canCreateImplementation,
  eligibleOpportunities,
  implementationFromOpportunity,
  directImplementation,
} from './core.js';

test('permite criar implantação apenas para oportunidade contratada sem projeto derivado', () => {
  const opportunity = { id: 'opp-1', stage: 'contracted' };
  assert.equal(canCreateImplementation(opportunity, []), true);
  assert.equal(canCreateImplementation({ ...opportunity, stage: 'proposal' }, []), false);
  assert.equal(
    canCreateImplementation(opportunity, [{ sourceOpportunityId: 'opp-1' }]),
    false,
  );
});

test('a lista do formulário só oferece oportunidade que pode virar projeto', () => {
  const opportunities = [
    { id: 'opp-1', stage: 'contracted' },
    { id: 'opp-2', stage: 'proposal' },
    { id: 'opp-3', stage: 'contracted' },
  ];
  const implementations = [{ sourceOpportunityId: 'opp-3' }];
  assert.deepEqual(
    eligibleOpportunities(opportunities, implementations).map((x) => x.id),
    ['opp-1'],
  );
  assert.deepEqual(eligibleOpportunities([], []), []);
});

test('derivar de contrato herda os dados e fecha a porta para um segundo projeto', () => {
  const opportunity = {
    id: 'opp-1', stage: 'contracted', municipality: 'Sobral', state: 'CE',
    solution: 'PWG — Esteira do Medicamento', owner: 'Gerson', value: 180000,
  };
  const projeto = implementationFromOpportunity(opportunity, 'impl-1');
  assert.equal(projeto.sourceOpportunityId, 'opp-1');
  assert.equal(projeto.municipality, 'Sobral');
  assert.equal(projeto.state, 'CE');
  assert.equal(projeto.solution, 'PWG — Esteira do Medicamento');
  assert.equal(projeto.owner, 'Gerson');
  assert.equal(projeto.stage, 'kickoff');
  // valor e do comercial: nao atravessa para a implantacao
  assert.equal(projeto.value, undefined);
  // e a oportunidade sai da lista de elegiveis
  assert.equal(canCreateImplementation(opportunity, [projeto]), false);
  assert.deepEqual(eligibleOpportunities([opportunity], [projeto]), []);
});

test('projeto registrado direto nasce sem vínculo e não bloqueia nenhuma oportunidade', () => {
  const avulso = directImplementation(
    { municipality: 'Aurora', state: 'CE', solution: 'Brain27', owner: 'Implantação', stage: 'pilot', nextMilestone: 'Fechar relatório do piloto' },
    'impl-avulso',
  );
  assert.equal(avulso.sourceOpportunityId, null);
  assert.equal(avulso.stage, 'pilot');
  assert.equal(avulso.nextMilestone, 'Fechar relatório do piloto');

  // A regra central: um projeto avulso NUNCA pode fazer uma oportunidade
  // contratada perder o direito de virar projeto. E o que quebraria se
  // sourceOpportunityId nascesse '' ou undefined em vez de null.
  const opportunity = { id: 'opp-1', stage: 'contracted' };
  assert.equal(canCreateImplementation(opportunity, [avulso]), true);
  assert.deepEqual(eligibleOpportunities([opportunity], [avulso]).map((x) => x.id), ['opp-1']);
});

test('projeto direto sem fase nem marco recebe padrão utilizável', () => {
  const avulso = directImplementation(
    { municipality: 'Serra Azul', state: 'MG', solution: 'Brain27', owner: 'Implantação' },
    'impl-2',
  );
  assert.equal(avulso.stage, 'kickoff');
  assert.equal(avulso.nextMilestone, 'Definir próximo marco');
  assert.equal(avulso.risks, '');
  assert.equal(avulso.dependencies, '');
});
