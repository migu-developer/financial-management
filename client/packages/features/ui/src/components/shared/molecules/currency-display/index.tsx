import React from 'react';
import { Text, View } from 'react-native';

const CURRENCY_LOCALE: Record<string, string> = {
  COP: 'es-CO',
  MXN: 'es-MX',
  ARS: 'es-AR',
  UYU: 'es-UY',
  EUR: 'fi-FI',
  USD: 'en-US',
};

interface CurrencyDisplayProps {
  value: number;
  currencyCode?: string;
  type?: 'income' | 'outcome';
  className?: string;
}

export function formatNumber(value: number, currencyCode?: string): string {
  const code = currencyCode ?? 'USD';
  const locale = CURRENCY_LOCALE[code] ?? 'en-US';

  try {
    return new Intl.NumberFormat(locale, {
      minimumFractionDigits: 0,
      maximumFractionDigits: code === 'COP' ? 0 : 2,
    }).format(Math.abs(value));
  } catch {
    return `${Math.abs(value)}`;
  }
}

export function formatCurrency(value: number, currencyCode?: string): string {
  const code = currencyCode ?? 'USD';
  const locale = CURRENCY_LOCALE[code] ?? 'en-US';

  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: code,
      minimumFractionDigits: 0,
      maximumFractionDigits: code === 'COP' ? 0 : 2,
    }).format(Math.abs(value));
  } catch {
    return `${Math.abs(value)}`;
  }
}

export function CurrencyDisplay({
  value,
  currencyCode,
  type,
  className = '',
}: CurrencyDisplayProps) {
  const prefix = type === 'income' ? '+' : type === 'outcome' ? '-' : '';
  const colorClass =
    type === 'income'
      ? 'text-emerald-600 dark:text-emerald-400'
      : type === 'outcome'
        ? 'text-red-600 dark:text-red-400'
        : 'text-slate-900 dark:text-white';

  return (
    <View className="flex-row items-baseline gap-1">
      <Text className={`font-semibold ${colorClass} ${className}`}>
        {prefix}
        {formatCurrency(value, currencyCode)}
      </Text>
      {currencyCode && (
        <Text className="text-xs text-slate-400 dark:text-slate-500">
          {currencyCode}
        </Text>
      )}
    </View>
  );
}
