import React, { useRef, useState } from 'react';
import { Dimensions, Modal, Pressable, Text, View } from 'react-native';

import { resources, useTranslation } from '@packages/i18n';
import type { SupportedLanguage } from '@packages/i18n';
import { width } from '@features/ui/utils/spacing';

const LANGUAGES = Object.keys(resources) as SupportedLanguage[];

export function LanguageSelector() {
  const { t, i18n } = useTranslation('ui');
  const currentLang = i18n.language as SupportedLanguage;
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, right: 0 });
  const triggerRef = useRef<View>(null);

  const handleOpen = () => {
    if (triggerRef.current) {
      triggerRef.current.measureInWindow((x, y, w, h) => {
        setDropdownPos({
          top: y + h + 4,
          right: Dimensions.get('window').width - (x + w),
        });
        setIsOpen(true);
      });
    }
  };

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
    <View>
      <Pressable
        ref={triggerRef}
        onPress={handleOpen}
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

      <Modal
        visible={isOpen}
        transparent
        animationType="none"
        onRequestClose={() => setIsOpen(false)}
      >
        <Pressable style={{ flex: 1 }} onPress={() => setIsOpen(false)}>
          <View
            className="absolute bg-white dark:bg-slate-800 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700"
            style={{
              top: dropdownPos.top,
              right: dropdownPos.right,
              minWidth: width.xxxs.small,
            }}
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
        </Pressable>
      </Modal>
    </View>
  );
}
