import { LandingTemplate } from '@features/landing/presentation/components/templates/landing-template';

interface LandingPageProps {
  onNavigateToAuth: () => void;
}

export function LandingPage({ onNavigateToAuth }: LandingPageProps) {
  return (
    <LandingTemplate
      onLoginPress={onNavigateToAuth}
      onGetStartedPress={onNavigateToAuth}
    />
  );
}
