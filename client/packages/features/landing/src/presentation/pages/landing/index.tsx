import { LandingTemplate } from '@features/landing/presentation/components/templates/landing-template';

interface LandingPageProps {
  onNavigateToAuth: () => void;
  onNavigateToPrivacy?: () => void;
  onNavigateToTerms?: () => void;
  onNavigateToContact?: () => void;
}

export function LandingPage({
  onNavigateToAuth,
  onNavigateToPrivacy,
  onNavigateToTerms,
  onNavigateToContact,
}: LandingPageProps) {
  return (
    <LandingTemplate
      onLoginPress={onNavigateToAuth}
      onGetStartedPress={onNavigateToAuth}
      onPrivacyPress={onNavigateToPrivacy}
      onTermsPress={onNavigateToTerms}
      onContactPress={onNavigateToContact}
    />
  );
}
