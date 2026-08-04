# Base compartilhada do piloto

O painel Brain27 deixará de usar `localStorage` como fonte de verdade. O navegador carregará e gravará oportunidades e implantações no projeto Supabase `brain27-pipeline` por meio da chave pública do projeto.

## Dados e acesso

- Tabelas públicas: `opportunities` e `implementations`, com campos compatíveis com o piloto atual.
- O piloto não terá login. Políticas RLS permitirão leitura e escrita públicas nas duas tabelas.
- A chave pública poderá estar no site estático; a chave `service_role` e a senha do banco nunca serão usadas no código.
- Arquivos anexos continuam fora deste primeiro corte; a interface informa que o anexo será incluído quando o Storage estiver configurado.

## Comportamento

- Ao abrir ou alterar o pipeline, o app consulta o Supabase e renderiza o resultado online.
- Criar, editar, remover, mover etapa e criar implantação escrevem na base e só atualizam a tela após resposta bem-sucedida.
- Falhas de conexão aparecem em mensagem visível. Dados de demonstração locais não são migrados automaticamente.

## Segurança e escopo

Este é um piloto público autorizado pelo responsável. Não podem ser cadastrados dados de pacientes, prontuários ou documentos judiciais individualizados. A próxima fase deve adicionar autenticação e regras por usuário.
