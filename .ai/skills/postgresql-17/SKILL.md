---
name: postgresql-17
description: |
  PostgreSQL 17 patterns with node-pg for the services layer.
  TRIGGER when: writing database queries, configuring connection pools,
  creating migrations, or implementing repository classes.
metadata:
  version: '17'
  catalog_ref: 'pg: ^8.20.0'
  scope: [services]
  auto_invoke: 'When writing database queries or configuring PostgreSQL connections'
allowed-tools: [Read, Edit, Write, Glob, Grep, Bash]
---

# PostgreSQL 17

## Version

pg@8.20.0 (from pnpm catalog), @types/pg@8.20.0, PostgreSQL 17

## Critical Patterns

- ALWAYS use parameterized queries with `$1, $2, ...` placeholders -- NEVER concatenate
- Use `pg.Pool` for connection pooling -- NEVER create single client connections
- Separate read and write pools for performance (read replicas)
- Keep pool `max` at 3 per Lambda instance (Lambda has limited connections)
- Use Row Level Security (RLS) policies for tenant isolation
- Use `ILIKE` for case-insensitive search (not `LIKE` with `LOWER()`)
- Use `RETURNING *` on INSERT/UPDATE to avoid a second query
- Use transactions (`BEGIN`/`COMMIT`/`ROLLBACK`) for multi-statement operations
- Use `JSON_TABLE()` (new in PG 17) for converting JSON to tabular data
- Create audit triggers for tracking changes to sensitive tables
- Always release clients back to the pool with `client.release()` in a `finally` block

## Must NOT Do

- NEVER concatenate user input into SQL strings -- always use `$1` parameters
- NEVER use `pool.max` > 3 in Lambda environments (RDS Proxy recommended for more)
- NEVER leave database connections open without releasing to pool
- NEVER store passwords in plain text -- use Cognito or bcrypt
- NEVER use `SELECT *` in production queries -- select only needed columns
- NEVER skip error handling on pool.query -- always wrap in try/catch
- NEVER use synchronous database calls
- NEVER hardcode connection strings -- use environment variables

## Examples

### Pool configuration

```typescript
import { Pool } from 'pg';

const writePool = new Pool({
  host: process.env['DB_WRITE_HOST'],
  port: Number(process.env['DB_PORT'] ?? 5432),
  database: process.env['DB_NAME'],
  user: process.env['DB_USER'],
  password: process.env['DB_PASSWORD'],
  max: 3,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
  ssl: { rejectUnauthorized: true },
});

const readPool = new Pool({
  host: process.env['DB_READ_HOST'],
  // ... same config, pointing to read replica
  max: 3,
});
```

### Parameterized query (SAFE)

```typescript
async function findUserByEmail(email: string): Promise<User | null> {
  const result = await readPool.query<User>(
    'SELECT id, email, name, created_at FROM users WHERE email = $1',
    [email],
  );
  return result.rows[0] ?? null;
}
```

### Insert with RETURNING

```typescript
async function createUser(name: string, email: string): Promise<User> {
  const result = await writePool.query<User>(
    'INSERT INTO users (name, email) VALUES ($1, $2) RETURNING id, name, email, created_at',
    [name, email],
  );
  return result.rows[0]!;
}
```

### Transaction pattern

```typescript
async function transferFunds(
  fromId: string,
  toId: string,
  amount: number,
): Promise<void> {
  const client = await writePool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      'UPDATE accounts SET balance = balance - $1 WHERE id = $2 AND balance >= $1',
      [amount, fromId],
    );
    await client.query(
      'UPDATE accounts SET balance = balance + $1 WHERE id = $2',
      [amount, toId],
    );
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
```

### ILIKE search

```typescript
async function searchUsers(query: string): Promise<User[]> {
  const result = await readPool.query<User>(
    'SELECT id, name, email FROM users WHERE name ILIKE $1 OR email ILIKE $1 LIMIT 20',
    [`%${query}%`],
  );
  return result.rows;
}
```

### RLS policy (migration SQL)

```sql
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON expenses
  USING (tenant_id = current_setting('app.tenant_id')::uuid);
```

### Audit trigger (migration SQL)

```sql
CREATE OR REPLACE FUNCTION audit_trigger()
RETURNS trigger AS $$
BEGIN
  INSERT INTO audit_log (table_name, operation, old_data, new_data, changed_by)
  VALUES (TG_TABLE_NAME, TG_OP, row_to_json(OLD), row_to_json(NEW), current_setting('app.user_id'));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER expenses_audit
  AFTER INSERT OR UPDATE OR DELETE ON expenses
  FOR EACH ROW EXECUTE FUNCTION audit_trigger();
```
