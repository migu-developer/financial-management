SET search_path TO financial_management;

-- Currencies (solo países soportados: CO, MX, AR, UY, FI)
INSERT INTO currencies (id, code, name, symbol, country) VALUES
    (gen_random_uuid(), 'COP', 'Peso Colombiano',   '$',  'Colombia'),
    (gen_random_uuid(), 'MXN', 'Peso Mexicano',     '$',  'Mexico'),
    (gen_random_uuid(), 'ARS', 'Peso Argentino',    '$',  'Argentina'),
    (gen_random_uuid(), 'UYU', 'Peso Uruguayo',     '$U', 'Uruguay'),
    (gen_random_uuid(), 'EUR', 'Euro',              '€',  'Finland');

-- Tipos de movimiento: ingreso o egreso
INSERT INTO expenses_types (id, name, description) VALUES
    (gen_random_uuid(), 'income',  'Ingreso de dinero'),
    (gen_random_uuid(), 'outcome', 'Egreso de dinero');

-- Categorías opcionales para clasificar movimientos
INSERT INTO expenses_categories (id, name, description) VALUES
    (gen_random_uuid(), 'Food',          'Meals and groceries'),
    (gen_random_uuid(), 'Transport',     'Public transport, fuel, rides'),
    (gen_random_uuid(), 'Housing',       'Rent, mortgage, utilities'),
    (gen_random_uuid(), 'Entertainment', 'Leisure, subscriptions, events'),
    (gen_random_uuid(), 'Health',        'Medical, pharmacy, insurance'),
    (gen_random_uuid(), 'Education',     'Courses, books, certifications'),
    (gen_random_uuid(), 'Salary',        'Monthly salary and wages'),
    (gen_random_uuid(), 'Freelance',     'Freelance and independent work income'),
    (gen_random_uuid(), 'Investment',    'Returns from investments'),
    (gen_random_uuid(), 'Other',         'Uncategorized');

-- Providers (OAuth)
INSERT INTO providers (id, name) VALUES
    (gen_random_uuid(), 'Google'),
    (gen_random_uuid(), 'Facebook'),
    (gen_random_uuid(), 'Apple'),
    (gen_random_uuid(), 'Microsoft');

-- Tipos de documento
INSERT INTO documents (id, name) VALUES
    (gen_random_uuid(), 'CC'),
    (gen_random_uuid(), 'CE'),
    (gen_random_uuid(), 'Passport'),
    (gen_random_uuid(), 'NIT');
