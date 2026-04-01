import {
  ServiceNotImplementedError,
  DataNotDefinedError,
  UnauthorizedError,
} from './services';
import { ModuleError } from './modules';
import { HttpCode } from '@packages/models/shared/utils/http-code';

describe('ServiceNotImplementedError', () => {
  it('returns "Service not implemented" from getMessage()', () => {
    expect(new ServiceNotImplementedError().getMessage()).toBe(
      'Service not implemented',
    );
  });

  it('returns NOT_IMPLEMENTED (501) from getCode()', () => {
    expect(new ServiceNotImplementedError().getCode()).toBe(
      HttpCode.NOT_IMPLEMENTED,
    );
  });

  it('inherits from ModuleError', () => {
    expect(new ServiceNotImplementedError()).toBeInstanceOf(ModuleError);
  });

  it('preserves cause', () => {
    const cause = new Error('missing impl');
    expect(new ServiceNotImplementedError(cause).cause).toBe(cause);
  });
});

describe('DataNotDefinedError', () => {
  it('returns the custom message from getMessage()', () => {
    expect(new DataNotDefinedError('user_id is required').getMessage()).toBe(
      'user_id is required',
    );
  });

  it('returns INTERNAL_SERVER_ERROR (500) from getCode()', () => {
    expect(new DataNotDefinedError('x').getCode()).toBe(
      HttpCode.INTERNAL_SERVER_ERROR,
    );
  });

  it('sets Error.message to the custom message', () => {
    expect(new DataNotDefinedError('currency not set').message).toBe(
      'currency not set',
    );
  });

  it('preserves cause alongside custom message', () => {
    const cause = new TypeError('undefined access');
    const error = new DataNotDefinedError('expense data missing', cause);
    expect(error.getMessage()).toBe('expense data missing');
    expect(error.cause).toBe(cause);
  });

  it('inherits from ModuleError', () => {
    expect(new DataNotDefinedError('test')).toBeInstanceOf(ModuleError);
  });
});

describe('UnauthorizedError', () => {
  it('returns "Unauthorized" from getMessage()', () => {
    expect(new UnauthorizedError().getMessage()).toBe('Unauthorized');
  });

  it('returns UNAUTHORIZED (401) from getCode()', () => {
    expect(new UnauthorizedError().getCode()).toBe(HttpCode.UNAUTHORIZED);
  });

  it('inherits from ModuleError', () => {
    expect(new UnauthorizedError()).toBeInstanceOf(ModuleError);
  });

  it('preserves cause', () => {
    const cause = new Error('token expired');
    expect(new UnauthorizedError(cause).cause).toBe(cause);
  });
});

describe('all service errors catchable as ModuleError', () => {
  it('returns correct codes for each error type', () => {
    const errors: ModuleError[] = [
      new ServiceNotImplementedError(),
      new DataNotDefinedError('test'),
      new UnauthorizedError(),
    ];
    expect(errors.map((e) => e.getCode())).toEqual([
      HttpCode.NOT_IMPLEMENTED,
      HttpCode.INTERNAL_SERVER_ERROR,
      HttpCode.UNAUTHORIZED,
    ]);
  });
});
