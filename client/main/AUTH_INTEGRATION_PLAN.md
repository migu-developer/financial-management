# Plan de Integración de Autenticación — Cognito + Cliente

## Estado Real del Cognito (AWS CLI — us-east-1_YBTSdZtSv)

```
Pool ID:            us-east-1_YBTSdZtSv
Domain:             fm-migudev-dev-auth.auth.us-east-1.amazoncognito.com
MFA:                ON (obligatorio para todos los usuarios)
MFA Types:          TOTP software token ✅  |  SMS ✅
Sign-in aliases:    email ✅  |  phone_number ✅
Auth flows:         ALLOW_USER_SRP_AUTH  |  ALLOW_REFRESH_TOKEN_AUTH
OAuth flow:         Authorization code grant
Callback URLs:      http://localhost:3000/auth/callback  ← necesita actualización
IdPs activos:       Google ✅ | Facebook ✅ | SignInWithApple ✅ | Microsoft (OIDC) ✅
Identity Pool:      us-east-1:171c6e3e-0f02-428c-ae9a-bfc6b122e093
```

### Password Policy (confirmada en pool)

- Mínimo 8 caracteres
- Requiere: mayúsculas, minúsculas, números, símbolos
- Contraseña temporal válida: 7 días

### Atributos estándar configurados

| Atributo       | Requerido | Mutable |
| -------------- | --------- | ------- |
| `email`        | **true**  | true    |
| `phone_number` | false     | true    |
| `given_name`   | false     | true    |
| `family_name`  | false     | true    |
| `name`         | false     | true    |
| `locale`       | false     | true    |

---

## ✅ Confirmación: No se requiere recrear el pool

El pool desplegado ya tiene exactamente la configuración correcta:

- `email: required: true` → email **obligatorio en el registro** ✅
- `phone_number: required: false` → teléfono **opcional en el registro** ✅
- `signInAliases: ['email', 'phone_number']` → **sign-in con cualquiera** ✅

**Regla de negocio resultante:**

- Registro: email siempre obligatorio. Teléfono opcional (pero si se proporciona, queda disponible para sign-in y como canal MFA SMS).
- Sign-in: el usuario puede escribir su email O su número de teléfono indistintamente.

**Único cambio CDK necesario** — actualizar las `callbackUrls` del `UserPoolClient` (solo el cliente, no el pool — no destruye nada):

```typescript
// cognito-stack.ts — solo modificar el UserPoolClient
this.userPoolClient = new UserPoolClient(this, 'UserPoolClient', {
  userPool: this.userPool,
  oAuth: {
    flows: { authorizationCodeGrant: true },
    scopes: [OAuthScope.OPENID, OAuthScope.EMAIL, OAuthScope.PROFILE],
    callbackUrls: [
      'http://localhost:8081/auth/callback', // Expo dev server
      'http://localhost:3000/auth/callback', // build web local
      'com.financialmanagement.app://auth/callback', // Mobile deep link
    ],
    logoutUrls: [
      'http://localhost:8081',
      'http://localhost:3000',
      'com.financialmanagement.app://',
    ],
  },
  // ... resto igual
});
```

Este `cdk deploy` solo actualiza el cliente OAuth — **sin recrear el pool, sin perder usuarios**.

---

## Todos los Flujos Cognito que Debemos Soportar

Basado en los emails transaccionales en `packages/transactional` + documentación Cognito:

