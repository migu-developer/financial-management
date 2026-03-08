import { ForgotPasswordTemplate } from '@features/auth/presentation/components/shared/templates/forgot-password-template';

interface ForgotPasswordPageProps {
  onBack: () => void;
}

export function ForgotPasswordPage({ onBack }: ForgotPasswordPageProps) {
  return <ForgotPasswordTemplate onBack={onBack} />;
}
