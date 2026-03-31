import {
  parsePaginationParams,
  encodeCursor,
  decodeCursor,
  buildPaginatedResult,
} from './pagination';

describe('parsePaginationParams', () => {
  it('uses default limit when not provided', () => {
    const params = parsePaginationParams();
    expect(params.limit).toBe(20);
    expect(params.cursor).toBeUndefined();
  });

  it('parses custom limit', () => {
    const params = parsePaginationParams('50');
    expect(params.limit).toBe(50);
  });

  it('clamps limit to max 100', () => {
    const params = parsePaginationParams('500');
    expect(params.limit).toBe(100);
  });

  it('clamps limit to min 1', () => {
    const params = parsePaginationParams('0');
    expect(params.limit).toBe(1);
  });

  it('uses default for NaN input', () => {
    const params = parsePaginationParams('abc');
    expect(params.limit).toBe(20);
  });

  it('includes cursor when provided', () => {
    const params = parsePaginationParams('20', 'abc123');
    expect(params.cursor).toBe('abc123');
  });

  it('does not include cursor when undefined', () => {
    const params = parsePaginationParams('20', undefined);
    expect(params.cursor).toBeUndefined();
  });
});

describe('encodeCursor / decodeCursor', () => {
  it('roundtrips correctly', () => {
    const createdAt = '2024-01-15T10:30:00Z';
    const id = '550e8400-e29b-41d4-a716-446655440000';
    const cursor = encodeCursor(createdAt, id);
    const decoded = decodeCursor(cursor);
    expect(decoded.created_at).toBe(createdAt);
    expect(decoded.id).toBe(id);
  });

  it('throws on invalid cursor format', () => {
    const invalid = Buffer.from('no-separator').toString('base64url');
    expect(() => decodeCursor(invalid)).toThrow('Invalid cursor format');
  });
});

describe('buildPaginatedResult', () => {
  const makeItem = (name: string, idx: number) => ({
    id: `id-${idx}`,
    name,
    created_at: `2024-01-${String(idx).padStart(2, '0')}T00:00:00Z`,
  });

  it('returns all items when count <= limit', () => {
    const items = [makeItem('a', 1), makeItem('b', 2)];
    const result = buildPaginatedResult(items, 5);
    expect(result.data).toHaveLength(2);
    expect(result.has_more).toBe(false);
    expect(result.next_cursor).toBeNull();
  });

  it('trims extra item and signals has_more when count > limit', () => {
    const items = [makeItem('a', 3), makeItem('b', 2), makeItem('c', 1)];
    const result = buildPaginatedResult(items, 2);
    expect(result.data).toHaveLength(2);
    expect(result.has_more).toBe(true);
    expect(result.next_cursor).not.toBeNull();
  });

  it('cursor points to the last item in data', () => {
    const items = [makeItem('a', 3), makeItem('b', 2), makeItem('c', 1)];
    const result = buildPaginatedResult(items, 2);
    const decoded = decodeCursor(result.next_cursor!);
    expect(decoded.id).toBe('id-2');
    expect(decoded.created_at).toBe('2024-01-02T00:00:00Z');
  });

  it('handles empty array', () => {
    const result = buildPaginatedResult([], 20);
    expect(result.data).toEqual([]);
    expect(result.has_more).toBe(false);
    expect(result.next_cursor).toBeNull();
  });
});
