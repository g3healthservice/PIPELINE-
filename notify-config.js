// Padrões de fábrica da notificação por e-mail.
//
// Este arquivo carrega SÓ valores públicos e não-secretos. A "chave pública"
// do EmailJS é feita para aparecer no navegador — ela não envia e-mail
// sozinha; o EmailJS só aceita o envio se a origem (o domínio do site) estiver
// na lista que você configura na conta. Por isso pode ficar aqui, versionada.
//
// Os campos abaixo nascem em branco de propósito: enquanto não forem
// preenchidos (aqui ou na tela de Notificações do app), nada é enviado e o
// app funciona exatamente como antes. Preencher aqui faz a configuração valer
// para todos os navegadores; preencher na tela vale só naquele navegador.
export const NOTIFY_DEFAULTS = {
  enabled: false,
  serviceId: '',
  templateId: '',
  publicKey: '',
  to: 'g3.healthservice@gmail.com',
};
