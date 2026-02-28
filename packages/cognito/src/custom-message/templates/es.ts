import type { LocaleMessages } from '@custom-message/types';

export const esMessages: LocaleMessages = {
  CustomMessage_SignUp: {
    emailSubject: 'Verifica tu cuenta - Financial Management',
    smsMessage: 'Tu código de verificación de Financial Management es: {####}',
  },
  CustomMessage_AdminCreateUser: {
    emailSubject: 'Bienvenido a Financial Management',
    smsMessage:
      'Financial Management: Tu usuario es {username} y tu contraseña temporal es {####}',
  },
  CustomMessage_ResendCode: {
    emailSubject: 'Tu nuevo código - Financial Management',
    smsMessage:
      'Tu nuevo código de verificación de Financial Management es: {####}',
  },
  CustomMessage_ForgotPassword: {
    emailSubject: 'Recupera tu contraseña - Financial Management',
    smsMessage:
      'Tu código para recuperar tu contraseña de Financial Management es: {####}',
  },
  CustomMessage_UpdateUserAttribute: {
    emailSubject: 'Verifica tu cambio - Financial Management',
    smsMessage:
      'Tu código de verificación de Financial Management para el cambio es: {####}',
  },
  CustomMessage_VerifyUserAttribute: {
    emailSubject: 'Verifica tu atributo - Financial Management',
    smsMessage: 'Tu código de verificación de Financial Management es: {####}',
  },
};
