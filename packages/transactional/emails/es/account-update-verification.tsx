import { Heading, Section, Text } from '@react-email/components';
import { EmailLayout } from '@components/EmailLayout';
import { VerificationCodeBlock } from '@components/VerificationCodeBlock';
import { footerCopy } from './footer-copy';

interface AccountUpdateVerificationEmailProps {
  verificationCode?: string;
}

export default function AccountUpdateVerificationEmail({
  verificationCode,
}: AccountUpdateVerificationEmailProps) {
  return (
    <EmailLayout
      preview="Confirma los cambios de tu cuenta — Financial Management"
      footer={footerCopy}
    >
      <Section className="py-8 px-8">
        <Heading className="text-primary-dark text-2xl font-bold m-0 mb-2">
          Verifica un cambio en tu cuenta
        </Heading>
        <Text className="text-neutral-600 text-base leading-relaxed mt-4 mb-6 m-0">
          Hemos detectado una actualización en la información de tu cuenta. Para
          confirmar que fuiste tú quien realizó este cambio, introduce el
          siguiente código cuando te lo solicitemos.
        </Text>

        <VerificationCodeBlock
          label="Código de verificación del cambio"
          code={verificationCode}
          hint="Válido durante 10 minutos"
        />

        <Text className="text-neutral-500 text-sm leading-relaxed m-0">
          Si no reconoces este cambio, te recomendamos no usar el código y
          contactar inmediatamente con soporte para revisar la seguridad de tu
          cuenta.
        </Text>
      </Section>
    </EmailLayout>
  );
}

AccountUpdateVerificationEmail.PreviewProps = {
  verificationCode: '771204',
} satisfies AccountUpdateVerificationEmailProps;
