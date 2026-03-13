import { RegisterTemplate } from '@features/auth/presentation/components/shared/templates/register-template';
import type { RegisterTemplateProps } from '@features/auth/presentation/components/shared/templates/register-template';

export type RegisterPageProps = RegisterTemplateProps;

export function RegisterPage(props: RegisterPageProps) {
  return <RegisterTemplate {...props} />;
}
