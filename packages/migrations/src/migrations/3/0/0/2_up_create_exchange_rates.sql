-- Exchange rates table: stores daily TRM for each currency against USD
CREATE TABLE financial_management.exchange_rates (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  currency_id uuid NOT NULL REFERENCES financial_management.currencies(id) ON DELETE CASCADE,
  rate_to_usd numeric(18,8) NOT NULL,
  rate_date   date NOT NULL,
  source      varchar(100) NOT NULL DEFAULT 'exchangerate-api',
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_exchange_rates_currency_date UNIQUE (currency_id, rate_date)
);

-- Index for lookups by currency + date (latest first)
CREATE INDEX idx_exchange_rates_currency_date
  ON financial_management.exchange_rates (currency_id, rate_date DESC);

-- View: latest exchange rate per currency (convenience for JOINs)
CREATE VIEW financial_management.v_latest_exchange_rates AS
SELECT DISTINCT ON (currency_id)
  currency_id, rate_to_usd, rate_date, source
FROM financial_management.exchange_rates
ORDER BY currency_id, rate_date DESC;

-- RLS
ALTER TABLE financial_management.exchange_rates ENABLE ROW LEVEL SECURITY;

-- readonly_lambda_role: full SELECT
CREATE POLICY readonly_select ON financial_management.exchange_rates
  FOR SELECT TO readonly_lambda_role USING (true);

-- authenticated: SELECT only (rates are system-managed, not user-managed)
CREATE POLICY authenticated_select ON financial_management.exchange_rates
  FOR SELECT TO authenticated USING (true);

-- Grant SELECT to readonly_lambda_role
GRANT SELECT ON financial_management.exchange_rates TO readonly_lambda_role;
GRANT SELECT ON financial_management.v_latest_exchange_rates TO readonly_lambda_role;
