/**
 * Quick date-range presets for the dashboard metrics filters (issue #35).
 * Pure functions: `today` is injected for testability.
 */

export type QuickRangeOption = 'currentMonth' | 'pastMonth' | 'lastThreeMonths';

export const QUICK_RANGE_OPTIONS: QuickRangeOption[] = [
  'currentMonth',
  'pastMonth',
  'lastThreeMonths',
];

export interface DateRange {
  from: string;
  to: string;
}

function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Resolves a preset to a concrete from/to range:
 * - currentMonth: 1st of this month → today
 * - pastMonth: 1st of previous month → last day of previous month
 * - lastThreeMonths: 1st of the month two months back → today
 *   (three calendar months including the current one)
 */
export function getQuickRange(
  option: QuickRangeOption,
  today: Date = new Date(),
): DateRange {
  const year = today.getFullYear();
  const month = today.getMonth();

  switch (option) {
    case 'currentMonth':
      return {
        from: formatDate(new Date(year, month, 1)),
        to: formatDate(today),
      };
    case 'pastMonth':
      return {
        from: formatDate(new Date(year, month - 1, 1)),
        to: formatDate(new Date(year, month, 0)),
      };
    case 'lastThreeMonths':
      return {
        from: formatDate(new Date(year, month - 2, 1)),
        to: formatDate(today),
      };
  }
}

/**
 * Returns the preset matching the given from/to filters, or null when the
 * range was set manually. Lets the UI derive the selected chip without
 * extra state — editing a DateInput naturally deselects every chip.
 */
export function matchQuickRange(
  from: string | undefined,
  to: string | undefined,
  today: Date = new Date(),
): QuickRangeOption | null {
  if (!from || !to) return null;
  for (const option of QUICK_RANGE_OPTIONS) {
    const range = getQuickRange(option, today);
    if (range.from === from && range.to === to) return option;
  }
  return null;
}
