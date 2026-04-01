export const UUID_PATTERN =
  '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

export const uuidField = {
  type: 'string' as const,
  pattern: UUID_PATTERN,
};

export const UUID_REGEX = new RegExp(UUID_PATTERN);
