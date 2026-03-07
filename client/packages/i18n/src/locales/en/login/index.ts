export const login = {
  title: 'Sign In',
  subtitle: 'Welcome back. Sign in to your account.',
  emailLabel: 'Email',
  emailPlaceholder: 'your@email.com',
  passwordLabel: 'Password',
  passwordPlaceholder: 'Your password',
  signInButton: 'Sign In',
  forgotPassword: 'Forgot your password?',
  noAccount: "Don't have an account?",
  signUp: 'Sign up',
  or: 'Or continue with',
  social: {
    google: 'Google',
    facebook: 'Facebook',
    microsoft: 'Microsoft',
    apple: 'Apple',
  },
  register: {
    title: 'Create Account',
    comingSoon: 'Registration coming soon',
    description: 'We are working on account creation. Check back soon.',
    back: 'Back to sign in',
  },
  forgotPasswordPage: {
    title: 'Forgot Password',
    comingSoon: 'Password recovery coming soon',
    description: 'We are working on password recovery. Check back soon.',
    back: 'Back to sign in',
  },
} as const;

export type LoginTranslation = typeof login;
