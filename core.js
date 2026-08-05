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

export function eligibleOpportunities(opportunities, implementations) {
  return opportunities.filter((item) => canCreateImplementation(item, implementations));
}

export function implementationFromOpportunity(opportunity, id) {
  return {
    id,
    sourceOpportunityId: opportunity.id,
    municipality: opportunity.municipality,
    state: opportunity.state,
    solution: opportunity.solution,
    owner: opportunity.owner,
    stage: 'kickoff',
    nextMilestone: 'Realizar reunião de kick-off',
    risks: '',
    dependencies: '',
  };
}

// Projeto que ja estava contratado antes de existir registro no comercial --
// contrato antigo, adesao a ata, projeto herdado. A tela pede confirmacao de
// que existe contrato assinado; o piloto nao tem como verificar isso sozinho.
//
// sourceOpportunityId nasce null DE PROPOSITO. canCreateImplementation
// pergunta se alguma implantacao aponta para o id da oportunidade, e null nao
// casa com id nenhum -- entao projeto avulso nunca bloqueia a conversao de uma
// oportunidade legitima do funil. Trocar esse null por '' ou pelo id de
// alguma oportunidade quebraria a regra central em silencio.
export function directImplementation(input, id) {
  return {
    id,
    sourceOpportunityId: null,
    municipality: input.municipality,
    state: input.state,
    solution: input.solution,
    owner: input.owner,
    stage: input.stage || 'kickoff',
    nextMilestone: input.nextMilestone || 'Definir próximo marco',
    risks: input.risks || '',
    dependencies: input.dependencies || '',
  };
}
