import React from 'react';
import { Text } from 'react-native';

export interface CurrencyAmountProps {
  amount: number;
  symbol?: string;
  showSign?: boolean;
  className?: string;
}

function formatWithCommas(value: number): string {
  const parts = Math.abs(value).toFixed(2).split('.');
  const integerPart = (parts[0] ?? '0').replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${integerPart}.${parts[1] ?? '00'}`;
}

export function CurrencyAmount({
  amount,
  symbol = '$',
  showSign = false,
  className = '',
}: CurrencyAmountProps) {
  const sign = showSign ? (amount >= 0 ? '+' : '-') : amount < 0 ? '-' : '';
  const formatted = formatWithCommas(amount);

  return (
    <Text
      className={`font-semibold text-neutral-900 dark:text-white ${className}`}
    >
      {sign}
      {symbol}
      {formatted}
    </Text>
  );
}
