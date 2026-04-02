import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { primary } from '@features/ui/utils/colors';

interface LoadingSpinnerProps {
  size?: 'small' | 'large';
  fullScreen?: boolean;
}

export function LoadingSpinner({
  size = 'large',
  fullScreen = false,
}: LoadingSpinnerProps) {
  if (fullScreen) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator size={size} color={primary.DEFAULT} />
      </View>
    );
  }

  return (
    <View className="items-center justify-center py-4">
      <ActivityIndicator size={size} color={primary.DEFAULT} />
    </View>
  );
}
