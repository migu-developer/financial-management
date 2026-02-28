import type { LocaleMessages } from '@custom-message/types';

export const enMessages: LocaleMessages = {
  CustomMessage_SignUp: {
    emailSubject: 'Verify your account - Financial Management',
    smsMessage: 'Your Financial Management verification code is: {####}',
  },
  CustomMessage_AdminCreateUser: {
    emailSubject: 'Welcome to Financial Management',
    smsMessage:
      'Financial Management: Your username is {username} and your temporary password is {####}',
  },
  CustomMessage_ResendCode: {
    emailSubject: 'Your new code - Financial Management',
    smsMessage: 'Your new Financial Management verification code is: {####}',
  },
  CustomMessage_ForgotPassword: {
    emailSubject: 'Reset your password - Financial Management',
    smsMessage: 'Your Financial Management password recovery code is: {####}',
  },
  CustomMessage_UpdateUserAttribute: {
    emailSubject: 'Verify your change - Financial Management',
    smsMessage:
      'Your Financial Management verification code for the change is: {####}',
  },
  CustomMessage_VerifyUserAttribute: {
    emailSubject: 'Verify your attribute - Financial Management',
    smsMessage: 'Your Financial Management verification code is: {####}',
  },
};
