# Notificações por e-mail — guia de configuração

O G3 Projetos manda um e-mail automático a cada **nova oportunidade, mudança
de etapa, novo projeto de implantação** (e edições/remoções), com todos os
detalhes: nome (município/UF), assunto (solução), responsável, valor, status,
ação, prazo e anexos.

Como o site é estático (não tem servidor), o envio passa por um serviço
gratuito feito para isso — o **EmailJS** —, que guarda as credenciais do lado
dele. É preciso configurar **uma vez**. Tudo pela web, sem terminal.

## Passo a passo (uma vez, ~5 minutos)

1. **Crie uma conta** em https://www.emailjs.com (o plano gratuito envia 200
   e-mails/mês — mais que suficiente para o piloto).

2. **Conecte o Gmail** de envio:
   *Email Services → Add New Service → Gmail → Connect Account*.
   Autorize com `g3.healthservice@gmail.com` (ou outra conta de envio).
   Anote o **Service ID** (algo como `service_ab12cde`).

3. **Crie o modelo (template):**
   *Email Templates → Create New Template*. No corpo do e-mail, use exatamente
   estas variáveis (o app preenche todas):

   - **To email:** `{{to_email}}`
   - **Subject:** `{{subject}}`
   - **Content (corpo):** deixe só isto:
     ```
     {{message}}
     ```

   Salve. Anote o **Template ID** (algo como `template_xy34fgh`).

4. **Pegue a chave pública:**
   *Account → General → Public Key*. Copie (algo como `aB3xY7...`).

5. **Autorize o site** (importante, senão o EmailJS recusa):
   *Account → Security → Allowed Origins* → adicione
   `https://g3healthservice.github.io`.

6. **No app**, clique no **🔔** (canto superior direito), marque *Enviar
   notificações automaticamente*, cole os três valores (Service ID, Template
   ID, Chave pública), confirme o e-mail de destino e clique em
   **Enviar teste**. Se o teste chegar na caixa de entrada, clique em
   **Salvar**. Pronto.

## Detalhes que valem saber

- **A chave pública não é secreta.** Ela aparece no navegador de propósito; o
  EmailJS só aceita envios da origem que você autorizou no passo 5. Por isso
  pode ficar salva no app sem risco.

- **A configuração fica no navegador** onde você preencheu (localStorage). Se
  for usar em outro computador, repita o passo 6 lá — ou peça para embutir os
  IDs em `notify-config.js`, que passa a valer para todos.

- **Notificar nunca atrapalha o trabalho.** Se o e-mail falhar (internet caiu,
  cota estourou), o registro é salvo do mesmo jeito — o envio é
  "dispare e esqueça".

- **Quando dispara:** nova oportunidade, edição, mudança de etapa, remoção,
  novo projeto de implantação (manual ou derivado de contrato), edição e
  mudança de etapa da implantação.

## Verificação (para quem for mexer no código)

`npm test` inclui `notify.test.mjs`: formato do e-mail (todos os campos),
`notifyReady`, o payload do EmailJS, e a garantia de que falha de rede vira
relato e nunca exceção.
