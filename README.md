# G3 Projetos — piloto

Aplicação web estática para validar o fluxo entre Comercial e Gestão da Implantação.

## Rodar localmente

Abra `index.html` em um navegador moderno.

**Atenção:** os dados **não** ficam mais no navegador. Desde a conexão com o Supabase, tudo que você digita aqui vai para a base compartilhada — inclusive rodando localmente. Não existe modo de demonstração isolado: editar local altera o que os outros veem.

## Base compartilhada online

`supabase/schema.sql` descreve a estrutura da base. As credenciais ficam em `supabase-config.js`.

Como o piloto **não tem login**, a política de acesso libera leitura e escrita para qualquer visitante do site. Quem tiver o endereço pode criar, alterar e apagar registros. Isso é aceitável para um piloto administrativo e **não** é aceitável para dado pessoal: não registre pacientes, prontuários, documentos judiciais individualizados ou qualquer dado sensível.

### Migração pendente na base que está no ar

A base foi criada com `source_opportunity_id NOT NULL`, o que faz o banco **recusar** todo projeto cadastrado pelo botão `+ Novo projeto` (um projeto manual não tem oportunidade de origem). Rode uma vez, no SQL Editor do Supabase:

```sql
alter table public.implementations alter column source_opportunity_id drop not null;
```

Enquanto isso não for feito, o projeto manual aparece na tela e não é gravado.

## Como um projeto de implantação nasce

1. **Derivado** — botão `Criar implantação` no card do Comercial. Só aparece para oportunidade em *Contratado* que ainda não gerou projeto, e a oportunidade fica registrada em `sourceOpportunityId`.
2. **Manual** — botão `+ Novo projeto` na aba Implantação, para contrato antigo, adesão a ata ou projeto herdado. Nasce com `sourceOpportunityId: null`, o que garante que ele nunca bloqueie a conversão de uma oportunidade legítima do funil.

## Verificação

`npm test` valida a regra central — só uma oportunidade contratada sem implantação derivada pode criar um projeto — e que o projeto manual não interfere nela.

`npm run check` valida a sintaxe de `app.js` e `core.js`.
