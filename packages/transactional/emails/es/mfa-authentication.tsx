import { Heading, Section, Text } from '@react-email/components';
import { EmailLayout } from '@components/EmailLayout';
import { VerificationCodeBlock } from '@components/VerificationCodeBlock';
import { COGNITO_CODE_PLACEHOLDER } from '@utils/constants';
import { footerCopy } from './footer-copy';

interface MfaAuthenticationEmailProps {
  verificationCode?: string;
}

export default function MfaAuthenticationEmail({
  verificationCode = COGNITO_CODE_PLACEHOLDER,
}: MfaAuthenticationEmailProps) {
  return (
    <EmailLayout
      preview="Tu código de inicio de sesión — Financial Management"
      footer={footerCopy}
    >
      <Section className="py-8 px-8">
        <Heading className="text-primary-dark text-2xl font-bold m-0 mb-2">
          Tu código de verificación para iniciar sesión
        </Heading>
        <Text className="text-neutral-600 text-base leading-relaxed mt-4 mb-6 m-0">
          Alguien está intentando iniciar sesión en tu cuenta de Financial
          Management. Introduce el siguiente código cuando se te solicite para
          completar el acceso. Si no fuiste tú, puedes ignorar este mensaje y
          asegurar tu cuenta.
        </Text>

        <VerificationCodeBlock
          label="Código de inicio de sesión"
          code={verificationCode}
          hint="Válido por unos minutos"
        />

        <Text className="text-neutral-500 text-sm leading-relaxed m-0">
          No compartas este código con nadie. Nunca te lo pediremos por correo
          ni por teléfono.
        </Text>
      </Section>
    </EmailLayout>
  );
}

MfaAuthenticationEmail.PreviewProps = {
  verificationCode: COGNITO_CODE_PLACEHOLDER,
} satisfies MfaAuthenticationEmailProps;
