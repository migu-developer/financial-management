import React, { useMemo } from 'react';
import { Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { useTranslation } from '@packages/i18n';
import { generic, success, warning } from '@features/ui/utils/colors';

export interface PasswordStrengthProps {
  password: string;
}

interface Criterion {
  key: string;
  met: boolean;
}

interface StrengthLevel {
  score: number;
  label: string;
  color: string;
}

export function evaluatePasswordStrength(password: string): number {
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  return score;
}

const STRENGTH_COLORS = [
  generic.error, // 0
  generic.error, // 1 — weak
  warning[500], // 2 — fair
  warning[500], // 3 — good
  success[500], // 4
  success[500], // 5 — strong
];

const BAR_COUNT = 4;

export function PasswordStrength({ password }: PasswordStrengthProps) {
  const { t } = useTranslation('login');

  const { score, criteria } = useMemo<{
    score: number;
    criteria: Criterion[];
  }>(() => {
    return {
      score: evaluatePasswordStrength(password),
      criteria: [
        { key: 'minLength', met: password.length >= 8 },
        { key: 'uppercase', met: /[A-Z]/.test(password) },
        { key: 'lowercase', met: /[a-z]/.test(password) },
        { key: 'number', met: /\d/.test(password) },
        { key: 'special', met: /[^A-Za-z0-9]/.test(password) },
      ],
    };
  }, [password]);

  if (!password) return null;

  const strengthColor = STRENGTH_COLORS[score] ?? generic.error;

  const strengthLabel = useMemo<StrengthLevel>(() => {
    if (score <= 1)
      return {
        score,
        label: t('register.passwordStrength.weak'),
        color: generic.error,
      };
    if (score === 2)
      return {
        score,
        label: t('register.passwordStrength.fair'),
        color: warning[500],
      };
    if (score === 3)
      return {
        score,
        label: t('register.passwordStrength.good'),
        color: warning[500],
      };
    return {
      score,
      label: t('register.passwordStrength.strong'),
      color: success[500],
    };
  }, [score, t]);

  const filledBars = Math.ceil((score / 5) * BAR_COUNT);

  return (
    <View className="mt-1 mb-3">
      {/* Strength bars */}
      <View className="flex-row gap-1 mb-1">
        {Array.from({ length: BAR_COUNT }, (_, i) => (
          <View
            key={i}
            className="flex-1 h-1 rounded-full"
            style={{
              backgroundColor: i < filledBars ? strengthColor : generic.subtle,
            }}
          />
        ))}
      </View>

      {/* Strength label */}
      <Text className="text-xs mb-2" style={{ color: strengthLabel.color }}>
        {strengthLabel.label}
      </Text>

      {/* Requirements */}
      <View className="gap-1">
        {criteria.map(({ key, met }) => (
          <View key={key} className="flex-row items-center gap-1">
            <MaterialCommunityIcons
              name={met ? 'check-circle' : 'close-circle'}
              size={14}
              color={met ? success[500] : generic.error}
              accessibilityLabel={
                met
                  ? t('register.passwordStrength.met')
                  : t('register.passwordStrength.notMet')
              }
            />
            <Text className="text-xs text-slate-500 dark:text-slate-400">
              {t(`register.passwordRequirements.${key}`)}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}
