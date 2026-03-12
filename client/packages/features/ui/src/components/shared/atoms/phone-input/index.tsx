import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, Modal, Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useColorScheme } from 'nativewind';
import {
  AsYouType,
  getCountries,
  getCountryCallingCode,
  isValidPhoneNumber,
  type CountryCode,
} from 'libphonenumber-js/min';

import { useTranslation } from '@packages/i18n';
import { generic, surface } from '@features/ui/utils/colors';
import { ColorScheme } from '@features/ui/utils/constants';
import { TextInputBase } from '@features/ui/components/shared/atoms/text-input-base';
import { COUNTRY_CODES, COUNTRY_NAMES } from '@features/ui/utils/countries';

function getCountryFlag(code: string): string {
  return [...code.toUpperCase()]
    .map((c) => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65))
    .join('');
}

interface CountryOption {
  code: string;
  dialCode: string;
  name: string;
  flag: string;
}

export interface PhoneInputProps {
  value: string;
  onChange: (e164: string, isValid: boolean) => void;
  label?: string;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  defaultCountry?: string;
}

export function PhoneInput({
  value,
  onChange,
  label,
  placeholder,
  error,
  disabled = false,
  defaultCountry,
}: PhoneInputProps) {
  const { colorScheme } = useColorScheme();
  const { t } = useTranslation('login');
  const [pickerVisible, setPickerVisible] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedCountry, setSelectedCountry] = useState(defaultCountry);
  const [localDigits, setLocalDigits] = useState(value);

  const allCountries = useMemo<CountryOption[]>(() => {
    const all = getCountries().map((code) => ({
      code,
      dialCode: `+${getCountryCallingCode(code)}`,
      name: COUNTRY_NAMES[code] ?? code,
      flag: getCountryFlag(code),
    }));

    const prioritySet = new Set(COUNTRY_CODES);
    const priority = COUNTRY_CODES.map((code) =>
      all.find((c) => c.code === code),
    ).filter(Boolean) as CountryOption[];
    const rest = all
      .filter((c) => !prioritySet.has(c.code))
      .sort((a, b) => a.name.localeCompare(b.name));

    return [...priority, ...rest];
  }, []);

  const filteredCountries = useMemo<CountryOption[]>(() => {
    if (!search) return allCountries;
    const q = search.toLowerCase();
    return allCountries.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.dialCode.includes(q) ||
        c.code.toLowerCase().includes(q),
    );
  }, [allCountries, search]);

  const selectedOption = useMemo(
    () =>
      allCountries.find((c) => c.code === selectedCountry) ?? allCountries[0],
    [allCountries, selectedCountry],
  );

  const handleDigitsChange = useCallback(
    (text: string) => {
      const digits = text.replace(/[^\d\s\-().]/g, '');
      setLocalDigits(digits);

      const formatter = new AsYouType(selectedCountry as CountryCode);
      formatter.input(digits);
      const e164 = `+${getCountryCallingCode(selectedCountry as CountryCode)}${digits.replace(/\D/g, '')}`;
      const valid = isValidPhoneNumber(e164);
      onChange(e164, valid);
    },
    [selectedCountry, onChange],
  );

  const handleSelectCountry = useCallback(
    (code: string) => {
      setSelectedCountry(code);
      setPickerVisible(false);
      setSearch('');
      if (localDigits) {
        const e164 = `+${getCountryCallingCode(code as CountryCode)}${localDigits.replace(/\D/g, '')}`;
        const valid = isValidPhoneNumber(e164);
        onChange(e164, valid);
      }
    },
    [localDigits, onChange],
  );

  const borderColor = error
    ? generic.error
    : colorScheme === ColorScheme.DARK
      ? surface.dark.border
      : surface.light.border;

  return (
    <View className="mb-4">
      {label ? (
        <Text className="text-slate-600 dark:text-slate-300 text-sm font-medium mb-1">
          {label}
        </Text>
      ) : null}

      <View
        className="flex-row bg-slate-100 dark:bg-slate-800 rounded-xl border overflow-hidden"
        style={{ borderColor }}
      >
        {/* Country selector */}
        <TouchableOpacity
          onPress={() => setPickerVisible(true)}
          disabled={disabled}
          className="flex-row items-center px-3 py-3 border-r border-slate-200 dark:border-slate-700"
          accessibilityRole="button"
          accessibilityLabel={`Country: ${selectedOption?.name ?? ''}`}
          testID="phone-input-country-picker"
        >
          <Text className="text-lg mr-1">{selectedOption?.flag}</Text>
          <Text className="text-slate-600 dark:text-slate-300 text-sm">
            {selectedOption?.dialCode}
          </Text>
          <MaterialCommunityIcons
            name="chevron-down"
            size={14}
            color={colorScheme === ColorScheme.DARK ? '#94a3b8' : '#64748b'}
            style={{ marginLeft: 2 }}
          />
        </TouchableOpacity>

        {/* Number input */}
        <TextInputBase
          value={localDigits}
          onChangeText={handleDigitsChange}
          placeholder={placeholder}
          keyboardType="phone-pad"
          editable={!disabled}
          error={!!error}
          className="flex-1 px-3 py-3 rounded-none border-0"
          style={{ borderWidth: 0 }}
          accessibilityLabel={label}
          testID="phone-input-number"
        />
      </View>

      {error ? (
        <Text className="text-red-400 text-xs mt-1">{error}</Text>
      ) : null}

      {/* Country picker modal */}
      <Modal
        visible={pickerVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setPickerVisible(false)}
      >
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-white dark:bg-slate-800 rounded-t-2xl max-h-[70%]">
            {/* Header */}
            <View className="flex-row items-center justify-between px-4 pt-4 pb-2 border-b border-slate-200 dark:border-slate-700">
              <Text className="text-slate-900 dark:text-white font-semibold text-base">
                {t('phonePicker.title')}
              </Text>
              <TouchableOpacity
                onPress={() => setPickerVisible(false)}
                accessibilityRole="button"
                accessibilityLabel={t('phonePicker.done')}
              >
                <Text className="text-primary-400 text-base">
                  {t('phonePicker.done')}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Search */}
            <View className="px-4 py-2">
              <TextInputBase
                value={search}
                onChangeText={setSearch}
                placeholder={t('phonePicker.searchPlaceholder')}
                className="rounded-lg px-3 py-2 text-sm"
                autoCapitalize="none"
                testID="phone-input-country-search"
              />
            </View>

            {/* List */}
            <FlatList
              data={filteredCountries}
              keyExtractor={(item) => item.code}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => handleSelectCountry(item.code)}
                  className={`flex-row items-center px-4 py-3 border-b border-slate-100 dark:border-slate-700 ${
                    item.code === selectedCountry
                      ? 'bg-primary-50 dark:bg-slate-700'
                      : ''
                  }`}
                  accessibilityRole="radio"
                  accessibilityState={{
                    checked: item.code === selectedCountry,
                  }}
                >
                  <Text className="text-lg mr-3">{item.flag}</Text>
                  <Text className="flex-1 text-slate-900 dark:text-white text-sm">
                    {item.name}
                  </Text>
                  <Text className="text-slate-500 dark:text-slate-400 text-sm">
                    {item.dialCode}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}
