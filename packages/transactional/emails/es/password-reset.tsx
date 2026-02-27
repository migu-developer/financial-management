import { Heading, Section, Text } from '@react-email/components';
import { EmailLayout } from '@components/EmailLayout';
import { VerificationCodeBlock } from '@components/VerificationCodeBlock';
import { footerCopy } from './footer-copy';

interface PasswordResetEmailProps {
  verificationCode?: string;
}

export default function PasswordResetEmail({
  verificationCode,
}: PasswordResetEmailProps) {
  return (
    <EmailLayout
      preview="Recupera tu contraseña — Financial Management"
      footer={footerCopy}
    >
      <Section className="py-8 px-8">
        <Heading className="text-primary-dark text-2xl font-bold m-0 mb-2">
          Recuperación de contraseña
        </Heading>
        <Text className="text-neutral-600 text-base leading-relaxed mt-4 mb-6 m-0">
          Hemos recibido una solicitud para restablecer tu contraseña. Usa el
          siguiente código para continuar con el proceso de recuperación. Si no
          fuiste tú quien inició este proceso, puedes ignorar este correo.
        </Text>

        <VerificationCodeBlock
          label="Código para restablecer tu contraseña"
          code={verificationCode}
          hint="Válido durante 10 minutos"
        />

        <Text className="text-neutral-500 text-sm leading-relaxed m-0">
          Por seguridad, te recomendamos elegir una contraseña única y no
          reutilizarla en otros servicios.
        </Text>
      </Section>
    </EmailLayout>
  );
}

PasswordResetEmail.PreviewProps = {
  verificationCode: '304952',
} satisfies PasswordResetEmailProps;
