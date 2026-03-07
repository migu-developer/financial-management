import { PrivacyTemplate } from '@features/landing/presentation/components/templates/privacy-template';

interface PrivacyPageProps {
  onBackPress?: () => void;
}

export function PrivacyPage({ onBackPress }: PrivacyPageProps) {
  return <PrivacyTemplate onBackPress={onBackPress} />;
}
