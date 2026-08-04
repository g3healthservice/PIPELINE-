import test from 'node:test';
import assert from 'node:assert/strict';
import { canCreateImplementation } from './core.js';

test('permite criar implantação apenas para oportunidade contratada sem projeto derivado', () => {
  const opportunity = { id: 'opp-1', stage: 'contracted' };
  assert.equal(canCreateImplementation(opportunity, []), true);
  assert.equal(canCreateImplementation({ ...opportunity, stage: 'proposal' }, []), false);
  assert.equal(
    canCreateImplementation(opportunity, [{ sourceOpportunityId: 'opp-1' }]),
    false,
  );
});