| Flujo                        | Trigger Cognito                     | Email cubierto                | Vista necesaria        |
| ---------------------------- | ----------------------------------- | ----------------------------- | ---------------------- |
| Registro con email/phone     | `CustomMessage_SignUp`              | `account-verification`        | RegisterTemplate       |
| Reenviar código verificación | `CustomMessage_ResendCode`          | `resend-verification-code`    | RegisterTemplate       |
| Invitación admin             | `CustomMessage_AdminCreateUser`     | `admin-invitation`            | NewPasswordTemplate    |
| Olvidé contraseña            | `CustomMessage_ForgotPassword`      | `password-reset`              | ForgotPasswordTemplate |
| Cambio de atributo           | `CustomMessage_UpdateUserAttribute` | `account-update-verification` | (post-registro)        |
| Verificar atributo           | `CustomMessage_VerifyUserAttribute` | `attribute-verification`      | (post-registro)        |
| MFA SMS                      | `CustomMessage_Authentication`      | `mfa-authentication`          | MfaVerifyTemplate      |
| TOTP setup                   | — (no email)                        | —                             | MfaSetupTemplate       |

---

## Arquitectura Hexagonal

### Estructura de carpetas resultante en `@features/auth`

```
src/
├── domain/
│   ├── entities/
│   │   ├── auth-session.ts          # AccessToken, IdToken, RefreshToken, expiresAt
│   │   └── user.ts                  # userId, email, phone, name, locale, attributes
│   ├── value-objects/
│   │   ├── identifier.ts            # EmailOrPhone: detecta tipo, valida formato
│   │   ├── phone-number.ts          # E.164 parsing, country code extraction
│   │   └── password.ts              # Valida política Cognito (8+, upper, lower, num, special)
│   ├── repositories/
│   │   └── auth-repository.port.ts  # Interface (puerto): contrato de operaciones
│   └── errors/
│       └── auth-errors.ts           # NotAuthorizedException, UserNotFound, CodeMismatch, etc.
│
├── application/
│   └── use-cases/
│       ├── sign-in.use-case.ts              # email/phone + password → SRP → challenge
│       ├── respond-to-challenge.use-case.ts # NEW_PASSWORD | MFA challenge
│       ├── sign-up.use-case.ts              # registro + locale auto desde i18n
│       ├── confirm-sign-up.use-case.ts      # código de verificación post-registro
│       ├── resend-confirmation.use-case.ts  # reenviar código
│       ├── initiate-social-sign-in.use-case.ts  # genera URL OAuth PKCE
│       ├── handle-oauth-callback.use-case.ts    # intercambia code → tokens
│       ├── setup-totp.use-case.ts           # AssociateSoftwareToken → QR
│       ├── verify-totp-setup.use-case.ts    # VerifySoftwareToken con código
│       ├── forgot-password.use-case.ts      # ForgotPassword → envía código
│       ├── confirm-forgot-password.use-case.ts # ConfirmForgotPassword
│       └── sign-out.use-case.ts             # revoca tokens
│
├── infrastructure/
│   └── cognito/
│       ├── cognito-auth-repository.ts       # Adaptador: implementa el puerto
│       ├── cognito-config.ts                # User Pool ID, Client ID, domain
│       └── pkce-utils.ts                    # generateCodeVerifier / challenge
│
└── presentation/
    ├── components/
    │   ├── shared/                          # Web + Mobile reutilizable
    │   │   ├── atoms/
    │   │   │   ├── otp-input/               # 6 celdas independientes, auto-advance
    │   │   │   ├── phone-input/             # Flag + país + número, formato E.164
    │   │   │   └── password-strength/       # Indicador visual de política
    │   │   ├── molecules/
    │   │   │   ├── identifier-input/        # Smart: auto-detecta email vs phone
    │   │   │   ├── terms-consent/           # Checkbox + links terms/privacy
    │   │   │   └── notification-preference/ # Email / SMS / Ambos
    │   │   └── templates/
    │   │       ├── login-template/          # Actualizar: identifier-input + password
    │   │       ├── register-template/       # Reemplazar stub: formulario completo
    │   │       ├── forgot-password-template/# Reemplazar stub: paso 1 (pedir identifier)
    │   │       ├── confirm-forgot-password-template/ # Nuevo: paso 2 (código + nueva pass)
    │   │       ├── new-password-template/   # Nuevo: NEW_PASSWORD_REQUIRED challenge
    │   │       ├── mfa-verify-template/     # Nuevo: código MFA (TOTP o SMS)
    │   │       └── mfa-setup-template/      # Nuevo: QR + confirm setup
    │   ├── web/                             # Solo web
    │   │   └── atoms/
    │   │       └── qr-code/                 # react-native-qr-svg (web render)
    │   └── mobile/                          # Solo mobile
    │       └── atoms/
    │           └── qr-code/                 # react-native-qrcode-svg (native render)
    └── pages/
        ├── login/                           # Existente — actualizar
        ├── register/                        # Existente — actualizar
        ├── forgot-password/                 # Existente — actualizar
        ├── mfa/                             # Nuevo
        └── new-password/                    # Nuevo
```

