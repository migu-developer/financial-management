// Auth Provider + context
export { AuthProvider, useAuth } from './presentation/providers/auth-provider';
export type {
  AuthState,
  AuthContextValue,
} from './presentation/providers/auth-provider';

// Pages
export { LoginPage } from './presentation/pages/login';
export { RegisterPage } from './presentation/pages/register';
export { ForgotPasswordPage } from './presentation/pages/forgot-password';

// Templates
export { LoginTemplate } from './presentation/components/shared/templates/login-template';
export type { LoginTemplateProps } from './presentation/components/shared/templates/login-template';
export { RegisterTemplate } from './presentation/components/shared/templates/register-template';
export type { RegisterTemplateProps } from './presentation/components/shared/templates/register-template';
export { ForgotPasswordTemplate } from './presentation/components/shared/templates/forgot-password-template';
export type { ForgotPasswordTemplateProps } from './presentation/components/shared/templates/forgot-password-template';
export { ConfirmSignUpTemplate } from './presentation/components/shared/templates/confirm-sign-up-template';
export type { ConfirmSignUpTemplateProps } from './presentation/components/shared/templates/confirm-sign-up-template';
export { ConfirmForgotPasswordTemplate } from './presentation/components/shared/templates/confirm-forgot-password-template';
export type { ConfirmForgotPasswordTemplateProps } from './presentation/components/shared/templates/confirm-forgot-password-template';
export { NewPasswordTemplate } from './presentation/components/shared/templates/new-password-template';
export type { NewPasswordTemplateProps } from './presentation/components/shared/templates/new-password-template';
export { MfaVerifyTemplate } from './presentation/components/shared/templates/mfa-verify-template';
export type { MfaVerifyTemplateProps } from './presentation/components/shared/templates/mfa-verify-template';
export { MfaSetupTemplate } from './presentation/components/shared/templates/mfa-setup-template';
export type { MfaSetupTemplateProps } from './presentation/components/shared/templates/mfa-setup-template';

// Atoms
export { OtpInput } from './presentation/components/shared/atoms/otp-input';
export type { OtpInputProps } from './presentation/components/shared/atoms/otp-input';
export { PhoneInput } from './presentation/components/shared/atoms/phone-input';
export type { PhoneInputProps } from './presentation/components/shared/atoms/phone-input';
export {
  PasswordStrength,
  evaluatePasswordStrength,
} from './presentation/components/shared/atoms/password-strength';
export type { PasswordStrengthProps } from './presentation/components/shared/atoms/password-strength';
export { QrCode } from './presentation/components/shared/atoms/qr-code';
export type { QrCodeProps } from './presentation/components/shared/atoms/qr-code';

// Molecules
export {
  IdentifierInput,
  detectIdentifierType,
} from './presentation/components/shared/molecules/identifier-input';
export type {
  IdentifierInputProps,
  IdentifierType,
} from './presentation/components/shared/molecules/identifier-input';
export { TermsConsent } from './presentation/components/shared/molecules/terms-consent';
export type { TermsConsentProps } from './presentation/components/shared/molecules/terms-consent';
export { NotificationPreference } from './presentation/components/shared/molecules/notification-preference';
export type {
  NotificationPreferenceProps,
  NotificationChannel,
} from './presentation/components/shared/molecules/notification-preference';
