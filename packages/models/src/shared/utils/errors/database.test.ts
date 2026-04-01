import { HttpCode } from '@packages/models/shared/utils/http-code';
import { DatabaseError } from './database';
import { ModuleError } from './modules';

describe('DatabaseError', () => {
  it('returns default message "Database Error" from getMessage()', () => {
    const error = new DatabaseError();
    expect(error.getMessage()).toBe('Database Error');
  });

  it('returns custom message from getMessage()', () => {
    const error = new DatabaseError('Custom Database Error');
    expect(error.getMessage()).toBe('Custom Database Error');
  });

  it('returns INTERNAL_SERVER_ERROR (500) from getCode()', () => {
    const error = new DatabaseError();
    expect(error.getCode()).toBe(HttpCode.INTERNAL_SERVER_ERROR);
  });

  it('inherits from ModuleError', () => {
    const error = new DatabaseError();
    expect(error).toBeInstanceOf(ModuleError);
  });
});
