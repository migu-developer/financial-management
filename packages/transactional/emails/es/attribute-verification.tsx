import { Heading, Section, Text } from '@react-email/components';
import { EmailLayout } from '@components/EmailLayout';
import { VerificationCodeBlock } from '@components/VerificationCodeBlock';
import { COGNITO_CODE_PLACEHOLDER } from '@utils/constants';
import { footerCopy } from './footer-copy';

interface AttributeVerificationEmailProps {
  verificationCode?: string;
}

export default function AttributeVerificationEmail({
  verificationCode,
}: AttributeVerificationEmailProps) {
  return (
    <EmailLayout
      preview="Verifica tu información — Financial Management"
      footer={footerCopy}
    >
      <Section className="py-8 px-8">
        <Heading className="text-primary-dark text-2xl font-bold m-0 mb-2">
          Verifica tu información de contacto
        </Heading>
        <Text className="text-neutral-600 text-base leading-relaxed mt-4 mb-6 m-0">
          Para completar la verificación de la información asociada a tu cuenta
          (como tu correo electrónico o número de teléfono), introduce el
          siguiente código cuando te lo solicitemos.
        </Text>

        <VerificationCodeBlock
          label="Código de verificación"
          code={verificationCode ?? COGNITO_CODE_PLACEHOLDER}
          hint="Válido durante 10 minutos"
        />

        <Text className="text-neutral-500 text-sm leading-relaxed m-0">
          Si no has solicitado esta verificación, puedes ignorar este correo. Tu
          cuenta seguirá funcionando con la información previamente verificada.
        </Text>
      </Section>
    </EmailLayout>
  );
}

AttributeVerificationEmail.PreviewProps = {
  verificationCode: COGNITO_CODE_PLACEHOLDER,
} satisfies AttributeVerificationEmailProps;
