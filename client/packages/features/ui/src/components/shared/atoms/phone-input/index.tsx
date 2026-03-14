import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  Animated,
  FlatList,
  Modal,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  AsYouType,
  getCountries,
  getCountryCallingCode,
  isValidPhoneNumber,
  type CountryCode,
} from 'libphonenumber-js/min';

import { useTranslation } from '@packages/i18n';
import {
  generic,
  primary,
  rgba,
  surface,
  textTokens,
  uiTokens,
} from '@features/ui/utils/colors';
import { ColorScheme } from '@features/ui/utils/constants';
import { useThemeActions } from '@features/ui/contexts/theme-context';
import { TextInputBase } from '@features/ui/components/shared/atoms/text-input-base';
import {
  COUNTRY_CODES,
  COUNTRY_NAMES,
  DEFAULT_COUNTRY,
} from '@features/ui/utils/countries';
import { isWeb } from '@packages/utils';

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
  const { colorScheme } = useThemeActions();
  const { t } = useTranslation('login');
  const isDark = colorScheme === ColorScheme.DARK;

  const [pickerVisible, setPickerVisible] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedCountry, setSelectedCountry] = useState(
    defaultCountry ?? DEFAULT_COUNTRY,
  );
  const [localDigits, setLocalDigits] = useState(value);
  const [isFocused, setIsFocused] = useState(false);

  const isPlatformWeb = useMemo(() => isWeb(), []);

  // Animated backdrop value (0 = hidden, 1 = visible)
  const backdropAnim = useRef(new Animated.Value(0)).current;

  const openPicker = useCallback(() => {
    setPickerVisible(true);
    setIsFocused(true);
    Animated.timing(backdropAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [backdropAnim]);

  const closePicker = useCallback(() => {
    Animated.timing(backdropAnim, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      setPickerVisible(false);
    });
  }, [backdropAnim]);

  const allCountries = useMemo<CountryOption[]>(() => {
    // Only use the restricted set of supported countries
    const supportedCodes = new Set(COUNTRY_CODES);
    const all = getCountries()
      .filter((code) => supportedCodes.has(code))
      .map((code) => ({
        code,
        dialCode: `+${getCountryCallingCode(code)}`,
        name: COUNTRY_NAMES[code] ?? code,
        flag: getCountryFlag(code),
      }));

    // Maintain the priority order from COUNTRY_CODES
    const priorityOrder = new Map(COUNTRY_CODES.map((c, i) => [c, i]));
    return all.sort(
      (a, b) =>
        (priorityOrder.get(a.code) ?? 99) - (priorityOrder.get(b.code) ?? 99),
    );
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

      const rawDigits = digits.replace(/\D/g, '');
      if (!rawDigits) {
        // Emit empty string so IdentifierInput can switch back to email mode
        onChange('', false);
        return;
      }

      const formatter = new AsYouType(selectedCountry as CountryCode);
      formatter.input(digits);
      const e164 = `+${getCountryCallingCode(selectedCountry as CountryCode)}${rawDigits}`;
      const valid = isValidPhoneNumber(e164);
      onChange(e164, valid);
    },
    [selectedCountry, onChange],
  );

  const handleSelectCountry = useCallback(
    (code: string) => {
      setSelectedCountry(code);
      setSearch('');
      closePicker();
      if (localDigits) {
        const rawDigits = localDigits.replace(/\D/g, '');
        if (rawDigits) {
          const e164 = `+${getCountryCallingCode(code as CountryCode)}${rawDigits}`;
          const valid = isValidPhoneNumber(e164);
          onChange(e164, valid);
        }
      }
    },
    [localDigits, onChange, closePicker],
  );

  const borderColor = error
    ? generic.error
    : isFocused
      ? primary[400]
      : isDark
        ? surface.dark.border
        : surface.light.border;

  const containerBg = isDark ? surface.dark.card : surface.light.card;

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
          onPress={openPicker}
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
            color={isDark ? uiTokens.moonColor : textTokens.light.muted}
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
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          className="flex-1 px-3 py-3 rounded-none border-0"
          style={[
            { borderWidth: 0 },
            isPlatformWeb ? { outlineStyle: 'none' as never } : undefined,
          ]}
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
        animationType="none"
        transparent
        onRequestClose={closePicker}
      >
        <View style={{ flex: 1 }}>
          {/* Animated backdrop */}
          <Animated.View
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: rgba.black50,
              opacity: backdropAnim,
            }}
          />

          {/* Content — slides up, constrained width on web */}
          <View
            style={{
              flex: 1,
              justifyContent: 'flex-end',
              alignItems: 'center',
            }}
          >
            <Animated.View
              style={{
                backgroundColor: containerBg,
                borderTopLeftRadius: 16,
                borderTopRightRadius: 16,
                maxHeight: '70%',
                maxWidth: 448,
                width: '100%',
                transform: [
                  {
                    translateY: backdropAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [300, 0],
                    }),
                  },
                ],
              }}
            >
              {/* Header */}
              <View className="flex-row items-center justify-between px-4 pt-4 pb-2 border-b border-slate-200 dark:border-slate-700">
                <Text className="text-slate-900 dark:text-white font-semibold text-base">
                  {t('phonePicker.title')}
                </Text>
                <TouchableOpacity
                  onPress={closePicker}
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
            </Animated.View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
