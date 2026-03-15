import { computeInitials } from './dashboard-user';

describe('computeInitials', () => {
  it('returns two initials for first + last name', () => {
    expect(computeInitials('John Doe', 'j@example.com')).toBe('JD');
  });

  it('returns two initials for first + last when middle name present', () => {
    expect(computeInitials('Anna Maria Lopez', 'a@example.com')).toBe('AL');
  });

  it('returns single initial when only one name word', () => {
    expect(computeInitials('Alice', 'a@example.com')).toBe('A');
  });

  it('falls back to email first letter when fullname is empty', () => {
    expect(computeInitials('', 'user@example.com')).toBe('U');
  });

  it('falls back to ? when both are empty', () => {
    expect(computeInitials('', '')).toBe('?');
  });

  it('returns uppercase initials', () => {
    expect(computeInitials('john doe', 'j@example.com')).toBe('JD');
  });

  it('handles extra whitespace between names', () => {
    expect(computeInitials('  Jane   Smith  ', 'j@example.com')).toBe('JS');
  });
});
