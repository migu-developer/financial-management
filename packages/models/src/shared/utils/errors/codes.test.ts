import { ErrorCode } from './codes';

describe('ErrorCode', () => {
  it('has all expected values', () => {
    expect(Object.values(ErrorCode)).toEqual([
      ErrorCode.BAD_REQUEST_BODY,
      ErrorCode.BAD_REQUEST_PARAMETERS,
      ErrorCode.UNAUTHORIZED,
      ErrorCode.ACCESS_DENIED,
    ]);
  });

  it('has unique values', () => {
    expect(new Set(Object.values(ErrorCode)).size).toBe(
      Object.values(ErrorCode).length,
    );
  });

  it('has correct values', () => {
    expect(ErrorCode.BAD_REQUEST_BODY).toBe('BAD_REQUEST_BODY');
    expect(ErrorCode.BAD_REQUEST_PARAMETERS).toBe('BAD_REQUEST_PARAMETERS');
    expect(ErrorCode.UNAUTHORIZED).toBe('UNAUTHORIZED');
    expect(ErrorCode.ACCESS_DENIED).toBe('ACCESS_DENIED');
  });
});
