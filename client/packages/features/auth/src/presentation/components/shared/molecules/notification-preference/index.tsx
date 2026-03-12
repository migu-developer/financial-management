import React, { useCallback } from 'react';
import { Text, View } from 'react-native';

import { useTranslation } from '@packages/i18n';
import { primary } from '@features/ui/utils/colors';
import { SelectableOption } from '@features/ui';

export enum NotificationChannelEnum {
  EMAIL = 'email',
  SMS = 'sms',
  BOTH = 'both',
}

export type NotificationChannel =
  (typeof NotificationChannelEnum)[keyof typeof NotificationChannelEnum];

export interface NotificationPreferenceProps {
  value: NotificationChannel;
  onChange: (channel: NotificationChannel) => void;
  disabled?: boolean;
}

const OPTIONS: NotificationChannel[] = [
  NotificationChannelEnum.EMAIL,
  NotificationChannelEnum.SMS,
  NotificationChannelEnum.BOTH,
];

export function NotificationPreference({
  value,
  onChange,
  disabled = false,
}: NotificationPreferenceProps) {
  const { t } = useTranslation('login');

  const handleSelect = useCallback(
    (channel: NotificationChannel) => {
      if (!disabled) onChange(channel);
    },
    [disabled, onChange],
  );

  return (
    <View className="mb-4">
      <Text className="text-slate-600 dark:text-slate-300 text-sm font-medium mb-2">
        {t('register.notificationPreference')}
      </Text>

      <View className="flex-row gap-2">
        {OPTIONS.map((option) => {
          const selected = value === option;
          return (
            <SelectableOption
              key={option}
              selected={selected}
              selectedIcon="radiobox-marked"
              unselectedIcon="radiobox-blank"
              iconSize={16}
              selectedIconColor={primary[500]}
              onPress={() => handleSelect(option)}
              disabled={disabled}
              className={`flex-row items-center gap-1 px-3 py-2 rounded-xl border ${
                selected
                  ? 'border-primary-400 bg-primary-50 dark:bg-primary-900/20'
                  : 'border-slate-200 dark:border-slate-700'
              } ${disabled ? 'opacity-50' : ''}`}
              accessibilityRole="radio"
              accessibilityLabel={option}
              testID={`notification-option-${option}`}
            >
              <Text
                className={`text-sm ${
                  selected
                    ? 'text-primary-600 dark:text-primary-400 font-medium'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                {option === NotificationChannelEnum.EMAIL
                  ? t('register.emailLabel')
                  : option === NotificationChannelEnum.SMS
                    ? t('register.smsLabel')
                    : t('register.notificationBoth')}
              </Text>
            </SelectableOption>
          );
        })}
      </View>
    </View>
  );
}
