import React, { useState } from 'react';

import { LoginTemplate } from '@features/auth/presentation/components/shared/templates/login-template';
import type { SocialProvider } from '@features/ui';

interface LoginPageProps {
  onForgotPassword: () => void;
  onSignUp: () => void;
  onSignInSuccess?: () => void;
  error?: string;
}

export function LoginPage({ onSignInSuccess, ...props }: LoginPageProps) {
  const [loading, setLoading] = useState(false);

  const simulateAuth = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      onSignInSuccess?.();
    }, 1500);
  };

  const handleSignIn = (_email: string, _password: string) => {
    console.log('sign in', _email, _password);
    simulateAuth();
  };

  const handleSocialSignIn = (_provider: SocialProvider) => {
    console.log('social sign in', _provider);
    simulateAuth();
  };

  return (
    <LoginTemplate
      onSignIn={handleSignIn}
      onSocialSignIn={handleSocialSignIn}
      loading={loading}
      {...props}
    />
  );
}
