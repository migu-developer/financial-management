import { Heading, Section, Text } from '@react-email/components';
import { EmailLayout } from '@components/EmailLayout';
import { footerCopy } from './footer-copy';

interface AdminInvitationEmailProps {
  username?: string;
  temporaryPassword?: string;
}

export default function AdminInvitationEmail({
  username,
  temporaryPassword,
}: AdminInvitationEmailProps) {
  return (
    <EmailLayout
      preview="You've been invited to Financial Management"
      footer={footerCopy}
    >
      <Section className="py-8 px-8">
        <Heading className="text-primary-dark text-2xl font-bold m-0 mb-2">
          An account has been created for you
        </Heading>
        <Text className="text-neutral-600 text-base leading-relaxed mt-4 mb-6 m-0">
          An administrator has invited you to Financial Management. We&apos;ve
          created an account for you. Use the following temporary credentials to
          sign in for the first time.
        </Text>

        <Section className="bg-primary-pale rounded-2xl py-6 px-6 my-6 border border-primary-light">
          <Text className="text-neutral-600 text-sm font-medium m-0 mb-2">
            Sign-in credentials
          </Text>
          <Text className="text-neutral-700 text-sm m-0 mb-1">
            <strong>Username:</strong> {username}
          </Text>
          <Text className="text-neutral-700 text-sm m-0 mb-3">
            <strong>Temporary password:</strong> {temporaryPassword}
          </Text>
          <Text className="text-neutral-500 text-xs m-0 mt-1">
            For security, you will be asked to change your password on first
            sign-in.
          </Text>
        </Section>

        <Text className="text-neutral-500 text-sm leading-relaxed m-0">
          If you don&apos;t recognize this invitation, please contact the person
          or team that manages your access before continuing.
        </Text>
      </Section>
    </EmailLayout>
  );
}

AdminInvitationEmail.PreviewProps = {
  username: 'user.example',
  temporaryPassword: 'Temp-1234',
} satisfies AdminInvitationEmailProps;
