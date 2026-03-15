export interface DashboardUser {
  readonly userId: string;
  readonly fullname: string;
  readonly email: string;
}

/**
 * Compute initials from fullname + email fallback.
 * "John Doe" → "JD", "Alice" → "A", "" + "a@b.com" → "A"
 */
export function computeInitials(fullname: string, email: string): string {
  const parts = fullname.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (
      (parts[0]?.charAt(0) ?? '').toUpperCase() +
      (parts[parts.length - 1]?.charAt(0) ?? '').toUpperCase()
    );
  }
  if (parts.length === 1 && parts[0]!.length > 0) {
    return (parts[0]?.charAt(0) ?? '?').toUpperCase();
  }
  return email[0]?.toUpperCase() ?? '?';
}
