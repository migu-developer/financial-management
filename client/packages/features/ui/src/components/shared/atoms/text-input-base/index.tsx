import React from 'react';
import type { TextInput as RNTextInput, TextInputProps } from 'react-native';
import { TextInput } from 'react-native';
import { useColorScheme } from 'nativewind';

import { generic, surface, textTokens } from '@features/ui/utils/colors';
import { ColorScheme } from '@features/ui/utils/constants';

export interface TextInputBaseProps extends TextInputProps {
  error?: boolean;
}

export const TextInputBase = React.forwardRef<RNTextInput, TextInputBaseProps>(
  (
    { error = false, editable = true, className = '', style, ...props },
    ref,
  ) => {
    const { colorScheme } = useColorScheme();
    const isDisabled = !editable;

    const borderColor = error
      ? generic.error
      : colorScheme === ColorScheme.DARK
        ? surface.dark.border
        : surface.light.border;

    return (
      <TextInput
        ref={ref}
        editable={editable}
        placeholderTextColor={textTokens.dark.muted}
        className={`bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl px-4 py-3 text-base border ${
          isDisabled ? 'opacity-50' : ''
        } ${className}`}
        style={[{ borderColor }, style]}
        {...props}
      />
    );
  },
);

TextInputBase.displayName = 'TextInputBase';
