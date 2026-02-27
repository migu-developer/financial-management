import { Heading, Section, Text } from '@react-email/components';
import { EmailLayout } from '@components/EmailLayout';
import { VerificationCodeBlock } from '@components/VerificationCodeBlock';
import { footerCopy } from './footer-copy';

interface AttributeVerificationEmailProps {
  verificationCode?: string;
}

export default function AttributeVerificationEmail({
  verificationCode,
}: AttributeVerificationEmailProps) {
  return (
    <EmailLayout
      preview="Verify your information — Financial Management"
      footer={footerCopy}
    >
      <Section className="py-8 px-8">
        <Heading className="text-primary-dark text-2xl font-bold m-0 mb-2">
          Verify your contact information
        </Heading>
        <Text className="text-neutral-600 text-base leading-relaxed mt-4 mb-6 m-0">
          To complete verification of the information linked to your account
          (such as your email or phone number), enter the following code when
          prompted.
        </Text>

        <VerificationCodeBlock
          label="Verification code"
          code={verificationCode}
          hint="Valid for 10 minutes"
        />

        <Text className="text-neutral-500 text-sm leading-relaxed m-0">
          If you didn&apos;t request this verification, you can ignore this
          email. Your account will continue to work with your previously
          verified information.
        </Text>
      </Section>
    </EmailLayout>
  );
}

AttributeVerificationEmail.PreviewProps = {
  verificationCode: '559018',
} satisfies AttributeVerificationEmailProps;
