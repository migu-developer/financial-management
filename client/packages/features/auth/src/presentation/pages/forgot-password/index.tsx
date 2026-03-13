import { ForgotPasswordTemplate } from '@features/auth/presentation/components/shared/templates/forgot-password-template';
import type { ForgotPasswordTemplateProps } from '@features/auth/presentation/components/shared/templates/forgot-password-template';

export type ForgotPasswordPageProps = ForgotPasswordTemplateProps;

export function ForgotPasswordPage(props: ForgotPasswordPageProps) {
  return <ForgotPasswordTemplate {...props} />;
}
