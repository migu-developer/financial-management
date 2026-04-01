export interface PaginationParams {
  limit: number;
  cursor?: string;
}

export interface PaginatedResult<T> {
  data: T[];
  next_cursor: string | null;
  has_more: boolean;
  total_count?: number;
}

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

export function parsePaginationParams(
  queryLimit?: string,
  queryCursor?: string,
): PaginationParams {
  const raw = queryLimit ? parseInt(queryLimit, 10) : DEFAULT_LIMIT;
  const limit = Number.isNaN(raw)
    ? DEFAULT_LIMIT
    : Math.min(Math.max(raw, 1), MAX_LIMIT);
  return {
    limit,
    ...(queryCursor !== undefined && { cursor: queryCursor }),
  };
}

export function encodeCursor(createdAt: string | Date, id: string): string {
  const iso = createdAt instanceof Date ? createdAt.toISOString() : createdAt;
  return Buffer.from(`${iso}|${id}`).toString('base64url');
}

export function decodeCursor(cursor: string): {
  created_at: string;
  id: string;
} {
  const decoded = Buffer.from(cursor, 'base64url').toString();
  const separatorIndex = decoded.indexOf('|');
  if (separatorIndex === -1) throw new Error('Invalid cursor format');
  return {
    created_at: decoded.slice(0, separatorIndex),
    id: decoded.slice(separatorIndex + 1),
  };
}

export function buildPaginatedResult<
  T extends { created_at: string | Date; id: string },
>(rows: T[], limit: number): PaginatedResult<T> {
  const has_more = rows.length > limit;
  const data = has_more ? rows.slice(0, limit) : rows;
  const lastItem = data[data.length - 1];
  const next_cursor =
    has_more && lastItem
      ? encodeCursor(lastItem.created_at, lastItem.id)
      : null;
  return { data, next_cursor, has_more };
}
