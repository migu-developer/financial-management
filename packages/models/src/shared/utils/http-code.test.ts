import { HttpCode } from './http-code';

describe('HttpCode', () => {
  it('has all expected values', () => {
    const numericValues = Object.values(HttpCode).filter(
      (v) => typeof v === 'number',
    );
    expect(numericValues).toEqual([
      HttpCode.BAD_REQUEST,
      HttpCode.UNAUTHORIZED,
      HttpCode.FORBIDDEN,
      HttpCode.NOT_FOUND,
      HttpCode.METHOD_NOT_ALLOWED,
      HttpCode.INTERNAL_SERVER_ERROR,
    ]);
  });

  it('has unique values', () => {
    const numericValues = Object.values(HttpCode).filter(
      (v) => typeof v === 'number',
    );
    expect(new Set(numericValues).size).toBe(numericValues.length);
  });

  it('has correct values', () => {
    expect(HttpCode.BAD_REQUEST).toBe(400);
    expect(HttpCode.UNAUTHORIZED).toBe(401);
    expect(HttpCode.FORBIDDEN).toBe(403);
    expect(HttpCode.NOT_FOUND).toBe(404);
    expect(HttpCode.METHOD_NOT_ALLOWED).toBe(405);
    expect(HttpCode.INTERNAL_SERVER_ERROR).toBe(500);
  });
});
