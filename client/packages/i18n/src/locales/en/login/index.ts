export const login = {
  // ── Sign-in ───────────────────────────────────────────────────────────────
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

  // ── Identifier input ──────────────────────────────────────────────────────
  identifierInput: {
    label: 'Email or phone number',
    placeholder: 'your@email.com',
    emailDetected: 'Email detected',
    phoneDetected: 'Phone number detected',
    invalidEmail: 'Please enter a valid email',
    invalidPhone: 'Please enter a valid phone number',
    invalidIdentifier: 'Please enter a valid email or phone number',
  },

  // ── Register ──────────────────────────────────────────────────────────────
  register: {
    title: 'Create Account',
    subtitle: 'Join us today. It only takes a minute.',
    nameLabel: 'Full name',
    namePlaceholder: 'John Doe',
    smsLabel: 'SMS',
    emailLabel: 'Email',
    emailPlaceholder: 'your@email.com',
    phoneLabel: 'Phone number',
    phonePlaceholder: 'Enter your phone number',
    emailInvalid: 'Please enter a valid email address',
    addPhoneToggle: 'Add phone number',
    addPhoneInfoTitle: 'Phone number & verification',
    addPhoneInfoBody:
      'If you add a phone number, your account verification code will be sent via SMS.\n\nIf you prefer to receive it by email, leave this field empty — you can always add your phone later from your profile.',
    addPhoneInfoClose: 'Got it',
    passwordLabel: 'Password',
    passwordPlaceholder: 'At least 8 characters',
    confirmPasswordLabel: 'Confirm password',
    confirmPasswordPlaceholder: 'Repeat your password',
    termsConsent: 'I agree to the',
    termsLink: 'Terms of Service',
    andText: 'and',
    privacyLink: 'Privacy Policy',
    submitButton: 'Create account',
    alreadyHaveAccount: 'Already have an account?',
    signIn: 'Sign in',
    passwordStrength: {
      weak: 'Weak',
      fair: 'Fair',
      good: 'Good',
      strong: 'Strong',
      met: 'Met',
      notMet: 'Not met',
    },
    passwordRequirements: {
      minLength: 'At least 8 characters',
      uppercase: 'One uppercase letter',
      lowercase: 'One lowercase letter',
      number: 'One number',
      special: 'One special character',
    },
  },

  // ── Phone picker ──────────────────────────────────────────────────────────
  phonePicker: {
    title: 'Select Country',
    searchPlaceholder: 'Search country...',
    done: 'Done',
  },

  // ── QR code ───────────────────────────────────────────────────────────────
  qrCode: {
    accessibilityLabel: 'QR code',
  },

  // ── Confirm sign-up ───────────────────────────────────────────────────────
  confirmSignUp: {
    title: 'Verify Your Account',
    subtitleEmail: 'Enter the 6-digit code sent to {{destination}}',
    subtitleEmailWithPhone:
      'Enter the 6-digit code sent to {{destination}} or via SMS to {{phone}}.',
    subtitlePhone: 'Enter the 6-digit code sent by SMS to {{destination}}',
    codeLabel: 'Verification code',
    codePlaceholder: '000000',
    submitButton: 'Verify account',
    resendCode: "Didn't receive the code?",
    resendButton: 'Resend code',
    resendCooldown: 'Resend in {{seconds}}s',
    back: 'Back to sign in',
    success: 'Account verified! Redirecting to sign in...',
  },

  // ── Forced new password ───────────────────────────────────────────────────
  newPassword: {
    title: 'Set New Password',
    subtitle: 'Your administrator requires you to set a new password.',
    newPasswordLabel: 'New password',
    newPasswordPlaceholder: 'At least 8 characters',
    confirmPasswordLabel: 'Confirm new password',
    confirmPasswordPlaceholder: 'Repeat your new password',
    submitButton: 'Set password',
    passwordMismatch: 'Passwords do not match',
  },

  // ── MFA verify ────────────────────────────────────────────────────────────
  mfaVerify: {
    titleSms: 'SMS Verification',
    titleTotp: 'Authenticator App',
    subtitleSms: 'Enter the code sent by SMS to {{destination}}',
    subtitleTotp: 'Enter the 6-digit code from your authenticator app',
    codeLabel: 'Verification code',
    codePlaceholder: '000000',
    submitButton: 'Verify',
    back: 'Back to sign in',
  },

  // ── MFA setup ─────────────────────────────────────────────────────────────
  mfaSetup: {
    title: 'Set Up Two-Factor Authentication',
    subtitle:
      'Scan the QR code with your authenticator app, then enter the code to confirm.',
    step1: 'Scan QR code',
    step1Description: 'Open your authenticator app and scan the QR code below.',
    secretLabel: 'Or enter manually:',
    step2: 'Verify code',
    codeLabel: 'Verification code',
    codePlaceholder: '000000',
    deviceNameLabel: 'Device name',
    deviceNamePlaceholder: 'e.g. My iPhone',
    submitButton: 'Enable 2FA',
    back: 'Set up later',
  },

  // ── Forgot password ───────────────────────────────────────────────────────
  forgotPasswordPage: {
    title: 'Forgot Password',
    subtitle:
      'Enter your email or phone number and we will send you a reset code.',
    identifierLabel: 'Email or phone number',
    identifierPlaceholder: 'your@email.com or +1 234 567 8900',
    submitButton: 'Send reset code',
    back: 'Back to sign in',
    sentToEmail: 'Code sent to {{destination}}',
    sentToPhone: 'Code sent by SMS to {{destination}}',
  },

  // ── Confirm forgot password ───────────────────────────────────────────────
  confirmForgotPassword: {
    title: 'Reset Password',
    subtitle: 'Enter the code sent to {{destination}} and your new password.',
    codeLabel: 'Reset code',
    codePlaceholder: '000000',
    newPasswordLabel: 'New password',
    newPasswordPlaceholder: 'At least 8 characters',
    confirmPasswordLabel: 'Confirm new password',
    confirmPasswordPlaceholder: 'Repeat your new password',
    submitButton: 'Reset password',
    passwordMismatch: 'Passwords do not match',
    back: 'Back to sign in',
  },

  // ── OAuth callback ───────────────────────────────────────────────────────
  callback: {
    signInSuccess: 'Sign in successful',
    signInFailed: 'Sign in failed. Redirecting…',
  },

  // ── Errors ────────────────────────────────────────────────────────────────
  errors: {
    notAuthorized: 'Incorrect email or password.',
    userNotFound: 'No account found with this email or phone number.',
    usernameExists: 'An account with this email already exists.',
    aliasExists: 'An account with this email or phone already exists.',
    codeMismatch: 'Invalid verification code. Please try again.',
    expiredCode: 'The verification code has expired. Please request a new one.',
    invalidPassword: 'Password does not meet the security requirements.',
    userNotConfirmed:
      'Your account has not been verified. Please check your email.',
    passwordResetRequired: 'You must reset your password before signing in.',
    tooManyRequests: 'Too many attempts. Please wait a moment and try again.',
    networkError: 'Network error. Please check your connection and try again.',
    unknown: 'An unexpected error occurred. Please try again.',
  },
} as const;

export type LoginTranslation = typeof login;
