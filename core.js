export const commercialStages = [
  ['mapped', 'Mapeado'], ['qualified', 'Qualificado'], ['diagnosis', 'Diagnóstico'],
  ['proposal', 'Proposta'], ['negotiation', 'Negociação'], ['contracted', 'Contratado'],
];

export const implementationStages = [
  ['kickoff', 'Kick-off'], ['diagnosis', 'Diagnóstico'], ['configuration', 'Configuração'],
  ['training', 'Treinamento'], ['pilot', 'Piloto'], ['operation', 'Operação'], ['expansion', 'Expansão'],
];

export const solutions = [
  'Raio-X Captação SUS', 'Monitor de Judicialização', 'PWG — Esteira do Medicamento',
  'RosalindTest', 'Linda LifeTech', 'PinkPapa', 'Radar de Editais', 'Unidades móveis',
  'Dr ao vivo',
];

export function canCreateImplementation(opportunity, implementations) {
  return opportunity.stage === 'contracted' && !implementations.some(
    (item) => item.sourceOpportunityId === opportunity.id,
  );
}

export function createManualImplementation(input, id) {
  return {
    id,
    municipality: input.municipality,
    state: input.state,
    solution: input.solution,
    owner: input.owner,
    stage: 'kickoff',
    nextMilestone: input.nextMilestone,
    risks: input.risks || '',
    dependencies: input.dependencies || '',
  };
}

export function formatCurrencyInput(value) {
  const cents = Number(String(value).replace(/\D/g, '') || 0);
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency', currency: 'BRL', minimumFractionDigits: 2,
  }).format(cents / 100);
}

export function parseCurrencyInput(value) {
  const digits = String(value).replace(/\D/g, '');
  return Number(digits || 0) / 100;
}
