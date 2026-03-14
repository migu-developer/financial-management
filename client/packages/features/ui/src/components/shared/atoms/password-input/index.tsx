import React, { useState } from 'react';
import { TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { textTokens, uiTokens } from '@features/ui/utils/colors';
import { ColorScheme } from '@features/ui/utils/constants';
import { useThemeActions } from '@features/ui/contexts/theme-context';
import { useTranslation } from '@packages/i18n';

import { FormInput } from '@features/ui/components/shared/atoms/form-input';
import type { FormInputProps } from '@features/ui/components/shared/atoms/form-input';

type PasswordInputProps = Omit<FormInputProps, 'secureTextEntry' | 'icon'>;

export function PasswordInput(props: PasswordInputProps) {
  const { colorScheme } = useThemeActions();
  const isDark = colorScheme === ColorScheme.DARK;
  const { t } = useTranslation('ui');
  const [visible, setVisible] = useState(false);

  const iconColor = isDark ? uiTokens.moonColor : textTokens.light.muted;

  const eyeIcon = (
    <TouchableOpacity
      onPress={() => setVisible((v) => !v)}
      accessibilityRole="button"
      accessibilityLabel={visible ? t('hidePassword') : t('showPassword')}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      <MaterialCommunityIcons
        name={visible ? 'eye-off' : 'eye'}
        size={20}
        color={iconColor}
      />
    </TouchableOpacity>
  );

  return <FormInput {...props} secureTextEntry={!visible} icon={eyeIcon} />;
}
