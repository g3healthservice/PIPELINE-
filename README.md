# G3 Projetos — piloto

Aplicação web estática para validar o fluxo entre Comercial e Gestão da Implantação.

## Rodar localmente

Abra `index.html` em um navegador moderno. Os dados de demonstração ficam no armazenamento do navegador e podem ser modificados sem afetar outros usuários.

## Base compartilhada online

O arquivo `supabase/schema.sql` cria a estrutura da base no Supabase. Para transformar este piloto em uma aplicação colaborativa, crie um projeto Supabase, execute esse SQL e forneça a URL do projeto e a chave pública. A versão atual não conecta automaticamente porque essas credenciais não foram fornecidas.

Como o piloto não tem login, não habilite acesso público de escrita numa base com dados sensíveis. Não registre pacientes, prontuários, documentos judiciais individualizados ou outro dado pessoal sensível.

## Como um projeto de implantação nasce

Há dois caminhos, e a aba **Implantação** oferece os dois em `+ Nova implantação`:

1. **Derivar de contrato fechado** — o caminho normal. A lista só mostra oportunidades em *Contratado* que ainda não geraram projeto; o projeto nasce em Kick-off, herdando município, UF, solução e responsável. Feito isso, a oportunidade sai da lista, para não gerar projeto duplicado.
2. **Registrar projeto já contratado** — para contrato antigo, adesão a ata ou projeto herdado, que nunca passou pelo funil comercial. Exige preencher os dados à mão, escolher a fase em que o projeto já está e confirmar que existe contrato assinado. Nasce sem vínculo com oportunidade nenhuma (`sourceOpportunityId: null`), justamente para nunca bloquear a conversão de uma oportunidade legítima do funil.

## Verificação

`npm test` valida a regra central: só uma oportunidade contratada sem implantação derivada pode criar um projeto de implantação — e um projeto registrado direto não interfere nessa regra.

`npm run check` valida a sintaxe de `app.js` e `core.js`.
