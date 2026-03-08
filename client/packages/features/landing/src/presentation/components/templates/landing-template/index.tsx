import React, { useRef } from 'react';
import { ScrollView, View } from 'react-native';

import { CTASection } from '@features/landing/presentation/components/organisms/cta';
import { FeaturesSection } from '@features/landing/presentation/components/organisms/features';
import { LandingFooter } from '@features/landing/presentation/components/organisms/footer';
import { LandingHeader } from '@features/landing/presentation/components/organisms/header';
import { HeroSection } from '@features/landing/presentation/components/organisms/hero';
import { HowItWorksSection } from '@features/landing/presentation/components/organisms/how-it-works';

interface LandingTemplateProps {
  onLoginPress?: () => void;
  onGetStartedPress?: () => void;
  onPrivacyPress?: () => void;
  onTermsPress?: () => void;
  onContactPress?: () => void;
}

const assetsUrl = process.env.EXPO_PUBLIC_ASSETS_URL ?? '';
const logoUrl = `${assetsUrl}/financial-management/300x300.webp`;

export function LandingTemplate({
  onLoginPress,
  onGetStartedPress,
  onPrivacyPress,
  onTermsPress,
  onContactPress,
}: LandingTemplateProps) {
  const scrollViewRef = useRef<ScrollView>(null);
  const featuresSectionY = useRef<number>(0);
  const howItWorksSectionY = useRef<number>(0);

  const scrollToFeatures = () => {
    scrollViewRef.current?.scrollTo({
      y: featuresSectionY.current,
      animated: true,
    });
  };

  const scrollToHowItWorks = () => {
    scrollViewRef.current?.scrollTo({
      y: howItWorksSectionY.current,
      animated: true,
    });
  };

  return (
    <View className="flex-1 bg-slate-50 dark:bg-slate-900">
      <ScrollView
        ref={scrollViewRef}
        stickyHeaderIndices={[0]}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ flexGrow: 1 }}
        accessibilityRole="scrollbar"
      >
        {/* Sticky header (index 0) */}
        <LandingHeader
          onLoginPress={onLoginPress}
          onFeaturesPress={scrollToFeatures}
          onHowItWorksPress={scrollToHowItWorks}
          logoUrl={logoUrl ?? ''}
        />

        {/* Hero */}
        <HeroSection
          onGetStartedPress={onGetStartedPress}
          onFeaturesPress={scrollToFeatures}
        />

        {/* Features — track y position for scroll-to */}
        <View
          onLayout={(e) => {
            featuresSectionY.current = e.nativeEvent.layout.y;
          }}
        >
          <FeaturesSection />
        </View>

        {/* How it works — track y position for scroll-to */}
        <View
          onLayout={(e) => {
            howItWorksSectionY.current = e.nativeEvent.layout.y;
          }}
        >
          <HowItWorksSection />
        </View>

        <CTASection onGetStartedPress={onGetStartedPress} />
        <LandingFooter
          logoUrl={logoUrl ?? ''}
          onPrivacyPress={onPrivacyPress}
          onTermsPress={onTermsPress}
          onContactPress={onContactPress}
        />
      </ScrollView>
    </View>
  );
}