---

## Parte 1 — Cambios en CDK (infra)

### 1.1 `cognito-stack.ts`

- `email: { required: false }` → requiere redeploy del pool
- Agregar `name` explícitamente en `standardAttributes`
- Actualizar callback/logout URLs con deep-link mobile y puerto 8081

### 1.2 `config/.env.defaults` y archivos por entorno

- Agregar `EXPO_URL_SCHEME=com.financialmanagement.app`

---

## Parte 2 — Dependencias a Instalar

```bash
# En client/packages/features/auth:
amazon-cognito-identity-js   # SRP auth, challenge handling
@aws-sdk/client-cognito-identity-provider  # associate/verify TOTP, admin ops

# En client/main:
expo-auth-session            # PKCE OAuth para social login (web + mobile)
expo-web-browser             # Abrir hosted UI en mobile
expo-linking                 # Deep links para callback mobile
react-native-qrcode-svg      # QR code para TOTP setup (web + native)
libphonenumber-js            # Validación E.164, country detection
```

Agregar al catalog en `pnpm-workspace.yaml`:

```yaml
'amazon-cognito-identity-js': '^6.3.12'
'expo-auth-session': catalog:
'expo-web-browser': catalog:
'expo-linking': catalog:
'react-native-qrcode-svg': '^6.3.0'
'libphonenumber-js': '^1.11.0'
```

---

## Parte 3 — Dominio y Aplicación

### 3.1 `identifier.ts` — value object clave

Detecta automáticamente el tipo mientras el usuario escribe:

```
"+" o dígito al inicio → PhoneMode → mostrar country picker
"@" en el string      → EmailMode → mostrar input de email estándar
```

### 3.2 `phone-number.ts`

- Parsea `+57 300 123 4567` → `{ countryCode: 'CO', dialCode: '+57', number: '3001234567', e164: '+573001234567' }`
- Detecta país automáticamente cuando usuario escribe `+57...`
- Listado de países ordenado: Colombia primero, luego por más comunes

### 3.3 `auth-repository.port.ts` — interfaz del puerto

```typescript
interface AuthRepository {
  signIn(identifier: string, password: string): Promise<AuthChallengeResult>;
  respondToNewPasswordChallenge(
    session: string,
    newPassword: string,
    username: string,
  ): Promise<AuthChallengeResult>;
  respondToMfaChallenge(
    session: string,
    code: string,
    challengeName: MfaType,
  ): Promise<AuthSession>;
  signUp(dto: SignUpDto): Promise<void>;
  confirmSignUp(identifier: string, code: string): Promise<void>;
  resendConfirmationCode(identifier: string): Promise<void>;
  getOAuthSignInUrl(provider: SocialProvider, pkce: PkceParams): string;
  handleOAuthCallback(code: string, codeVerifier: string): Promise<AuthSession>;
  initiateForgotPassword(identifier: string): Promise<ForgotPasswordDelivery>;
  confirmForgotPassword(
    identifier: string,
    code: string,
    newPassword: string,
  ): Promise<void>;
  associateSoftwareToken(
    session: string,
  ): Promise<{ secretCode: string; qrCodeUrl: string }>;
  verifySoftwareToken(
    session: string,
    code: string,
    deviceName: string,
  ): Promise<void>;
  signOut(): Promise<void>;
}
```

