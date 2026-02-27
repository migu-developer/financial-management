import { Heading, Section, Text } from '@react-email/components';
import { EmailLayout } from '@components/EmailLayout';
import { VerificationCodeBlock } from '@components/VerificationCodeBlock';
import { footerCopy } from './footer-copy';

interface ResendVerificationCodeEmailProps {
  verificationCode?: string;
}

export default function ResendVerificationCodeEmail({
  verificationCode,
}: ResendVerificationCodeEmailProps) {
  return (
    <EmailLayout
      preview="Your new verification code — Financial Management"
      footer={footerCopy}
    >
      <Section className="py-8 px-8">
        <Heading className="text-primary-dark text-2xl font-bold m-0 mb-2">
          Here&apos;s your new code
        </Heading>
        <Text className="text-neutral-600 text-base leading-relaxed mt-4 mb-6 m-0">
          You requested a new verification code. Use the code below to continue
          with the pending process. If you didn&apos;t request it, you can
          ignore this email.
        </Text>

        <VerificationCodeBlock
          label="New verification code"
          code={verificationCode}
          hint="Valid for 10 minutes"
        />

        <Text className="text-neutral-500 text-sm leading-relaxed m-0">
          If you receive multiple emails, you only need to use the most recent
          code we sent you.
        </Text>
      </Section>
    </EmailLayout>
  );
}

ResendVerificationCodeEmail.PreviewProps = {
  verificationCode: '842193',
} satisfies ResendVerificationCodeEmailProps;
