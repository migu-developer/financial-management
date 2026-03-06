import React from 'react';
import { Pressable, Text } from 'react-native';

import { resources, useTranslation } from '@packages/i18n';
import type { SupportedLanguage } from '@packages/i18n';

const LANGUAGES = Object.keys(resources) as SupportedLanguage[];

export function LanguageSelector() {
  const { t, i18n } = useTranslation('ui');
  const currentLang = i18n.language as SupportedLanguage;

  const handlePress = () => {
    const idx = LANGUAGES.indexOf(currentLang);
    const next = LANGUAGES[(idx + 1) % LANGUAGES.length];
    i18n.changeLanguage(next);
  };

  return (
    <Pressable
      onPress={handlePress}
      className="w-9 h-9 rounded-xl items-center justify-center bg-slate-700/60"
      accessibilityRole="button"
      accessibilityLabel={t('languageSelector.label')}
    >
      <Text className="text-white text-xs font-bold">
        {currentLang.slice(0, 2).toUpperCase()}
      </Text>
    </Pressable>
  );
}