### 3.4 `AuthChallengeResult` — resultado del sign-in

```typescript
type AuthChallengeResult =
  | { type: 'SESSION'; session: AuthSession }
  | { type: 'NEW_PASSWORD_REQUIRED'; session: string; username: string }
  | { type: 'SOFTWARE_TOKEN_MFA'; session: string }
  | { type: 'SMS_MFA'; session: string; destination: string }
  | { type: 'MFA_SETUP'; session: string };
```

---

## Parte 4 — Infraestructura: CognitoAuthRepository

Usa `amazon-cognito-identity-js` para SRP + challenges (evita exponer el client secret en el cliente).

```typescript
// cognito-config.ts
export const cognitoConfig = {
  userPoolId: process.env.EXPO_PUBLIC_COGNITO_USER_POOL_ID!,
  clientId: process.env.EXPO_PUBLIC_COGNITO_CLIENT_ID!,
  domain: process.env.EXPO_PUBLIC_COGNITO_DOMAIN!,
  region: 'us-east-1',
}

// Variables de entorno en client/main/.env
EXPO_PUBLIC_COGNITO_USER_POOL_ID=us-east-1_YBTSdZtSv
EXPO_PUBLIC_COGNITO_CLIENT_ID=1679si1acsna32aui1qt91nht0
EXPO_PUBLIC_COGNITO_DOMAIN=fm-migudev-dev-auth.auth.us-east-1.amazoncognito.com
EXPO_PUBLIC_APP_URL_SCHEME=com.financialmanagement.app
```

### Flujo SRP (sign-in con email/phone):

1. `CognitoUser.authenticateUser()` → `amazon-cognito-identity-js` maneja SRP
2. Callback `onSuccess` → `AuthSession`
3. Callback `newPasswordRequired` → `AuthChallengeResult.NEW_PASSWORD_REQUIRED`
4. Callback `totpRequired` → `AuthChallengeResult.SOFTWARE_TOKEN_MFA`
5. Callback `mfaRequired` → `AuthChallengeResult.SMS_MFA`
6. Callback `mfaSetup` → `AuthChallengeResult.MFA_SETUP`

### Flujo OAuth (social login):

1. Generar PKCE `code_verifier` + `code_challenge`
2. Construir URL: `https://{domain}/oauth2/authorize?...&code_challenge=...`
3. En web: `expo-auth-session` con `WebBrowser.openAuthSessionAsync`
4. En mobile: `expo-auth-session` con redirect a deep link
5. Recibir `code` en callback → `POST /oauth2/token` para intercambiar

### Flujo TOTP Setup:

1. `CognitoUser.associateSoftwareToken()` → `secretCode`
2. Construir QR URL: `otpauth://totp/{appName}:{email}?secret={secretCode}&issuer={appName}`
3. Mostrar QR con `react-native-qrcode-svg`
4. Usuario escanea → ingresa código → `verifySoftwareToken()`

---

## Parte 5 — Componentes de Presentación (Atomic Design)

### 5.1 Átomos NUEVOS en `@features/auth`

#### `otp-input/` — Entrada OTP de 6 dígitos

- 6 `TextInput` independientes
- Auto-advance al siguiente al ingresar dígito
- Auto-retrocede al borrar
- Soporte paste (pega los 6 dígitos automáticamente)
- Reutilizable para: verificación post-registro, MFA verify, confirm forgot-password

#### `phone-input/` — Selector de teléfono con país

- Dropdown con bandera + código de país
- Auto-detecta país cuando el usuario escribe `+XX`
- Formato automático según libphonenumber-js
- Emite siempre en formato E.164 al parent
- País por defecto: CO (Colombia), luego por más frecuentes globalmente

#### `password-strength/` — Indicador de fortaleza

- Evalúa en tiempo real contra política Cognito
- 4 barras de color (rojo → amarillo → verde)
- Lista de requisitos con ✓/✗ en tiempo real:
  - 8+ caracteres, mayúscula, minúscula, número, símbolo especial

