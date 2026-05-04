import React, { useCallback, useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import type { LayoutChangeEvent } from 'react-native';
import { BarChart } from 'react-native-gifted-charts';
import type { MetricsDailyTrend } from '@packages/models/expenses';
import { useTranslation } from '@packages/i18n';
import { Card } from '@features/ui/components/shared/atoms/card';
import { formatCurrency } from '@features/ui/components/shared/molecules/currency-display';
import { success, generic, neutral, surface } from '@features/ui/utils/colors';
import { fontSizeScale, space, radius } from '@features/ui/utils/spacing';
import { fontWeight } from '@features/ui/utils/typography';
import { useThemeActions } from '@features/ui/contexts/theme-context';
import { ColorScheme } from '@features/ui/utils/constants';

export interface DailyTrendChartProps {
  trends: MetricsDailyTrend[];
}

const MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

function formatDayLabel(dateStr: string): string {
  const parts = dateStr.split('-');
  const monthIndex = parseInt(parts[1] ?? '1', 10) - 1;
  const day = parts[2] ?? '01';
  return `${MONTH_NAMES[monthIndex] ?? 'Jan'} ${day}`;
}

export function DailyTrendChart({ trends }: DailyTrendChartProps) {
  const { t } = useTranslation('dashboard');
  const { colorScheme } = useThemeActions();
  const isDark = colorScheme === ColorScheme.DARK;
  const [containerWidth, setContainerWidth] = useState(0);

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    setContainerWidth(e.nativeEvent.layout.width - 32);
  }, []);

  const { totalIncome, totalOutcome, barData, chartMax } = useMemo(() => {
    let income = 0;
    let outcome = 0;

    const data = trends.flatMap((day) => {
      income += day.income;
      outcome += day.outcome;
      const label = formatDayLabel(day.date);
      return [
        {
          value: day.income,
          frontColor: success[500],
          spacing: 2,
          label,
          type: 'income' as const,
        },
        {
          value: day.outcome,
          frontColor: generic.error,
          spacing: 24,
          label,
          type: 'outcome' as const,
        },
      ];
    });

    let max = 0;
    for (const day of trends) {
      max = Math.max(max, day.income, day.outcome);
    }
    const chartMax = Math.ceil(max * 1.15);
    const minBarValue = max * 0.04;

    const visualData = data.map((bar) => ({
      ...bar,
      realValue: bar.value,
      value: bar.value > 0 && bar.value < minBarValue ? minBarValue : bar.value,
    }));

    return {
      totalIncome: income,
      totalOutcome: outcome,
      barData: visualData,
      chartMax,
    };
  }, [trends, isDark]);

  if (trends.length === 0) {
    return (
      <Card className="p-4 mb-4">
        <Text className="text-base font-semibold text-neutral-900 dark:text-white mb-3">
          {t('metrics.dailyTrend')}
        </Text>
        <Text className="text-sm text-neutral-400 dark:text-neutral-500">
          {t('metrics.noData')}
        </Text>
      </Card>
    );
  }

  const Y_AXIS_WIDTH = 50;
  const availableWidth = containerWidth > 0 ? containerWidth - Y_AXIS_WIDTH : 0;
  const barPairs = trends.length;
  const barsPerPair = 2;
  const gapBetweenPairs = 20;
  const gapInsidePair = 2;
  const totalGaps = barPairs * gapBetweenPairs + barPairs * gapInsidePair;
  const computedBarWidth =
    barPairs > 0 && availableWidth > 0
      ? Math.max(
          8,
          Math.floor((availableWidth - totalGaps) / (barPairs * barsPerPair)),
        )
      : 16;

  return (
    <Card
      className="p-4 mb-4"
      style={{ overflow: 'visible' }}
      onLayout={onLayout}
    >
      <View className="flex-row items-baseline gap-2 mb-2">
        <Text className="text-base font-semibold text-neutral-900 dark:text-white">
          {t('metrics.dailyTrend')}
        </Text>
        <Text className="text-xs text-neutral-400 dark:text-neutral-500">
          ({t('metrics.globalCurrency')})
        </Text>
      </View>

      <View className="flex-row justify-between mb-6">
        <View className="flex-row items-center gap-2">
          <View
            className="w-3 h-3 rounded-sm"
            style={{ backgroundColor: success[500] }}
          />
          <Text className="text-sm text-neutral-500 dark:text-neutral-400">
            {t('metrics.income')}
          </Text>
          <Text className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
            {formatCurrency(totalIncome)}
          </Text>
        </View>
        <View className="flex-row items-center gap-2">
          <View
            className="w-3 h-3 rounded-sm"
            style={{ backgroundColor: generic.error }}
          />
          <Text className="text-sm text-neutral-500 dark:text-neutral-400">
            {t('metrics.outcome')}
          </Text>
          <Text className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
            {formatCurrency(totalOutcome)}
          </Text>
        </View>
      </View>

      {containerWidth > 0 && (
        <BarChart
          data={barData}
          barWidth={computedBarWidth}
          width={availableWidth}
          height={250}
          maxValue={chartMax}
          noOfSections={4}
          barBorderTopLeftRadius={4}
          barBorderTopRightRadius={4}
          overflowTop={60}
          yAxisTextStyle={{
            color: isDark ? neutral[400] : neutral[500],
            fontSize: fontSizeScale.xs,
          }}
          hideAxesAndRules={false}
          xAxisColor={isDark ? neutral[700] : neutral[300]}
          yAxisColor={isDark ? neutral[700] : neutral[300]}
          xAxisLabelsHeight={0}
          rulesColor={isDark ? neutral[800] : neutral[200]}
          backgroundColor={isDark ? surface.dark.card : surface.light.card}
          isAnimated
          animationDuration={500}
          renderTooltip={(item: {
            value: number;
            realValue?: number;
            type?: string;
            label?: string;
          }) => (
            <View
              style={{
                backgroundColor: isDark ? neutral[800] : generic.white,
                borderRadius: radius.md,
                paddingHorizontal: space.s10,
                paddingVertical: space.s6,
                borderWidth: 1,
                borderColor: isDark ? neutral[600] : neutral[300],
                marginBottom: space.s4,
                minWidth: 120,
              }}
            >
              <Text
                style={{
                  color: isDark ? neutral[200] : neutral[700],
                  fontSize: fontSizeScale.xs,
                  fontWeight: fontWeight.semibold,
                }}
              >
                {item.label ?? ''}
              </Text>
              <Text
                style={{
                  color: item.type === 'income' ? success[500] : generic.error,
                  fontSize: fontSizeScale.sm,
                  fontWeight: fontWeight.bold,
                  marginTop: space.s2,
                }}
              >
                {formatCurrency(item.realValue ?? item.value)} USD
              </Text>
              <Text
                style={{
                  color: isDark ? neutral[400] : neutral[500],
                  fontSize: fontSizeScale.xs,
                }}
              >
                {item.type === 'income'
                  ? t('metrics.income')
                  : t('metrics.outcome')}
              </Text>
            </View>
          )}
        />
      )}
    </Card>
  );
}
