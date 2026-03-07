import { ContactTemplate } from '@features/landing/presentation/components/templates/contact-template';

interface ContactPageProps {
  onBackPress?: () => void;
}

export function ContactPage({ onBackPress }: ContactPageProps) {
  return <ContactTemplate onBackPress={onBackPress} />;
}