### 5.2 Moléculas NUEVAS en `@features/auth`

#### `identifier-input/` — Input inteligente email/phone

- Detecta tipo mientras el usuario escribe
- Si detecta phone → renderiza `PhoneInput` con selector de país
- Si detecta email → renderiza `FormInput` estándar con keyboardType email
- Props: `value`, `onChangeValue(type, value)`, `error`
- Usado en: LoginTemplate, RegisterTemplate, ForgotPasswordTemplate

#### `terms-consent/` — Consentimiento de términos

```
☐  Acepto los [Términos de servicio] y la [Política de privacidad]
```

- Links navegables a /terms y /privacy
- Requerido para habilitar botón de registro

#### `notification-preference/` — Preferencia de notificación

```
¿Cómo deseas recibir tu contraseña temporal?
○ Email   ○ SMS   ○ Ambos
```

- Solo visible cuando el usuario registra AMBOS email y phone

### 5.3 Templates — Actualizaciones y Nuevos

#### `login-template/` — ACTUALIZAR

Cambios:

- Reemplazar `FormInput email` con `IdentifierInput` (auto-detecta email/phone)
- Mantener lógica social idéntica
- `onSignIn(identifier: string, identifierType: 'email'|'phone', password: string)`

#### `register-template/` — REEMPLAZAR (actualmente stub)

Campos:

1. **Nombre completo** → `FormInput` → mapea a atributo Cognito `name` (required en UI)
2. **Email** → `FormInput` con `keyboardType="email-address"` → **obligatorio** (requerido por el pool)
3. **Teléfono** → `PhoneInput` con selector de país → **opcional** (si se provee, se puede usar para sign-in y MFA SMS)
4. **Contraseña** → `FormInput` + `PasswordStrength` indicator
5. **Confirmar contraseña** → `FormInput` con validación match
6. **Preferencia notificación** → `NotificationPreference` (visible solo si el usuario completó el campo de teléfono)
7. **Consentimiento** → `TermsConsent`
8. Botón "Crear cuenta"
9. Separador + social providers

Nota: `locale` se toma automáticamente de `i18n.language` antes de llamar al use case.
Email e `IdentifierInput` en login/forgot-password permanecen detectando email vs phone automáticamente.

#### `confirm-sign-up-template/` — NUEVO

- Muestra a qué medio (email/phone) se envió el código
- `OtpInput` de 6 dígitos
- Botón "Verificar cuenta"
- Link "Reenviar código" (con cooldown de 60 segundos)
- Nota: Este flujo aparece post-registro

#### `new-password-template/` — NUEVO

Cuando Cognito envía `NEW_PASSWORD_REQUIRED` challenge (admin invitó al usuario):

- Mensaje: "Recibiste una invitación. Debes crear tu contraseña."
- Campo nueva contraseña + `PasswordStrength`
- Campo confirmar contraseña
- Botón "Establecer contraseña"

#### `mfa-verify-template/` — NUEVO

Cuando hay `SOFTWARE_TOKEN_MFA` o `SMS_MFA` challenge:

- Header diferente según tipo: "Código de autenticación" (TOTP) | "Código SMS enviado a +57\*\*\*\*4567"
- `OtpInput` de 6 dígitos
- Para TOTP: texto "Abre tu app de autenticación"
- Para SMS: link "Reenviar SMS"
- Botón "Verificar"

#### `mfa-setup-template/` — NUEVO

Cuando hay `MFA_SETUP` challenge (primer login):

- Explicación de TOTP
- QR Code del `secretCode` (usando `QrCode` component)
- Clave secreta en texto (para copiar manualmente)
- `OtpInput` para confirmar el código generado por la app
- Botón "Activar autenticación"
- Apps sugeridas: Google Authenticator, Authy, Microsoft Authenticator

#### `forgot-password-template/` — REEMPLAZAR (actualmente stub)

