import { Heading, Section, Text } from '@react-email/components';
import { EmailLayout } from '@components/EmailLayout';
import { VerificationCodeBlock } from '@components/VerificationCodeBlock';
import { COGNITO_CODE_PLACEHOLDER } from '@utils/constants';
import { footerCopy } from './footer-copy';

interface ResendVerificationCodeEmailProps {
  verificationCode: string;
}

export default function ResendVerificationCodeEmail({
  verificationCode,
}: ResendVerificationCodeEmailProps) {
  return (
    <EmailLayout
      preview="Tu nuevo código de verificación — Financial Management"
      footer={footerCopy}
    >
      <Section className="py-8 px-8">
        <Heading className="text-primary-dark text-2xl font-bold m-0 mb-2">
          Aquí tienes tu nuevo código
        </Heading>
        <Text className="text-neutral-600 text-base leading-relaxed mt-4 mb-6 m-0">
          Has solicitado un nuevo código de verificación. Usa el siguiente
          código para continuar con el proceso pendiente. Si no fuiste tú quien
          lo solicitó, puedes ignorar este correo.
        </Text>

        <VerificationCodeBlock
          label="Nuevo código de verificación"
          code={verificationCode}
          hint="Válido durante 10 minutos"
        />

        <Text className="text-neutral-500 text-sm leading-relaxed m-0">
          Si recibes varios correos, solo necesitas usar el código más reciente
          que te hayamos enviado.
        </Text>
      </Section>
    </EmailLayout>
  );
}

ResendVerificationCodeEmail.PreviewProps = {
  verificationCode: COGNITO_CODE_PLACEHOLDER,
} satisfies ResendVerificationCodeEmailProps;
