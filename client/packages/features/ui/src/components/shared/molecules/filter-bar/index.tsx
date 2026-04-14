import React from 'react';
import { ScrollView, View } from 'react-native';
import { SearchInput } from '@features/ui/components/shared/atoms/search-input';
import type { SearchInputProps } from '@features/ui/components/shared/atoms/search-input';

export interface FilterBarProps {
  searchProps?: SearchInputProps;
  children?: React.ReactNode;
}

export function FilterBar({ searchProps, children }: FilterBarProps) {
  return (
    <View className="mb-4 gap-2">
      {searchProps && <SearchInput {...searchProps} />}
      {children && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8 }}
        >
          {children}
        </ScrollView>
      )}
    </View>
  );
}