**Paso 1** — Solicitar código:

- `IdentifierInput` (email o phone)
- Botón "Enviar código"
- Mensaje explicativo del flujo

#### `confirm-forgot-password-template/` — NUEVO

**Paso 2** — Nueva contraseña:

- Texto: "Enviamos un código a [email/phone]"
- `OtpInput` de 6 dígitos (código recibido)
- Campo nueva contraseña + `PasswordStrength`
- Campo confirmar contraseña
- Botón "Cambiar contraseña"
- Link "Reenviar código"

### 5.4 QrCode Component — Web vs Mobile

```
@features/auth/src/presentation/components/web/atoms/qr-code/index.tsx
  → Usa react-native-qrcode-svg (funciona en web con expo)

@features/auth/src/presentation/components/mobile/atoms/qr-code/index.tsx
  → Usa react-native-qrcode-svg (mismo paquete, mismo componente)
```

Si ambas implementaciones son idénticas, consolidar en `shared/atoms/qr-code/`.

---

## Parte 6 — Rutas Expo Router

### Rutas NUEVAS a crear en `client/main/app/auth/`

```
app/auth/
├── _layout.tsx              ← ya existe, verificar que no requiera auth
├── index.tsx                ← ya existe (redirect a login)
├── login/
│   └── index.tsx            ← ya existe — actualizar
├── register/
│   ├── index.tsx            ← ya existe — actualizar (formulario completo)
│   └── confirm/index.tsx    ← NUEVO (OTP verification post-registro)
├── forgot-password/
│   ├── index.tsx            ← ya existe — reemplazar stub
│   └── confirm/index.tsx    ← NUEVO (código + nueva password)
├── new-password/
│   └── index.tsx            ← NUEVO (NEW_PASSWORD_REQUIRED challenge)
├── mfa/
│   ├── index.tsx            ← NUEVO (verify: TOTP o SMS)
│   └── setup/index.tsx      ← NUEVO (primer login: setup TOTP)
└── callback/
    └── index.tsx            ← NUEVO (OAuth callback web + mobile)
```

### Estado de Autenticación — `AuthProvider`

Crear `client/main/app/providers/auth-provider.tsx`:

```typescript
interface AuthState {
  session: AuthSession | null;
  pendingChallenge: AuthChallengeResult | null;
  loading: boolean;
}
```

- Persiste tokens en `SecureStore` (mobile) / `localStorage` con httpOnly simulation (web)
- Refresh automático antes de expiración
- Context: `useAuth()` → `{ session, signIn, signOut, ... }`

### Guard de rutas

- `app/auth/_layout.tsx` → si ya hay sesión, redirect a `/dashboard`
- `app/dashboard/_layout.tsx` → si no hay sesión, redirect a `/auth/login`

---

## Parte 7 — i18n: Namespace `login` → expandir

El namespace `login` se renombra conceptualmente a `auth` pero por compatibilidad extendemos el objeto `login` en `@packages/i18n`.

### Claves nuevas a agregar (ES + EN)

