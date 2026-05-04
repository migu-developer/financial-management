import React, { useEffect, useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type {
  Expense,
  CreateExpenseInput,
  Currency,
  ExpenseType,
  ExpenseCategory,
} from '@packages/models/expenses';
import {
  Button,
  DateInput,
  FormInput,
  Modal,
  SelectableOption,
  SelectorField,
} from '@features/ui/components';
import { TextInputBase } from '@features/ui/components/shared/atoms/text-input-base';
import { formatNumber } from '@features/ui/components/shared/molecules/currency-display';
import { useTranslation } from '@packages/i18n';
import { useThemeActions } from '@features/ui/contexts/theme-context';
import { ColorScheme } from '@features/ui/utils/constants';
import { surface, textTokens, primary } from '@features/ui/utils/colors';
import { fontSizeScale, space } from '@features/ui/utils/spacing';

interface ExpenseFormProps {
  expense?: Expense | null;
  currencies: Currency[];
  expenseTypes: ExpenseType[];
  expenseCategories: ExpenseCategory[];
  onSubmit: (input: Omit<CreateExpenseInput, 'user_id'>) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
  submitLabel: string;
  cancelLabel: string;
}

function SelectorModal<T extends { id: string }>({
  visible,
  title,
  items,
  selectedId,
  onSelect,
  onClose,
  renderLabel,
  doneLabel,
}: {
  visible: boolean;
  title: string;
  items: T[];
  selectedId: string;
  onSelect: (id: string) => void;
  onClose: () => void;
  renderLabel: (item: T) => string;
  doneLabel: string;
}) {
  return (
    <Modal visible={visible} onClose={onClose} title={title}>
      <ScrollView style={{ maxHeight: 300 }}>
        {items.map((item) => (
          <SelectableOption
            key={item.id}
            selected={item.id === selectedId}
            selectedIcon="radiobox-marked"
            unselectedIcon="radiobox-blank"
            onPress={() => onSelect(item.id)}
            className="flex-row items-center py-3 px-1"
          >
            <Text className="text-base text-slate-900 dark:text-white ml-2">
              {renderLabel(item)}
            </Text>
          </SelectableOption>
        ))}
      </ScrollView>
      <View className="mt-4">
        <Button
          label={doneLabel}
          variant="primary"
          size="sm"
          onPress={onClose}
        />
      </View>
    </Modal>
  );
}

export function ExpenseForm({
  expense,
  currencies,
  expenseTypes,
  expenseCategories,
  onSubmit,
  onCancel,
  loading = false,
  submitLabel,
  cancelLabel,
}: ExpenseFormProps) {
  const { t } = useTranslation('dashboard');
  const { colorScheme } = useThemeActions();
  const isDark = colorScheme === ColorScheme.DARK;
  const [name, setName] = useState('');
  const [value, setValue] = useState('');
  const [date, setDate] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  });
  const [currencyId, setCurrencyId] = useState('');
  const [expenseTypeId, setExpenseTypeId] = useState('');
  const [expenseCategoryId, setExpenseCategoryId] = useState('');
  const [selectorField, setSelectorField] = useState<
    'type' | 'currency' | 'category' | null
  >(null);
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (expense) {
      setName(expense.name);
      setValue(String(expense.value));
      if (expense.date) setDate(expense.date.split('T')[0]!);
      setCurrencyId(expense.currency_id);
      setExpenseTypeId(expense.expense_type_id);
      setExpenseCategoryId(expense.expense_category_id ?? '');
    } else {
      if (currencies.length > 0 && !currencyId)
        setCurrencyId(currencies[0]!.id);
      if (expenseTypes.length > 0 && !expenseTypeId)
        setExpenseTypeId(expenseTypes[0]!.id);
    }
  }, [expense, currencies, expenseTypes]);

  const isValid =
    name.trim().length > 0 &&
    parseFloat(value) > 0 &&
    currencyId.length > 0 &&
    expenseTypeId.length > 0;

  const handleSubmit = async () => {
    if (!isValid) return;
    await onSubmit({
      name: name.trim(),
      value: parseFloat(value),
      currency_id: currencyId,
      expense_type_id: expenseTypeId,
      ...(expenseCategoryId && { expense_category_id: expenseCategoryId }),
      ...(date && { date }),
    });
  };

  const categoryOptions = [
    { id: '', name: t('expenses.form.categoryNone') },
    ...expenseCategories,
  ];

  const selectedCurrency = currencies.find((c) => c.id === currencyId);
  const borderColor = isFocused
    ? primary[400]
    : isDark
      ? surface.dark.border
      : surface.light.border;

  return (
    <View className="gap-4">
      <FormInput
        label={t('expenses.form.name')}
        value={name}
        onChangeText={setName}
        placeholder={t('expenses.form.namePlaceholder')}
      />

      <DateInput
        label={t('expenses.form.date')}
        value={date}
        onChangeText={setDate}
      />

      {/* Currency + Value — PhoneInput style */}
      <View>
        <Text className="text-slate-600 dark:text-slate-300 text-sm font-medium mb-1">
          {t('expenses.form.value')}
        </Text>
        <View
          className="flex-row bg-slate-100 dark:bg-slate-800 rounded-xl border overflow-hidden"
          style={{ borderColor }}
        >
          <TouchableOpacity
            onPress={() => setSelectorField('currency')}
            className="flex-row items-center px-3 py-3 border-r border-slate-200 dark:border-slate-700"
            accessibilityRole="button"
            accessibilityLabel={t('expenses.form.currency')}
          >
            <Text className="text-slate-600 dark:text-slate-300 text-sm font-medium mr-1">
              {selectedCurrency?.symbol ?? '$'}
            </Text>
            <Text className="text-slate-500 dark:text-slate-400 text-xs">
              {selectedCurrency?.code ?? ''}
            </Text>
            <MaterialCommunityIcons
              name="chevron-down"
              size={fontSizeScale.xs}
              color={isDark ? textTokens.dark.muted : textTokens.light.muted}
              style={{ marginLeft: space.s2 }}
            />
          </TouchableOpacity>
          <TextInputBase
            value={
              isFocused
                ? value
                : value && parseFloat(value) > 0
                  ? formatNumber(parseFloat(value), selectedCurrency?.code)
                  : value
            }
            onChangeText={(text) => setValue(text.replace(/[^0-9.]/g, ''))}
            placeholder={t('expenses.form.valuePlaceholder')}
            keyboardType="decimal-pad"
            className="flex-1 px-3 py-3 rounded-none border-0"
            style={[{ borderWidth: 0 }]}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            accessibilityLabel={t('expenses.form.value')}
          />
        </View>
      </View>

      <SelectorField
        label={t('expenses.form.type')}
        value={expenseTypes.find((et) => et.id === expenseTypeId)?.name ?? ''}
        placeholder={t('expenses.form.typePlaceholder')}
        onPress={() => setSelectorField('type')}
      />

      {expenseCategories.length > 0 && (
        <SelectorField
          label={t('expenses.form.category')}
          value={
            categoryOptions.find((c) => c.id === expenseCategoryId)?.name ?? ''
          }
          placeholder={t('expenses.form.categoryPlaceholder')}
          onPress={() => setSelectorField('category')}
        />
      )}

      <View className="flex-row gap-3 justify-end mt-2">
        <Button
          label={cancelLabel}
          variant="ghost"
          size="sm"
          onPress={onCancel}
          disabled={loading}
        />
        <Button
          label={submitLabel}
          variant="primary"
          size="sm"
          onPress={handleSubmit}
          loading={loading}
          disabled={!isValid || loading}
        />
      </View>

      <SelectorModal
        visible={selectorField === 'type'}
        title={t('expenses.selector.selectTitle', {
          field: t('expenses.form.type'),
        })}
        items={expenseTypes}
        selectedId={expenseTypeId}
        onSelect={setExpenseTypeId}
        onClose={() => setSelectorField(null)}
        renderLabel={(item) => item.name}
        doneLabel={t('expenses.selector.done')}
      />
      <SelectorModal
        visible={selectorField === 'currency'}
        title={t('expenses.selector.selectTitle', {
          field: t('expenses.form.currency'),
        })}
        items={currencies}
        selectedId={currencyId}
        onSelect={setCurrencyId}
        onClose={() => setSelectorField(null)}
        renderLabel={(item) => `${item.symbol} ${item.code} — ${item.name}`}
        doneLabel={t('expenses.selector.done')}
      />
      {expenseCategories.length > 0 && (
        <SelectorModal
          visible={selectorField === 'category'}
          title={t('expenses.selector.selectTitle', {
            field: t('expenses.form.category'),
          })}
          items={categoryOptions}
          selectedId={expenseCategoryId}
          onSelect={setExpenseCategoryId}
          onClose={() => setSelectorField(null)}
          renderLabel={(item) => item.name}
          doneLabel={t('expenses.selector.done')}
        />
      )}
    </View>
  );
}
