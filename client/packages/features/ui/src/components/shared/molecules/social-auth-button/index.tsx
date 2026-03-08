import { MaterialCommunityIcons } from '@expo/vector-icons';
import { generic } from '@features/ui/utils/colors';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

export type SocialProvider = 'google' | 'facebook' | 'microsoft' | 'apple';

type MaterialCommunityIconName = React.ComponentProps<
  typeof MaterialCommunityIcons
>['name'];

const providerIconMap: Record<SocialProvider, MaterialCommunityIconName> = {
  google: 'google',
  facebook: 'facebook',
  microsoft: 'microsoft',
  apple: 'apple',
};

const providerColorMap: Record<SocialProvider, string> = {
  google: generic.providers.google,
  facebook: generic.providers.facebook,
  microsoft: generic.providers.microsoft,
  apple: generic.providers.apple,
};

interface SocialAuthButtonProps {
  provider: SocialProvider;
  label: string;
  onPress: () => void;
  disabled?: boolean;
}

export function SocialAuthButton({
  provider,
  label,
  onPress,
  disabled = false,
}: SocialAuthButtonProps) {
  const iconName = providerIconMap[provider];
  const iconColor = providerColorMap[provider];

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      className={`flex-row items-center justify-center bg-slate-800 border border-slate-700 rounded-xl py-3 px-4 mb-3 ${
        disabled ? 'opacity-50' : ''
      }`}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <View className="mr-3">
        <MaterialCommunityIcons name={iconName} size={20} color={iconColor} />
      </View>
      <Text className="text-white text-base font-medium">{label}</Text>
    </TouchableOpacity>
  );
}
