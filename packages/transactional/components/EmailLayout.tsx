import type { ReactNode } from 'react';
import {
  Body,
  Column,
  Container,
  Head,
  Html,
  Link,
  Preview,
  Row,
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
    <Section
      className="bg-primary-dark py-6 px-6"
      style={{ width: '100%', minWidth: '100%' }}
    >
      <Row style={{ width: '100%', minWidth: '100%' }}>
        <Column align="center" style={{ textAlign: 'center' }}>
          <img
            src={`${baseUrl}/financial-management/300x300.webp`}
            width={80}
            height={80}
            alt="Financial Management"
            style={{ display: 'block', margin: '0 auto', borderRadius: '16px' }}
          />
        </Column>
      </Row>
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

const responsiveStyles = `
  .email-container {
    border-radius: 16px;
    -webkit-border-radius: 16px;
    overflow: hidden;
  }
  @media only screen and (max-width: 620px) {
    .email-container {
      width: 100% !important;
      max-width: 100% !important;
    }
  }
`;

export function EmailLayout({ preview, children, footer }: EmailLayoutProps) {
  return (
    <Html>
      <Head>
        <style dangerouslySetInnerHTML={{ __html: responsiveStyles }} />
      </Head>
      <Tailwind config={tailwindConfig}>
        <Body
          className="bg-neutral-100 font-sans text-neutral-800 antialiased w-full min-h-screen"
          style={{
            padding: '24px 16px',
            width: '100%',
            margin: 0,
            boxSizing: 'border-box',
          }}
        >
          <Preview>{preview}</Preview>
          <Container
            width={600}
            className="email-container w-[600px] max-w-[600px] mx-auto my-0 p-0 bg-white overflow-hidden"
            style={{
              boxSizing: 'border-box',
              borderRadius: '16px',
              border: '1px solid #e5e7eb',
              boxShadow:
                '0 4px 6px -1px rgba(0, 0, 0, 0.08), 0 2px 4px -2px rgba(0, 0, 0, 0.05)',
            }}
          >
            <EmailHeader />
            {children}
            <EmailFooter copy={footer} />
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
