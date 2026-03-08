import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { resources, useTranslation } from '@packages/i18n';
import type { SupportedLanguage } from '@packages/i18n';

const LANGUAGES = Object.keys(resources) as SupportedLanguage[];

export function LanguageSelector() {
  const { t, i18n } = useTranslation('ui');
  const currentLang = i18n.language as SupportedLanguage;
  const [isOpen, setIsOpen] = useState(false);

  const handleSelect = (lang: SupportedLanguage) => {
    i18n.changeLanguage(lang);
    setIsOpen(false);
  };

  const getLangName = (lang: string): string =>
    i18n.t(`languageSelector.languages.${lang}`, {
      ns: 'ui',
      defaultValue: lang.toUpperCase(),
    });

  return (
    <View style={{ position: 'relative', zIndex: 50 }}>
      <Pressable
        onPress={() => setIsOpen((v) => !v)}
        className="h-9 px-3 rounded-xl flex-row items-center gap-1 bg-slate-200/60 dark:bg-slate-700/60"
        accessibilityRole="button"
        accessibilityLabel={t('languageSelector.label')}
        accessibilityState={{ expanded: isOpen }}
      >
        <Text className="text-slate-900 dark:text-white text-xs font-bold">
          {currentLang.slice(0, 2).toUpperCase()}
        </Text>
        <Text className="text-slate-600 dark:text-slate-300 text-xs">
          {isOpen ? '▴' : '▾'}
        </Text>
      </Pressable>

      {isOpen && (
        <View
          className="absolute right-0 bg-white dark:bg-slate-800 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700"
          style={{ top: 40, minWidth: 140, zIndex: 100 }}
        >
          {LANGUAGES.map((lang) => (
            <Pressable
              key={lang}
              onPress={() => handleSelect(lang)}
              className={`px-4 py-3 flex-row items-center justify-between ${
                lang === currentLang ? 'bg-slate-100 dark:bg-slate-700' : ''
              }`}
              accessibilityRole="menuitem"
              accessibilityLabel={getLangName(lang)}
            >
              <Text
                className={`text-sm font-medium ${
                  lang === currentLang
                    ? 'text-slate-900 dark:text-white'
                    : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                {getLangName(lang)}
              </Text>
              {lang === currentLang && (
                <Text className="text-emerald-400 text-xs ml-2">✓</Text>
              )}
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}
