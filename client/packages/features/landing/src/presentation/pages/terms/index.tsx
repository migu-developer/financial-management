import { TermsTemplate } from '@features/landing/presentation/components/templates/terms-template';

interface TermsPageProps {
  onBackPress?: () => void;
}

export function TermsPage({ onBackPress }: TermsPageProps) {
  return <TermsTemplate onBackPress={onBackPress} />;
}
