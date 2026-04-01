import { LoggerServiceImplementation } from './LoggerServiceImp';
import { Logger } from '@aws-lambda-powertools/logger';

const mockInfo = jest.fn();
const mockError = jest.fn();
const mockWarn = jest.fn();

jest.mock('@aws-lambda-powertools/logger', () => ({
  Logger: jest.fn().mockImplementation(() => ({
    info: mockInfo,
    error: mockError,
    warn: mockWarn,
  })),
}));

describe('LoggerServiceImplementation', () => {
  let logger: LoggerServiceImplementation;

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env['PROJECT_PREFIX'];
    logger = new LoggerServiceImplementation();
  });

  it('uses default serviceName "app" when no env var or param', () => {
    expect(jest.mocked(Logger)).toHaveBeenCalledWith({
      serviceName: 'app',
    });
  });

  it('uses PROJECT_PREFIX env var when set', () => {
    process.env['PROJECT_PREFIX'] = 'financial-management';
    new LoggerServiceImplementation();
    expect(jest.mocked(Logger)).toHaveBeenLastCalledWith({
      serviceName: 'financial-management',
    });
  });

  it('uses constructor param over env var', () => {
    process.env['PROJECT_PREFIX'] = 'from-env';
    new LoggerServiceImplementation('from-param');
    expect(jest.mocked(Logger)).toHaveBeenLastCalledWith({
      serviceName: 'from-param',
    });
  });

  it('delegates info() to the underlying logger', () => {
    logger.info('hello world');
    expect(mockInfo).toHaveBeenCalledWith('hello world');
  });

  it('delegates info() with extra input', () => {
    logger.info('request received', { userId: '123' });
    expect(mockInfo).toHaveBeenCalledWith('request received', {
      userId: '123',
    });
  });

  it('delegates error() to the underlying logger', () => {
    logger.error('something failed');
    expect(mockError).toHaveBeenCalledWith('something failed');
  });

  it('delegates error() with extra input', () => {
    const err = new Error('boom');
    logger.error('uncaught error', err);
    expect(mockError).toHaveBeenCalledWith('uncaught error', err);
  });

  it('delegates warn() to the underlying logger', () => {
    logger.warn('low memory');
    expect(mockWarn).toHaveBeenCalledWith('low memory');
  });

  it('delegates warn() with extra input', () => {
    logger.warn('slow response', { latencyMs: 3500 });
    expect(mockWarn).toHaveBeenCalledWith('slow response', { latencyMs: 3500 });
  });

  it('does not call error when only info is invoked', () => {
    logger.info('some info');
    expect(mockError).not.toHaveBeenCalled();
    expect(mockWarn).not.toHaveBeenCalled();
  });

  it('does not call info when only error is invoked', () => {
    logger.error('some error');
    expect(mockInfo).not.toHaveBeenCalled();
    expect(mockWarn).not.toHaveBeenCalled();
  });
});
