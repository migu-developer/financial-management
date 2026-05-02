import { config, sqlScript } from 'src/lib/version-config';

export default config({
  description:
    'Add date and global_value columns to expenses, create exchange_rates table with view, backfill existing dates',
  scripts: [
    sqlScript(
      '1_up_add_expense_date_and_global_value',
      '1_down_add_expense_date_and_global_value',
    ),
    sqlScript('2_up_create_exchange_rates', '2_down_create_exchange_rates'),
  ],
});
