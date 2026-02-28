import { Heading, Section, Text } from '@react-email/components';
import { EmailLayout } from '@components/EmailLayout';
import { VerificationCodeBlock } from '@components/VerificationCodeBlock';
import { COGNITO_CODE_PLACEHOLDER } from '@utils/constants';
import { footerCopy } from './footer-copy';

interface PasswordResetEmailProps {
  verificationCode: string;
}

export default function PasswordResetEmail({
  verificationCode,
}: PasswordResetEmailProps) {
  return (
    <EmailLayout
      preview="Reset your password — Financial Management"
      footer={footerCopy}
    >
      <Section className="py-8 px-8">
        <Heading className="text-primary-dark text-2xl font-bold m-0 mb-2">
          Password recovery
        </Heading>
        <Text className="text-neutral-600 text-base leading-relaxed mt-4 mb-6 m-0">
          We received a request to reset your password. Use the code below to
          continue with the recovery process. If you didn&apos;t start this, you
          can ignore this email.
        </Text>

        <VerificationCodeBlock
          label="Password reset code"
          code={verificationCode}
          hint="Valid for 10 minutes"
        />

        <Text className="text-neutral-500 text-sm leading-relaxed m-0">
          For security, we recommend using a unique password and not reusing it
          on other services.
        </Text>
      </Section>
    </EmailLayout>
  );
}

PasswordResetEmail.PreviewProps = {
  verificationCode: COGNITO_CODE_PLACEHOLDER,
} satisfies PasswordResetEmailProps;
