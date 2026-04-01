import type { PoolClient } from 'pg';

export async function up(client: PoolClient): Promise<void> {
  const password = process.env['DB_READONLY_PASSWORD'];
  if (!password) throw new Error('DB_READONLY_PASSWORD env var is required');

  await client.query('SELECT set_config($1, $2, true)', [
    'app.readonly_pw',
    password,
  ]);

  await client.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'readonly_lambda_role') THEN
        CREATE ROLE readonly_lambda_role;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'readonly_lambda') THEN
        EXECUTE format(
          'CREATE USER readonly_lambda WITH ENCRYPTED PASSWORD %L',
          current_setting('app.readonly_pw')
        );
      END IF;
    END;
    $$;
  `);
}

export async function down(client: PoolClient): Promise<void> {
  await client.query('DROP USER IF EXISTS readonly_lambda');
  await client.query('DROP ROLE IF EXISTS readonly_lambda_role');
}
