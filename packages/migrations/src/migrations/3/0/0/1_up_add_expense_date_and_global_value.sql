-- Add date column to expenses for metrics queries by date range
ALTER TABLE financial_management.expenses
  ADD COLUMN date date NULL;

-- Add global_value column for USD-normalized expense values
ALTER TABLE financial_management.expenses
  ADD COLUMN global_value numeric(18,8) NULL;

-- Index for metrics queries by user + date range
CREATE INDEX idx_expenses_user_date
  ON financial_management.expenses (user_id, date DESC);
