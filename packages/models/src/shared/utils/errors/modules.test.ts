import { ModuleError, ModuleNotFoundError } from './modules';
import { HttpCode } from '@packages/models/shared/utils/http-code';

describe('ModuleError (abstract)', () => {
  class ConcreteError extends ModuleError {
    getMessage(): string {
      return this.params['message'] as string;
    }
    getCode(): number {
      return this.code;
    }
  }

  it('defaults to NOT_IMPLEMENTED when no code is provided', () => {
    const error = new ConcreteError();
    expect(error.code).toBe(HttpCode.NOT_IMPLEMENTED);
  });

  it('uses the provided code', () => {
    const error = new ConcreteError({}, HttpCode.BAD_REQUEST);
    expect(error.code).toBe(HttpCode.BAD_REQUEST);
  });

  it('stores params and exposes them', () => {
    const params = { message: 'custom', extra: 42 };
    const error = new ConcreteError(params, HttpCode.FORBIDDEN);
    expect(error.params).toEqual(params);
  });

  it('sets Error.message from params.message', () => {
    const error = new ConcreteError({ message: 'test message' });
    expect(error.message).toBe('test message');
  });

  it('sets Error.cause from params.cause', () => {
    const cause = new Error('root cause');
    const error = new ConcreteError({ message: 'wrapped', cause });
    expect(error.cause).toBe(cause);
  });

  it('is an instance of Error', () => {
    const error = new ConcreteError();
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(ModuleError);
  });

  it('defaults params to empty object', () => {
    const error = new ConcreteError();
    expect(error.params).toEqual({});
  });
});

describe('ModuleNotFoundError', () => {
  it('returns "Module not found" from getMessage()', () => {
    const error = new ModuleNotFoundError();
    expect(error.getMessage()).toBe('Module not found');
  });

  it('returns NOT_FOUND (404) from getCode()', () => {
    const error = new ModuleNotFoundError();
    expect(error.getCode()).toBe(HttpCode.NOT_FOUND);
  });

  it('inherits from ModuleError and Error', () => {
    const error = new ModuleNotFoundError();
    expect(error).toBeInstanceOf(ModuleError);
    expect(error).toBeInstanceOf(Error);
  });

  it('preserves the cause when provided', () => {
    const cause = new TypeError('bad lookup');
    const error = new ModuleNotFoundError(cause);
    expect(error.cause).toBe(cause);
  });

  it('has undefined cause when omitted', () => {
    const error = new ModuleNotFoundError();
    expect(error.cause).toBeUndefined();
  });

  it('can be caught as ModuleError', () => {
    expect.assertions(1);
    try {
      throw new ModuleNotFoundError();
    } catch (e) {
      expect(e).toBeInstanceOf(ModuleError);
    }
  });
});
