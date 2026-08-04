# G3 Projetos — piloto

Aplicação web estática para validar o fluxo entre Comercial e Gestão da Implantação.

## Rodar localmente

Abra `index.html` em um navegador moderno. Os dados de demonstração ficam no armazenamento do navegador e podem ser modificados sem afetar outros usuários.

## Base compartilhada online

O arquivo `supabase/schema.sql` cria a estrutura da base no Supabase. Para transformar este piloto em uma aplicação colaborativa, crie um projeto Supabase, execute esse SQL e forneça a URL do projeto e a chave pública. A versão atual não conecta automaticamente porque essas credenciais não foram fornecidas.

Como o piloto não tem login, não habilite acesso público de escrita numa base com dados sensíveis. Não registre pacientes, prontuários, documentos judiciais individualizados ou outro dado pessoal sensível.

## Verificação

`npm test` valida a regra central: só uma oportunidade contratada sem implantação derivada pode criar um projeto de implantação.
