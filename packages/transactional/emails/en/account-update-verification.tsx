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
      preview="Confirm your account changes — Financial Management"
      footer={footerCopy}
    >
      <Section className="py-8 px-8">
        <Heading className="text-primary-dark text-2xl font-bold m-0 mb-2">
          Verify a change to your account
        </Heading>
        <Text className="text-neutral-600 text-base leading-relaxed mt-4 mb-6 m-0">
          We detected an update to your account information. To confirm you made
          this change, enter the following code when prompted.
        </Text>

        <VerificationCodeBlock
          label="Change verification code"
          code={verificationCode}
          hint="Valid for 10 minutes"
        />

        <Text className="text-neutral-500 text-sm leading-relaxed m-0">
          If you don&apos;t recognize this change, we recommend not using the
          code and contacting support right away to review your account
          security.
        </Text>
      </Section>
    </EmailLayout>
  );
}

AccountUpdateVerificationEmail.PreviewProps = {
  verificationCode: '771204',
} satisfies AccountUpdateVerificationEmailProps;
