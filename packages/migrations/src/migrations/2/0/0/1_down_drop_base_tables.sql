
-- Revoke grants from readonly_lambda_role
REVOKE readonly_lambda_role FROM readonly_lambda;
REVOKE SELECT ON ALL TABLES IN SCHEMA financial_management FROM readonly_lambda_role;
REVOKE USAGE ON SCHEMA financial_management FROM readonly_lambda_role;

-- Triggers
DROP TRIGGER IF EXISTS trg_expenses_audit ON expenses;
DROP TRIGGER IF EXISTS trg_users_audit ON users;
DROP TRIGGER IF EXISTS trg_expenses_updated_at ON expenses;
DROP TRIGGER IF EXISTS trg_users_updated_at ON users;

-- Funciones
DROP FUNCTION IF EXISTS fn_audit_log();
DROP FUNCTION IF EXISTS fn_set_updated_at();

-- Tablas (orden inverso por dependencias; CASCADE elimina políticas automáticamente)
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS expenses CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS expenses_categories CASCADE;
DROP TABLE IF EXISTS expenses_types CASCADE;
DROP TABLE IF EXISTS currencies CASCADE;
DROP TABLE IF EXISTS providers CASCADE;
DROP TABLE IF EXISTS documents CASCADE;