```typescript
// login namespace — nuevas secciones
register: {
  title, subtitle, fullName, fullNamePlaceholder,
  emailLabel, emailPlaceholder, phoneLabel, phonePlaceholder,
  addEmail, addPhone,
  passwordLabel, passwordPlaceholder,
  confirmPasswordLabel, confirmPasswordPlaceholder,
  notificationPreference: { label, email, sms, both },
  termsConsent: { text, termsLink, privacyLink },
  submitButton, alreadyHaveAccount, signIn,
  passwordRequirements: { minLength, uppercase, lowercase, number, special },
},
confirmSignUp: {
  title, subtitle, codeSentTo, otpLabel, verifyButton,
  resendCode, resendCooldown, backToRegister,
},
newPassword: {
  title, subtitle, invitedBy, newPasswordLabel, confirmPasswordLabel, submitButton,
},
mfaVerify: {
  titleTotp, titleSms, smsSentTo, otpLabel, verifyButton,
  resendSms, useAuthApp, backToLogin,
},
mfaSetup: {
  title, subtitle, scanQrInstruction, manualKeyInstruction, otpLabel,
  activateButton, appsTitle, apps: { google, authy, microsoft },
},
forgotPassword: {
  title, subtitle, identifierLabel, identifierPlaceholder, sendCodeButton, backToLogin,
},
confirmForgotPassword: {
  title, codeSentTo, codeLabel, newPasswordLabel, confirmPasswordLabel,
  changePasswordButton, resendCode,
},
errors: {
  notAuthorized, userNotFound, codeMismatch, expiredCode,
  invalidPassword, networkError, unknownError,
  passwordMismatch, passwordTooWeak, identifierRequired,
  phoneInvalid, termsRequired,
},
identifierInput: {
  detectingEmail, detectingPhone, switchToEmail, switchToPhone,
},
```

---

## Parte 8 — Flujo de Navegación Completo

```
[Landing] → "Acceder" → [Login]
                              │
              ┌───────────────┼──────────────────────┐
              │               │                      │
      [Email/Phone]    [Social Provider]      [Crear cuenta]
      [+ Password]            │                      │
              │               │                [Register]
              │           OAuth Redirect              │
              │           ↓                  [ConfirmSignUp]
              │           [Callback]                  │
              │               │                      │
              ├───────────────┘                      │
              ↓                                      ↓
    Challenge result:                          Challenge result:
              │                                      │
    ┌─────────┴──────────┐                   ┌──────┴───────┐
    │                    │                   │              │
[NEW_PASSWORD]    [MFA_SETUP]          [MFA_SETUP]   (auto-login)
    │                    │                   │
[NewPassword]    [MfaSetup]          [MfaSetup]
    │                    │                   │
    └──────┬─────────────┘                   │
           ↓                                 │
    [MfaVerify] ←───────────────────────────┘
      (TOTP/SMS)
           │
           ↓
     [Dashboard] ✅

[Login] → "Olvidé contraseña" → [ForgotPassword]
                                      │
                                      ↓
                              [ConfirmForgotPassword]
                                      │
                                      ↓
                                  [Login]
```

---

## Parte 9 — Orden de Implementación

### Fase 1: CDK + Config (prerequisito — sin recrear pool)

1. Modificar `infra/lib/versions/v1/cognito-stack.ts` → solo actualizar `callbackUrls` y `logoutUrls` en `UserPoolClient`
2. `cdk deploy` — solo actualiza el cliente OAuth, pool y usuarios intactos
3. Configurar `client/main/.env` con Pool ID y Client ID (ya existen, solo hay que exponerlos como `EXPO_PUBLIC_*`)
4. Agregar dependencias al pnpm catalog + instalar

### Fase 2: Dominio y Aplicación

5. `domain/entities/` — `user.ts`, `auth-session.ts`
6. `domain/value-objects/` — `identifier.ts`, `phone-number.ts`, `password.ts`
7. `domain/repositories/auth-repository.port.ts`
8. `domain/errors/auth-errors.ts`
9. `application/use-cases/` — todos los use cases (sin infraestructura)

### Fase 3: Infraestructura

10. `infrastructure/cognito/cognito-config.ts`
11. `infrastructure/cognito/pkce-utils.ts`
12. `infrastructure/cognito/cognito-auth-repository.ts` — adaptador completo
13. `app/providers/auth-provider.tsx` — provider + context

### Fase 4: i18n

14. Extender `login` namespace en ES + EN con todas las nuevas claves

### Fase 5: Átomos y Moléculas nuevas

15. `atoms/otp-input/` (shared)
16. `atoms/phone-input/` (shared)
17. `atoms/password-strength/` (shared)
18. `atoms/qr-code/` (shared — react-native-qrcode-svg funciona en ambos)
19. `molecules/identifier-input/` (shared)
20. `molecules/terms-consent/` (shared)
21. `molecules/notification-preference/` (shared)

