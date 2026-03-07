import { RegisterTemplate } from '@features/auth/presentation/components/templates/register-template';

interface RegisterPageProps {
  onBack: () => void;
}

export function RegisterPage({ onBack }: RegisterPageProps) {
  return <RegisterTemplate onBack={onBack} />;
}
