DROP INDEX IF EXISTS financial_management.idx_expenses_user_date;

ALTER TABLE financial_management.expenses
  DROP COLUMN IF EXISTS global_value;

ALTER TABLE financial_management.expenses
  DROP COLUMN IF EXISTS date;
