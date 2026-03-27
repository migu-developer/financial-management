import { ResultBodyUndefinedError } from './result';
import { ModuleError } from './modules';
import { HttpCode } from '@packages/models/shared/utils/http-code';

describe('ResultBodyUndefinedError', () => {
  it('returns correct message', () => {
    const error = new ResultBodyUndefinedError();
    expect(error.getMessage()).toBe('Result body is undefined');
  });

  it('returns INTERNAL_SERVER_ERROR code', () => {
    const error = new ResultBodyUndefinedError();
    expect(error.getCode()).toBe(HttpCode.INTERNAL_SERVER_ERROR);
  });

  it('inherits from ModuleError and Error', () => {
    const error = new ResultBodyUndefinedError();
    expect(error).toBeInstanceOf(ModuleError);
    expect(error).toBeInstanceOf(Error);
  });

  it('preserves cause when provided', () => {
    const cause = new Error('json parse failed');
    const error = new ResultBodyUndefinedError(cause);
    expect(error.cause).toBe(cause);
  });

  it('has undefined cause when omitted', () => {
    const error = new ResultBodyUndefinedError();
    expect(error.cause).toBeUndefined();
  });
});
