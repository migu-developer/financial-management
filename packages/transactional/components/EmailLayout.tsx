import type { ReactNode } from 'react';
import {
  Body,
  Container,
  Head,
  Html,
  Link,
  Preview,
  Section,
  Tailwind,
  Text,
} from '@react-email/components';
import tailwindConfig from '@root/tailwind.config';
import { config } from '@config/index';

const baseUrl = config.ASSETS_URL;
const applicationUrl = config.APPLICATION_URL;

export function EmailHeader() {
  return (
    <Section className="bg-primary-dark py-6 px-6 text-center">
      <img
        src={`${baseUrl}/financial-management/300x300.webp`}
        width={80}
        height={80}
        alt="Financial Management"
        style={{ display: 'block', margin: '0 auto' }}
      />
    </Section>
  );
}

export interface EmailFooterCopy {
  help: string;
  legal: string;
  rights: string;
  privacy: string;
}

export function EmailFooter({ copy }: { copy: EmailFooterCopy }) {
  return (
    <>
      <Section className="py-6 px-8">
        <Text className="text-neutral-500 text-sm m-0">{copy.help}</Text>
      </Section>
      <Text className="text-neutral-400 text-xs my-6 mx-0 px-8 py-0 text-center">
        {copy.legal} {new Date().getFullYear()} {copy.rights}{' '}
        <Link
          href={`${applicationUrl}/privacy/`}
          className="text-link font-medium underline text-xs"
        >
          {copy.privacy}
        </Link>
        .
      </Text>
    </>
  );
}

export interface EmailLayoutProps {
  preview: string;
  children?: ReactNode;
  footer: EmailFooterCopy;
}

export function EmailLayout({ preview, children, footer }: EmailLayoutProps) {
  return (
    <Html>
      <Head />
      <Tailwind config={tailwindConfig}>
        <Body className="bg-neutral-100 font-sans text-neutral-800 antialiased">
          <Preview>{preview}</Preview>
          <Container className="max-w-[600px] mx-auto my-8 p-0 bg-white rounded-2xl overflow-hidden shadow-card-md">
            <EmailHeader />
            {children}
            <EmailFooter copy={footer} />
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
