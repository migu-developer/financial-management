import { MethodNotImplementedError, RouteNotFoundError } from './methods';
import { ModuleError } from './modules';
import { HttpCode } from '@packages/models/shared/utils/http-code';

describe('MethodNotImplementedError', () => {
  it('returns "Method not implemented" from getMessage()', () => {
    const error = new MethodNotImplementedError();
    expect(error.getMessage()).toBe('Method not implemented');
  });

  it('returns NOT_IMPLEMENTED (501) from getCode()', () => {
    const error = new MethodNotImplementedError();
    expect(error.getCode()).toBe(HttpCode.NOT_IMPLEMENTED);
  });

  it('inherits from ModuleError and Error', () => {
    const error = new MethodNotImplementedError();
    expect(error).toBeInstanceOf(ModuleError);
    expect(error).toBeInstanceOf(Error);
  });

  it('sets Error.message correctly', () => {
    expect(new MethodNotImplementedError().message).toBe(
      'Method not implemented',
    );
  });

  it('preserves cause when provided', () => {
    const root = new Error('unsupported verb');
    const error = new MethodNotImplementedError(root);
    expect(error.cause).toBe(root);
    expect(error.getMessage()).toBe('Method not implemented');
  });

  it('has undefined cause when omitted', () => {
    expect(new MethodNotImplementedError().cause).toBeUndefined();
  });
});

describe('RouteNotFoundError', () => {
  it('returns "Route not found" from getMessage()', () => {
    expect(new RouteNotFoundError().getMessage()).toBe('Route not found');
  });

  it('returns NOT_FOUND (404) from getCode()', () => {
    expect(new RouteNotFoundError().getCode()).toBe(HttpCode.NOT_FOUND);
  });

  it('inherits from ModuleError and Error', () => {
    const error = new RouteNotFoundError();
    expect(error).toBeInstanceOf(ModuleError);
    expect(error).toBeInstanceOf(Error);
  });

  it('preserves cause', () => {
    const cause = new URIError('bad path');
    expect(new RouteNotFoundError(cause).cause).toBe(cause);
  });

  it('is distinguishable from MethodNotImplementedError', () => {
    expect(new RouteNotFoundError()).not.toBeInstanceOf(
      MethodNotImplementedError,
    );
    expect(new MethodNotImplementedError()).not.toBeInstanceOf(
      RouteNotFoundError,
    );
  });

  it('returns different HTTP codes for route vs method errors', () => {
    const errors: ModuleError[] = [
      new RouteNotFoundError(),
      new MethodNotImplementedError(),
    ];
    expect(errors.map((e) => e.getCode())).toEqual([
      HttpCode.NOT_FOUND,
      HttpCode.NOT_IMPLEMENTED,
    ]);
  });
});