### Fase 6: Templates

22. Actualizar `login-template/` (identifier-input)
23. Reemplazar `register-template/` (formulario completo)
24. Nuevo `confirm-sign-up-template/`
25. Reemplazar `forgot-password-template/` (paso 1)
26. Nuevo `confirm-forgot-password-template/` (paso 2)
27. Nuevo `new-password-template/`
28. Nuevo `mfa-verify-template/`
29. Nuevo `mfa-setup-template/`

### Fase 7: Rutas + Páginas

30. `app/auth/register/confirm/index.tsx`
31. `app/auth/forgot-password/confirm/index.tsx`
32. `app/auth/new-password/index.tsx`
33. `app/auth/mfa/index.tsx`
34. `app/auth/mfa/setup/index.tsx`
35. `app/auth/callback/index.tsx`
36. Actualizar `app/auth/login/index.tsx` y `app/auth/register/index.tsx`
37. Guards en `_layout.tsx` de auth y dashboard

### Fase 8: Tests

38. Tests de value-objects (identifier, phone-number, password)
39. Tests de use-cases (mock del repository port)
40. Tests de componentes clave (OtpInput, IdentifierInput, PhoneInput)
41. Tests de templates (renderizado, interacción)

---

## Decisiones Técnicas

| Tema                 | Decisión                                                         | Razón                                                       |
| -------------------- | ---------------------------------------------------------------- | ----------------------------------------------------------- |
| SDK auth             | `amazon-cognito-identity-js`                                     | SRP sin exponer secret; funciona en RN + web                |
| Social OAuth         | `expo-auth-session`                                              | Abstracción unificada web + mobile para PKCE                |
| Deep links mobile    | `expo-linking` + scheme `com.financialmanagement.app`            | Callback nativo post-OAuth                                  |
| Phone parsing        | `libphonenumber-js/min`                                          | Validación E.164, country detection, bundle size optimizado |
| QR Code              | `react-native-qrcode-svg`                                        | Funciona en web y native con expo                           |
| Token storage        | `expo-secure-store` (mobile) + `AsyncStorage` (web con polyfill) | Seguro en cada plataforma                                   |
| State                | React Context (`AuthProvider`)                                   | Sin overhead de redux; complejidad media                    |
| Identifier detection | Heurística + `libphonenumber-js`                                 | Igual que WhatsApp/Telegram                                 |

---

## Notas sobre `infra/PROVIDERS_SETUP_GUIDE.md`

El PROVIDERS_SETUP_GUIDE no requiere cambios de contenido. Lo que sí falta documentar allí:

1. **Sección nueva: Callback URLs para mobile** — añadir deep-link scheme `com.financialmanagement.app://auth/callback` en cada provider (Google, Facebook, Apple, Microsoft)
2. **Sección nueva: Variables de entorno del cliente** — `EXPO_PUBLIC_*` vars para el SDK en el cliente
3. **Estado de implementación**: Los providers están creados en AWS pero pendiente: configurar las redirect URIs reales en cada provider dashboard (Google Console, Meta Developers, Apple, Azure AD) ya que actualmente solo tienen valores `dummy-*`

---

## Variables de Entorno Necesarias

```bash
# client/main/.env (y .env.development, .env.production)
EXPO_PUBLIC_COGNITO_USER_POOL_ID=us-east-1_YBTSdZtSv
EXPO_PUBLIC_COGNITO_CLIENT_ID=1679si1acsna32aui1qt91nht0
EXPO_PUBLIC_COGNITO_DOMAIN=fm-migudev-dev-auth.auth.us-east-1.amazoncognito.com
EXPO_PUBLIC_COGNITO_REGION=us-east-1
EXPO_PUBLIC_APP_URL_SCHEME=com.financialmanagement.app
EXPO_PUBLIC_APP_URL=http://localhost:8081
```
