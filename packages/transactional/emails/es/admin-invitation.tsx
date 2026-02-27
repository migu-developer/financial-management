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
      preview="Has sido invitado a Financial Management"
      footer={footerCopy}
    >
      <Section className="py-8 px-8">
        <Heading className="text-primary-dark text-2xl font-bold m-0 mb-2">
          Te hemos creado una cuenta
        </Heading>
        <Text className="text-neutral-600 text-base leading-relaxed mt-4 mb-6 m-0">
          Un administrador te ha invitado a Financial Management. Ya hemos
          creado una cuenta para ti. Usa las siguientes credenciales temporales
          para iniciar sesión por primera vez.
        </Text>

        <Section className="bg-primary-pale rounded-2xl py-6 px-6 my-6 border border-primary-light">
          <Text className="text-neutral-600 text-sm font-medium m-0 mb-2">
            Credenciales de acceso
          </Text>
          <Text className="text-neutral-700 text-sm m-0 mb-1">
            <strong>Usuario:</strong> {username}
          </Text>
          <Text className="text-neutral-700 text-sm m-0 mb-3">
            <strong>Contraseña temporal:</strong> {temporaryPassword}
          </Text>
          <Text className="text-neutral-500 text-xs m-0 mt-1">
            Por seguridad, se te pedirá cambiar la contraseña en tu primer
            inicio de sesión.
          </Text>
        </Section>

        <Text className="text-neutral-500 text-sm leading-relaxed m-0">
          Si no reconoces esta invitación, por favor contacta con la persona o
          equipo que administra tu acceso antes de continuar.
        </Text>
      </Section>
    </EmailLayout>
  );
}

AdminInvitationEmail.PreviewProps = {
  username: 'usuario.ejemplo',
  temporaryPassword: 'Temp-1234',
} satisfies AdminInvitationEmailProps;
