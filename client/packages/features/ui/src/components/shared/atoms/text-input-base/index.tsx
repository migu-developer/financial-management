import React, { useMemo, useState } from 'react';
import type { TextInput as RNTextInput, TextInputProps } from 'react-native';
import { TextInput } from 'react-native';

import {
  generic,
  primary,
  surface,
  textTokens,
} from '@features/ui/utils/colors';
import { ColorScheme } from '@features/ui/utils/constants';
import { useThemeActions } from '@features/ui/contexts/theme-context';
import { isWeb } from '@packages/utils';

export interface TextInputBaseProps extends TextInputProps {
  error?: boolean;
}

export const TextInputBase = React.forwardRef<RNTextInput, TextInputBaseProps>(
  (
    {
      error = false,
      editable = true,
      className = '',
      style,
      onFocus: onFocusProp,
      onBlur: onBlurProp,
      ...props
    },
    ref,
  ) => {
    const { colorScheme } = useThemeActions();
    const isDark = colorScheme === ColorScheme.DARK;
    const isDisabled = !editable;

    const [focused, setFocused] = useState(false);

    const isPlatformWeb = useMemo(() => isWeb(), []);

    const borderColor = error
      ? generic.error
      : focused
        ? primary[400]
        : isDark
          ? surface.dark.border
          : surface.light.border;

    return (
      <TextInput
        ref={ref}
        editable={editable}
        onFocus={(e) => {
          setFocused(true);
          onFocusProp?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlurProp?.(e);
        }}
        placeholderTextColor={textTokens.dark.muted}
        className={`bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl px-4 py-3 text-base border ${
          isDisabled ? 'opacity-50' : ''
        } ${className}`}
        style={[
          { borderColor },
          isPlatformWeb ? { outlineStyle: 'none' as never } : undefined,
          style,
        ]}
        {...props}
      />
    );
  },
);

TextInputBase.displayName = 'TextInputBase';
