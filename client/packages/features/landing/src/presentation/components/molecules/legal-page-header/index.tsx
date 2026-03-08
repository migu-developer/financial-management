import { MaterialIcons } from '@expo/vector-icons';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

import { primary } from '@features/ui/utils/colors';

interface LegalPageHeaderProps {
  title: string;
  backLabel?: string;
  onBackPress?: () => void;
}

export function LegalPageHeader({
  title,
  backLabel = 'Back',
  onBackPress,
}: LegalPageHeaderProps) {
  return (
    <View className="bg-slate-50 dark:bg-slate-900 px-6 pt-12 pb-4 border-b border-slate-200 dark:border-slate-800 flex-row items-center">
      {onBackPress && (
        <TouchableOpacity
          onPress={onBackPress}
          className="mr-3"
          accessibilityRole="button"
          accessibilityLabel={backLabel}
        >
          <MaterialIcons name="arrow-back" size={24} color={primary[400]} />
        </TouchableOpacity>
      )}
      <Text className="text-slate-900 dark:text-white font-bold text-2xl flex-1">
        {title}
      </Text>
    </View>
  );
}
