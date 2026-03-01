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
      preview="Your sign-in code — Financial Management"
      footer={footerCopy}
    >
      <Section className="py-8 px-8">
        <Heading className="text-primary-dark text-2xl font-bold m-0 mb-2">
          Your sign-in verification code
        </Heading>
        <Text className="text-neutral-600 text-base leading-relaxed mt-4 mb-6 m-0">
          Someone is trying to sign in to your Financial Management account.
          Enter the following code when prompted to complete sign-in. If you
          didn&apos;t request this, you can ignore this message and secure your
          account.
        </Text>

        <VerificationCodeBlock
          label="Sign-in code"
          code={verificationCode}
          hint="Valid for a few minutes"
        />

        <Text className="text-neutral-500 text-sm leading-relaxed m-0">
          Never share this code with anyone. We will never ask for it by email
          or phone.
        </Text>
      </Section>
    </EmailLayout>
  );
}

MfaAuthenticationEmail.PreviewProps = {
  verificationCode: COGNITO_CODE_PLACEHOLDER,
} satisfies MfaAuthenticationEmailProps;
