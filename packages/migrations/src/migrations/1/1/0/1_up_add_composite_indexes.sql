SET search_path TO financial_management;

-- Listado paginado de expenses por usuario ordenado por fecha (el query mas frecuente)
CREATE INDEX idx_expenses_user_created_at
    ON expenses (user_id, created_at DESC);

-- Filtrar ingresos/egresos de un usuario por fecha
CREATE INDEX idx_expenses_user_type_created_at
    ON expenses (user_id, expense_type_id, created_at DESC);

-- Filtrar expenses por categoria de un usuario
CREATE INDEX idx_expenses_user_category
    ON expenses (user_id, expense_category_id);
