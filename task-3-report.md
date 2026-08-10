# Task 3 — relatório

## Entregue

- README migrado de Resend para EmailJS, com allowlist do domínio Pages e configuração do anexo variável `anexo_0`.
- Cache-buster de `app.js` atualizado para `20260809-6`.
- Teste de documentação e cache-buster adicionado a `emailjs-notification.test.mjs`.

## Verificação

- `node --test emailjs-notification.test.mjs`: passou (5 testes).
- `npm run check`: passou.
- `git diff --check`: passou.
- `npm test`: falha em `email-notification.test.mjs`, teste legado que ainda exige a instrução Resend `supabase functions deploy notify-opportunity` no README. Essa exigência conflita com a migração para EmailJS definida nesta tarefa.

## Correção — rodada 1

- Removidos os testes de integração, secrets e documentação específicos do fluxo Resend; mantidos os testes puros de montagem de e-mail e validação de tamanho de anexo.
- `npm run check` passou a verificar `emailjs-notification.js`.
- O teste de cache agora exige exatamente `app.js?v=20260809-6`.
- Verificação: `npm test` (24 testes), `npm run check` e `git diff --check` passaram.
