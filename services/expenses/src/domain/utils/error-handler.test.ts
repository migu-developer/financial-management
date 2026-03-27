import { ErrorHandler } from './error-handler';
import {
  ModuleNotFoundError,
  RouteNotFoundError,
} from '@packages/models/shared/utils/errors';
import { HttpCode } from '@packages/models/shared/utils/http-code';
import type { LoggerService } from '@services/expenses/domain/services/logger';

function makeMockLogger(): LoggerService {
  return { info: jest.fn(), error: jest.fn(), warn: jest.fn() };
}

describe('ErrorHandler.handle', () => {
  it('handles ModuleNotFoundError: correct statusCode and message', () => {
    const result = ErrorHandler.handle(
      new ModuleNotFoundError(),
      makeMockLogger(),
    );
    expect(result.statusCode).toBe(HttpCode.NOT_FOUND);
    expect(JSON.parse(result.body)).toEqual({ message: 'Module not found' });
  });

  it('handles RouteNotFoundError as ModuleError', () => {
    const result = ErrorHandler.handle(
      new RouteNotFoundError(),
      makeMockLogger(),
    );
    expect(result.statusCode).toBe(HttpCode.NOT_FOUND);
    expect(JSON.parse(result.body)).toEqual({ message: 'Route not found' });
  });

  it('handles generic Error: returns 500 and error.message', () => {
    const result = ErrorHandler.handle(
      new Error('something broke'),
      makeMockLogger(),
    );
    expect(result.statusCode).toBe(HttpCode.INTERNAL_SERVER_ERROR);
    expect(JSON.parse(result.body)).toEqual({ message: 'something broke' });
  });

  it('handles unknown (string): returns 500 and generic message', () => {
    const result = ErrorHandler.handle(
      'unexpected string error',
      makeMockLogger(),
    );
    expect(result.statusCode).toBe(HttpCode.INTERNAL_SERVER_ERROR);
    expect(JSON.parse(result.body)).toEqual({
      message: 'Internal server error',
    });
  });

  it('handles unknown (object): returns 500 and generic message', () => {
    const result = ErrorHandler.handle({ code: 42 }, makeMockLogger());
    expect(result.statusCode).toBe(HttpCode.INTERNAL_SERVER_ERROR);
    expect(JSON.parse(result.body)).toEqual({
      message: 'Internal server error',
    });
  });

  it('handles null: returns 500', () => {
    const result = ErrorHandler.handle(null, makeMockLogger());
    expect(result.statusCode).toBe(HttpCode.INTERNAL_SERVER_ERROR);
  });

  it('calls logger.error for ModuleError', () => {
    const logger = makeMockLogger();
    ErrorHandler.handle(new ModuleNotFoundError(), logger);
    expect(logger.error).toHaveBeenCalledTimes(1);
  });

  it('calls logger.error for generic Error', () => {
    const logger = makeMockLogger();
    ErrorHandler.handle(new Error('test'), logger);
    expect(logger.error).toHaveBeenCalledTimes(1);
  });

  it('calls logger.error for unknown errors', () => {
    const logger = makeMockLogger();
    ErrorHandler.handle(null, logger);
    expect(logger.error).toHaveBeenCalledTimes(1);
  });
});
