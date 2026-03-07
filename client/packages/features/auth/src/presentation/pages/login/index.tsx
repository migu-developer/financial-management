import { LoginTemplate } from '@features/auth/presentation/components/templates/login-template';
import type { SocialProvider } from '@features/ui';

interface LoginPageProps {
  onSignIn: (email: string, password: string) => void;
  onForgotPassword: () => void;
  onSignUp: () => void;
  onSocialSignIn: (provider: SocialProvider) => void;
  loading?: boolean;
  error?: string;
}

export function LoginPage(props: LoginPageProps) {
  return <LoginTemplate {...props} />;
}
