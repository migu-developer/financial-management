import type {
  UserProfile,
  CreateUserInput,
  PatchUserInput,
} from '@packages/models/users/types';
import type { UserRepository } from '@services/users/domain/repositories/user.repository';
import type { DatabaseService } from '@services/shared/domain/services/database';
import {
  DataNotDefinedError,
  ModuleNotFoundError,
} from '@packages/models/shared/utils/errors';

const USER_COLUMNS = `
  id, uid, email, first_name, last_name, identities, locale, picture, phone,
  document_id, email_verified, phone_verified, provider_id,
  created_at, updated_at, created_by, modified_by
`.trim();

export class PostgresUserRepository implements UserRepository {
  constructor(private readonly dbService: DatabaseService) {}

  async findByUid(uid: string): Promise<UserProfile | null> {
    const rows = await this.dbService.queryReadOnly<UserProfile>(
      `SELECT ${USER_COLUMNS}
       FROM financial_management.users
       WHERE uid = $1`,
      [uid],
    );
    return rows[0] ?? null;
  }

  async create(
    input: CreateUserInput,
    createdBy: string,
  ): Promise<UserProfile> {
    const setClauses: string[] = ['uid', 'email', 'created_by', 'modified_by'];
    const values: unknown[] = [input.uid, input.email, createdBy, createdBy];
    let paramIndex = 5;

    if (input.first_name !== undefined) {
      setClauses.push('first_name');
      values.push(input.first_name);
      paramIndex++;
    }
    if (input.last_name !== undefined) {
      setClauses.push('last_name');
      values.push(input.last_name);
      paramIndex++;
    }
    if (input.locale !== undefined) {
      setClauses.push('locale');
      values.push(input.locale);
      paramIndex++;
    }
    if (input.picture !== undefined) {
      setClauses.push('picture');
      values.push(input.picture);
      paramIndex++;
    }
    if (input.phone !== undefined) {
      setClauses.push('phone');
      values.push(input.phone);
      paramIndex++;
    }
    if (input.identities !== undefined) {
      setClauses.push('identities');
      values.push(input.identities);
      paramIndex++;
    }
    if (input.provider_id !== undefined) {
      setClauses.push('provider_id');
      values.push(input.provider_id);
      paramIndex++;
    }

    // Suppress unused variable — paramIndex tracks the next placeholder position
    void paramIndex;

    const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');

    const rows = await this.dbService.query<UserProfile>(
      `INSERT INTO financial_management.users (${setClauses.join(', ')})
       VALUES (${placeholders})
       RETURNING ${USER_COLUMNS}`,
      values,
    );
    if (!rows[0]) throw new DataNotDefinedError('Failed to create user');
    return rows[0];
  }

  async patch(
    uid: string,
    input: PatchUserInput,
    modifiedBy: string,
  ): Promise<UserProfile> {
    const setClauses: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (input.first_name !== undefined) {
      setClauses.push(`first_name = $${paramIndex++}`);
      values.push(input.first_name);
    }
    if (input.last_name !== undefined) {
      setClauses.push(`last_name = $${paramIndex++}`);
      values.push(input.last_name);
    }
    if (input.locale !== undefined) {
      setClauses.push(`locale = $${paramIndex++}`);
      values.push(input.locale);
    }
    if (input.picture !== undefined) {
      setClauses.push(`picture = $${paramIndex++}`);
      values.push(input.picture);
    }
    if (input.phone !== undefined) {
      setClauses.push(`phone = $${paramIndex++}`);
      values.push(input.phone);
    }
    if (input.document_id !== undefined) {
      setClauses.push(`document_id = $${paramIndex++}`);
      values.push(input.document_id);
    }

    setClauses.push(`modified_by = $${paramIndex++}`);
    values.push(modifiedBy);

    const uidParam = paramIndex;
    values.push(uid);

    const rows = await this.dbService.query<UserProfile>(
      `UPDATE financial_management.users
       SET ${setClauses.join(', ')}
       WHERE uid = $${uidParam}
       RETURNING ${USER_COLUMNS}`,
      values,
    );
    if (!rows[0]) throw new ModuleNotFoundError();
    return rows[0];
  }
}
