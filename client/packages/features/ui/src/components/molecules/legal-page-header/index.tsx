import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

interface LegalPageHeaderProps {
  title: string;
  backLabel: string;
  onBackPress?: () => void;
}

export function LegalPageHeader({
  title,
  backLabel,
  onBackPress,
}: LegalPageHeaderProps) {
  return (
    <View className="bg-slate-900 px-6 pt-12 pb-4 border-b border-slate-800">
      {onBackPress && (
        <TouchableOpacity
          onPress={onBackPress}
          className="flex-row items-center mb-3"
          accessibilityRole="button"
          accessibilityLabel={backLabel}
        >
          <Text className="text-primary-400 text-sm font-medium">
            {'← '}
            {backLabel}
          </Text>
        </TouchableOpacity>
      )}
      <Text className="text-white font-bold text-2xl">{title}</Text>
    </View>
  );
}
