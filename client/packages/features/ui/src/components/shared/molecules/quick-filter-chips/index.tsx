import React from 'react';
import { View } from 'react-native';

import { FilterChip } from '@features/ui/components/shared/atoms/filter-chip';

export interface QuickFilterChipOption<T extends string = string> {
  value: T;
  label: string;
}

export interface QuickFilterChipsProps<T extends string = string> {
  options: QuickFilterChipOption<T>[];
  /** Currently selected value, or null when none applies. */
  selected: T | null;
  onSelect: (value: T) => void;
}

/**
 * Generic horizontal row of single-select filter chips. The consumer owns
 * the selection state — tapping a chip only reports the value, so derived
 * selection (e.g. "does the current filter match this preset?") works
 * without duplicated state.
 */
export function QuickFilterChips<T extends string = string>({
  options,
  selected,
  onSelect,
}: QuickFilterChipsProps<T>) {
  return (
    <View className="flex-row flex-wrap gap-2">
      {options.map((option) => (
        <FilterChip
          key={option.value}
          label={option.label}
          selected={selected === option.value}
          onPress={() => onSelect(option.value)}
        />
      ))}
    </View>
  );
}
