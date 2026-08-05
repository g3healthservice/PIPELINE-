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

// sourceOpportunityId: null e EXPLICITO, nao decorativo. Duas coisas dependem
// dele, e as duas quebram em silencio se a chave voltar a ser omitida:
//
// 1. O banco. A coluna source_opportunity_id existe na tabela; sem a chave no
//    objeto, JSON.stringify simplesmente nao a envia, e o insert falha (ou
//    depende do default da coluna). Com null, o que a tela mostra e o que o
//    banco grava.
// 2. A regra central. canCreateImplementation pergunta se alguma implantacao
//    aponta para o id da oportunidade. null nunca casa com id nenhum, entao um
//    projeto manual jamais impede uma oportunidade contratada de virar
//    projeto. Trocar por '' teria o mesmo efeito hoje e continuaria frágil --
//    null diz "nao ha origem", '' diz "a origem e a string vazia".
export function createManualImplementation(input, id) {
  return {
    id,
    sourceOpportunityId: null,
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
