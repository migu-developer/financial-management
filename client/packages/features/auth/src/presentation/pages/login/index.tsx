import { LoginTemplate } from '@features/auth/presentation/components/templates/login-template';
import type { SocialProvider } from '@features/ui';

interface LoginPageProps {
  onForgotPassword: () => void;
  onSignUp: () => void;
  loading?: boolean;
  error?: string;
}

export function LoginPage(props: LoginPageProps) {
  const handleSignIn = (_email: string, _password: string) => {
    // TODO: implement auth logic
    console.log('sign in', _email, _password);
  };

  const handleSocialSignIn = (_provider: SocialProvider) => {
    // TODO: implement social auth logic
    console.log('social sign in', _provider);
  };

  return (
    <LoginTemplate
      onSignIn={handleSignIn}
      onSocialSignIn={handleSocialSignIn}
      {...props}
    />
  );
}
