import React from 'react';
import { Text, View } from 'react-native';

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
}

export function EmptyState({ title, description, icon }: EmptyStateProps) {
  return (
    <View className="flex-1 items-center justify-center py-16 px-4">
      {icon && <View className="mb-4">{icon}</View>}
      <Text className="text-lg font-semibold text-neutral-500 dark:text-neutral-400 text-center">
        {title}
      </Text>
      {description && (
        <Text className="text-sm text-neutral-400 dark:text-neutral-500 text-center mt-2 max-w-xs">
          {description}
        </Text>
      )}
    </View>
  );
}
