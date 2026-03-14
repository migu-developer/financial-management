import React, { useRef, useState } from 'react';
import { Dimensions, Modal, Pressable, Text, View } from 'react-native';

import { resources, useTranslation } from '@packages/i18n';
import type { SupportedLanguage } from '@packages/i18n';
import { Icon } from '@features/ui/components/shared/atoms/icon';
import { useThemeActions } from '@features/ui/contexts/theme-context';
import { textTokens } from '@features/ui/utils/colors';
import { ColorScheme } from '@features/ui/utils/constants';
import { space, width } from '@features/ui/utils/spacing';

const LANGUAGES = Object.keys(resources) as SupportedLanguage[];

export function LanguageSelector() {
  const { t, i18n } = useTranslation('ui');
  const { colorScheme } = useThemeActions();
  const currentLang = i18n.language as SupportedLanguage;
  const [isOpen, setIsOpen] = useState(false);
  const isDark = colorScheme === ColorScheme.DARK;
  const chevronColor = isDark
    ? textTokens.dark.secondary
    : textTokens.light.secondary;
  const [dropdownPos, setDropdownPos] = useState<{
    top: number;
    right: number;
  }>({
    top: space.zero,
    right: space.zero,
  });
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
        <Icon
          name={isOpen ? 'expand-less' : 'expand-more'}
          size={18}
          color={chevronColor}
        />
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
