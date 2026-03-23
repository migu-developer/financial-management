SET search_path TO financial_management;

-- Extensiones requeridas (se instalan a nivel de DB, no de schema)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ══════════════════════════════════════════════════════════════════════
-- Catálogos base
-- ══════════════════════════════════════════════════════════════════════

CREATE TABLE documents (
    id    uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name  varchar(100) NOT NULL
);

CREATE TABLE providers (
    id    uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name  varchar(100) NOT NULL
);

CREATE TABLE currencies (
    id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    code        varchar(3) NOT NULL UNIQUE,
    name        varchar(50) NOT NULL,
    symbol      varchar(10) NOT NULL,
    country     varchar(50) NOT NULL
);

-- expenses_types: income (ingreso) o outcome (egreso)
CREATE TABLE expenses_types (
    id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name        varchar(100) NOT NULL UNIQUE,
    description text
);

-- expenses_categories: categorías opcionales para clasificar gastos/ingresos
CREATE TABLE expenses_categories (
    id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name        varchar(100) NOT NULL,
    description text
);

-- ══════════════════════════════════════════════════════════════════════
-- Tabla principal de usuarios
-- ══════════════════════════════════════════════════════════════════════

CREATE TABLE users (
    id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    uid             uuid NOT NULL UNIQUE,
    email           varchar(255) NOT NULL UNIQUE,
    first_name      varchar(100),
    last_name       varchar(100),
    identities      text,
    locale          varchar(10),
    picture         text,
    phone           varchar(30),
    document_id     uuid REFERENCES documents(id) ON DELETE SET NULL,
    email_verified  boolean DEFAULT false,
    phone_verified  boolean DEFAULT false,
    provider_id     uuid REFERENCES providers(id) ON DELETE SET NULL,
    created_at      timestamptz DEFAULT now(),
    updated_at      timestamptz DEFAULT now(),
    created_by      varchar(255),
    modified_by     varchar(255)
);

-- ══════════════════════════════════════════════════════════════════════
-- Tabla de movimientos financieros (ingresos y egresos)
-- ══════════════════════════════════════════════════════════════════════

CREATE TABLE expenses (
    id                  uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id             uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name                text NOT NULL,
    value               numeric(12,2) NOT NULL,
    currency_id         uuid NOT NULL REFERENCES currencies(id) ON DELETE RESTRICT,
    expense_type_id     uuid NOT NULL REFERENCES expenses_types(id) ON DELETE RESTRICT,
    expense_category_id uuid REFERENCES expenses_categories(id) ON DELETE SET NULL,
    created_at          timestamptz DEFAULT now(),
    updated_at          timestamptz DEFAULT now(),
    created_by          varchar(255),
    modified_by         varchar(255)
);

-- ══════════════════════════════════════════════════════════════════════
-- Tabla de auditoría (historial de cambios)
-- ══════════════════════════════════════════════════════════════════════

CREATE TABLE audit_logs (
    id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    table_name  varchar(100) NOT NULL,
    record_id   uuid NOT NULL,
    action      varchar(10) NOT NULL,
    old_data    jsonb,
    new_data    jsonb,
    created_at  timestamptz DEFAULT now(),
    created_by  varchar(255)
);

-- ══════════════════════════════════════════════════════════════════════
-- Índices
-- ══════════════════════════════════════════════════════════════════════

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_uid ON users(uid);
CREATE INDEX idx_expenses_user_id ON expenses(user_id);
CREATE INDEX idx_expenses_currency_id ON expenses(currency_id);
CREATE INDEX idx_expenses_expense_type_id ON expenses(expense_type_id);
CREATE INDEX idx_expenses_expense_category_id ON expenses(expense_category_id);
CREATE INDEX idx_audit_logs_table_record ON audit_logs(table_name, record_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);

-- ══════════════════════════════════════════════════════════════════════
-- Función: auto-actualizar updated_at en cada UPDATE
-- ══════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_expenses_updated_at
    BEFORE UPDATE ON expenses
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- ══════════════════════════════════════════════════════════════════════
-- Función: registrar cambios en audit_logs automáticamente
-- Captura INSERT, UPDATE y DELETE con old_data/new_data en JSONB
-- ══════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION fn_audit_log()
RETURNS TRIGGER AS $$
DECLARE
    record_pk uuid;
    user_info varchar(255);
BEGIN
    IF TG_OP = 'DELETE' THEN
        record_pk := OLD.id;
    ELSE
        record_pk := NEW.id;
    END IF;

    IF TG_OP = 'DELETE' THEN
        user_info := OLD.modified_by;
    ELSIF TG_OP = 'INSERT' THEN
        user_info := NEW.created_by;
    ELSE
        user_info := NEW.modified_by;
    END IF;

    INSERT INTO audit_logs (table_name, record_id, action, old_data, new_data, created_by)
    VALUES (
        TG_TABLE_NAME,
        record_pk,
        TG_OP,
        CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) ELSE NULL END,
        CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END,
        user_info
    );

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_audit
    AFTER INSERT OR UPDATE OR DELETE ON users
    FOR EACH ROW EXECUTE FUNCTION fn_audit_log();

CREATE TRIGGER trg_expenses_audit
    AFTER INSERT OR UPDATE OR DELETE ON expenses
    FOR EACH ROW EXECUTE FUNCTION fn_audit_log();
