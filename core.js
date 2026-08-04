export const commercialStages = [
  ['mapped', 'Mapeado'], ['qualified', 'Qualificado'], ['diagnosis', 'Diagnóstico'],
  ['proposal', 'Proposta'], ['negotiation', 'Negociação'], ['contracted', 'Contratado'],
];

export const implementationStages = [
  ['kickoff', 'Kick-off'], ['diagnosis', 'Diagnóstico'], ['configuration', 'Configuração'],
  ['training', 'Treinamento'], ['pilot', 'Piloto'], ['operation', 'Operação'], ['expansion', 'Expansão'],
];

export function canCreateImplementation(opportunity, implementations) {
  return opportunity.stage === 'contracted' && !implementations.some(
    (item) => item.sourceOpportunityId === opportunity.id,
  );
}
