import { Heading, Section, Text } from '@react-email/components';
import { EmailLayout } from '@components/EmailLayout';
import { VerificationCodeBlock } from '@components/VerificationCodeBlock';
import { footerCopy } from './footer-copy';

interface AccountVerificationEmailProps {
  verificationCode?: string;
}

export default function AccountVerificationEmail({
  verificationCode,
}: AccountVerificationEmailProps) {
  return (
    <EmailLayout
      preview="Verifica tu correo — Financial Management"
      footer={footerCopy}
    >
      <Section className="py-8 px-8">
        <Heading className="text-primary-dark text-2xl font-bold m-0 mb-2">
          Verifica tu correo electrónico
        </Heading>
        <Text className="text-neutral-600 text-base leading-relaxed mt-4 mb-6 m-0">
          Gracias por registrarte en Financial Management. Para continuar,
          necesitamos confirmar que eres tú. Introduce el siguiente código
          cuando te lo solicitemos. Si no has solicitado esta cuenta, puedes
          ignorar este mensaje.
        </Text>

        <VerificationCodeBlock
          label="Código de verificación"
          code={verificationCode}
          hint="Válido durante 10 minutos"
        />

        <Text className="text-neutral-500 text-sm leading-relaxed m-0">
          Por seguridad, nunca compartas este código con nadie. Nosotros nunca
          te pediremos tu contraseña ni datos bancarios por correo.
        </Text>
      </Section>
    </EmailLayout>
  );
}

AccountVerificationEmail.PreviewProps = {
  verificationCode: '596853',
} satisfies AccountVerificationEmailProps;
