export const login = {
  // ── Sign-in ───────────────────────────────────────────────────────────────
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

  // ── Identifier input ──────────────────────────────────────────────────────
  identifierInput: {
    label: 'Correo o número de teléfono',
    placeholder: 'tu@correo.com',
    emailDetected: 'Correo electrónico detectado',
    phoneDetected: 'Número de teléfono detectado',
    invalidEmail: 'Por favor ingresa un correo válido',
    invalidPhone: 'Por favor ingresa un número de teléfono válido',
    invalidIdentifier:
      'Por favor ingresa un correo o número de teléfono válido',
  },

  // ── Register ──────────────────────────────────────────────────────────────
  register: {
    title: 'Crear cuenta',
    subtitle: 'Únete hoy. Solo toma un minuto.',
    nameLabel: 'Nombre completo',
    namePlaceholder: 'Juan Pérez',
    smsLabel: 'SMS',
    emailLabel: 'Correo electrónico',
    emailPlaceholder: 'tu@correo.com',
    phoneLabel: 'Número de teléfono (opcional)',
    phonePlaceholder: 'Ingresa tu número de teléfono',
    phoneRequiredForSms:
      'El número de teléfono es requerido para notificaciones por SMS o Ambos',
    emailInvalid: 'Por favor ingresa una dirección de correo válida',
    passwordLabel: 'Contraseña',
    passwordPlaceholder: 'Al menos 8 caracteres',
    confirmPasswordLabel: 'Confirmar contraseña',
    confirmPasswordPlaceholder: 'Repite tu contraseña',
    termsConsent: 'Acepto los',
    termsLink: 'Términos de servicio',
    andText: 'y la',
    privacyLink: 'Política de privacidad',
    submitButton: 'Crear cuenta',
    alreadyHaveAccount: '¿Ya tienes una cuenta?',
    signIn: 'Iniciar sesión',
    passwordStrength: {
      weak: 'Débil',
      fair: 'Regular',
      good: 'Buena',
      strong: 'Fuerte',
      met: 'Cumplido',
      notMet: 'No cumplido',
    },
    passwordRequirements: {
      minLength: 'Al menos 8 caracteres',
      uppercase: 'Una letra mayúscula',
      lowercase: 'Una letra minúscula',
      number: 'Un número',
      special: 'Un carácter especial',
    },
    notificationPreference: '¿Cómo deseas recibir notificaciones?',
    notificationBoth: 'Ambos',
  },

  // ── Phone picker ──────────────────────────────────────────────────────────
  phonePicker: {
    title: 'Seleccionar país',
    searchPlaceholder: 'Buscar país...',
    done: 'Listo',
  },

  // ── QR code ───────────────────────────────────────────────────────────────
  qrCode: {
    accessibilityLabel: 'Código QR',
  },

  // ── Confirm sign-up ───────────────────────────────────────────────────────
  confirmSignUp: {
    title: 'Verifica tu cuenta',
    subtitleEmail: 'Ingresa el código de 6 dígitos enviado a {{destination}}',
    subtitlePhone:
      'Ingresa el código de 6 dígitos enviado por SMS a {{destination}}',
    codeLabel: 'Código de verificación',
    codePlaceholder: '000000',
    submitButton: 'Verificar cuenta',
    resendCode: '¿No recibiste el código?',
    resendButton: 'Reenviar código',
    resendCooldown: 'Reenviar en {{seconds}}s',
    back: 'Volver al inicio de sesión',
    success: '¡Cuenta verificada! Redirigiendo al inicio de sesión...',
  },

  // ── Forced new password ───────────────────────────────────────────────────
  newPassword: {
    title: 'Establecer nueva contraseña',
    subtitle: 'Tu administrador requiere que establezcas una nueva contraseña.',
    newPasswordLabel: 'Nueva contraseña',
    newPasswordPlaceholder: 'Al menos 8 caracteres',
    confirmPasswordLabel: 'Confirmar nueva contraseña',
    confirmPasswordPlaceholder: 'Repite tu nueva contraseña',
    submitButton: 'Establecer contraseña',
    passwordMismatch: 'Las contraseñas no coinciden',
  },

  // ── MFA verify ────────────────────────────────────────────────────────────
  mfaVerify: {
    titleSms: 'Verificación por SMS',
    titleTotp: 'Aplicación autenticadora',
    subtitleSms: 'Ingresa el código enviado por SMS a {{destination}}',
    subtitleTotp:
      'Ingresa el código de 6 dígitos de tu aplicación autenticadora',
    codeLabel: 'Código de verificación',
    codePlaceholder: '000000',
    submitButton: 'Verificar',
    back: 'Volver al inicio de sesión',
  },

  // ── MFA setup ─────────────────────────────────────────────────────────────
  mfaSetup: {
    title: 'Configurar autenticación de dos factores',
    subtitle:
      'Escanea el código QR con tu aplicación autenticadora, luego ingresa el código para confirmar.',
    step1: 'Escanear código QR',
    step1Description:
      'Abre tu aplicación autenticadora y escanea el código QR a continuación.',
    secretLabel: 'O ingresa manualmente:',
    step2: 'Verificar código',
    codeLabel: 'Código de verificación',
    codePlaceholder: '000000',
    deviceNameLabel: 'Nombre del dispositivo',
    deviceNamePlaceholder: 'Ej. Mi iPhone',
    submitButton: 'Activar 2FA',
    back: 'Configurar más tarde',
  },

  // ── Forgot password ───────────────────────────────────────────────────────
  forgotPasswordPage: {
    title: 'Olvidé mi contraseña',
    subtitle:
      'Ingresa tu correo o número de teléfono y te enviaremos un código de restablecimiento.',
    identifierLabel: 'Correo o número de teléfono',
    identifierPlaceholder: 'tu@correo.com o +1 234 567 8900',
    submitButton: 'Enviar código',
    back: 'Volver al inicio de sesión',
    sentToEmail: 'Código enviado a {{destination}}',
    sentToPhone: 'Código enviado por SMS a {{destination}}',
  },

  // ── Confirm forgot password ───────────────────────────────────────────────
  confirmForgotPassword: {
    title: 'Restablecer contraseña',
    subtitle:
      'Ingresa el código enviado a {{destination}} y tu nueva contraseña.',
    codeLabel: 'Código de restablecimiento',
    codePlaceholder: '000000',
    newPasswordLabel: 'Nueva contraseña',
    newPasswordPlaceholder: 'Al menos 8 caracteres',
    confirmPasswordLabel: 'Confirmar nueva contraseña',
    confirmPasswordPlaceholder: 'Repite tu nueva contraseña',
    submitButton: 'Restablecer contraseña',
    passwordMismatch: 'Las contraseñas no coinciden',
    back: 'Volver al inicio de sesión',
  },

  // ── Errors ────────────────────────────────────────────────────────────────
  errors: {
    notAuthorized: 'Correo o contraseña incorrectos.',
    userNotFound: 'No se encontró ninguna cuenta con este correo o teléfono.',
    usernameExists: 'Ya existe una cuenta con este correo electrónico.',
    aliasExists: 'Ya existe una cuenta con este correo o teléfono.',
    codeMismatch:
      'Código de verificación inválido. Por favor intenta de nuevo.',
    expiredCode:
      'El código de verificación ha expirado. Por favor solicita uno nuevo.',
    invalidPassword: 'La contraseña no cumple con los requisitos de seguridad.',
    userNotConfirmed:
      'Tu cuenta no ha sido verificada. Por favor revisa tu correo.',
    passwordResetRequired:
      'Debes restablecer tu contraseña antes de iniciar sesión.',
    tooManyRequests:
      'Demasiados intentos. Por favor espera un momento e intenta de nuevo.',
    networkError:
      'Error de red. Por favor verifica tu conexión e intenta de nuevo.',
    unknown: 'Ocurrió un error inesperado. Por favor intenta de nuevo.',
  },
} as const;

export type LoginTranslation = typeof login;
