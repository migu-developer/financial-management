export const login = {
  title: 'Iniciar sesión',
  subtitle: 'Bienvenido de nuevo. Inicia sesión en tu cuenta.',
  emailLabel: 'Correo electrónico',
  emailPlaceholder: 'tu@correo.com',
  passwordLabel: 'Contraseña',
  passwordPlaceholder: 'Tu contraseña',
  signInButton: 'Iniciar sesión',
  forgotPassword: '¿Olvidaste tu contraseña?',
  noAccount: '¿No tienes cuenta?',
  signUp: 'Regístrate',
  or: 'O continúa con',
  social: {
    google: 'Google',
    facebook: 'Facebook',
    microsoft: 'Microsoft',
    apple: 'Apple',
  },
  register: {
    title: 'Crear cuenta',
    comingSoon: 'Registro próximamente',
    description: 'Estamos trabajando en la creación de cuentas. Vuelve pronto.',
    back: 'Volver al inicio de sesión',
  },
  forgotPasswordPage: {
    title: 'Olvidé mi contraseña',
    comingSoon: 'Recuperación de contraseña próximamente',
    description:
      'Estamos trabajando en la recuperación de contraseñas. Vuelve pronto.',
    back: 'Volver al inicio de sesión',
  },
} as const;

export type LoginTranslation = typeof login;
