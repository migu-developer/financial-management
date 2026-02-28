import { Heading, Section, Text } from '@react-email/components';
import { EmailLayout } from '@components/EmailLayout';
import { VerificationCodeBlock } from '@components/VerificationCodeBlock';
import { COGNITO_CODE_PLACEHOLDER } from '@utils/constants';
import { footerCopy } from './footer-copy';

interface AccountVerificationEmailProps {
  verificationCode: string;
}

export default function AccountVerificationEmail({
  verificationCode,
}: AccountVerificationEmailProps) {
  return (
    <EmailLayout
      preview="Verify your email — Financial Management"
      footer={footerCopy}
    >
      <Section className="py-8 px-8">
        <Heading className="text-primary-dark text-2xl font-bold m-0 mb-2">
          Verify your email address
        </Heading>
        <Text className="text-neutral-600 text-base leading-relaxed mt-4 mb-6 m-0">
          Thanks for signing up for Financial Management. To continue, we need
          to confirm it&apos;s you. Enter the following code when prompted. If
          you didn&apos;t request this account, you can ignore this message.
        </Text>

        <VerificationCodeBlock
          label="Verification code"
          code={verificationCode}
          hint="Valid for 10 minutes"
        />

        <Text className="text-neutral-500 text-sm leading-relaxed m-0">
          For your security, never share this code with anyone. We will never
          ask for your password or banking details by email.
        </Text>
      </Section>
    </EmailLayout>
  );
}

AccountVerificationEmail.PreviewProps = {
  verificationCode: COGNITO_CODE_PLACEHOLDER,
} satisfies AccountVerificationEmailProps;
