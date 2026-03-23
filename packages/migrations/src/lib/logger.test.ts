// logger.ts captures console.log/error references at import time,
// so we must spy BEFORE the module loads.
const logSpy = jest.spyOn(console, 'log').mockImplementation();
const errorSpy = jest.spyOn(console, 'error').mockImplementation();

import { logger } from './logger';

afterAll(() => {
  logSpy.mockRestore();
  errorSpy.mockRestore();
});

beforeEach(() => {
  logSpy.mockClear();
  errorSpy.mockClear();
});

describe('logger', () => {
  it('info writes to console.log with [INFO] prefix', () => {
    logger.info('test message');
    expect(logSpy).toHaveBeenCalledTimes(1);
    const output = (logSpy.mock.calls[0] ?? []).join(' ');
    expect(output).toContain('[INFO]');
    expect(output).toContain('test message');
  });

  it('success writes to console.log with [OK] prefix', () => {
    logger.success('done');
    expect(logSpy).toHaveBeenCalledTimes(1);
    const output = (logSpy.mock.calls[0] ?? []).join(' ');
    expect(output).toContain('[OK]');
    expect(output).toContain('done');
  });

  it('warn writes to console.log with [WARN] prefix', () => {
    logger.warn('careful');
    expect(logSpy).toHaveBeenCalledTimes(1);
    const output = (logSpy.mock.calls[0] ?? []).join(' ');
    expect(output).toContain('[WARN]');
    expect(output).toContain('careful');
  });

  it('error writes to console.error with [ERROR] prefix', () => {
    logger.error('failed');
    expect(errorSpy).toHaveBeenCalledTimes(1);
    const output = (errorSpy.mock.calls[0] ?? []).join(' ');
    expect(output).toContain('[ERROR]');
    expect(output).toContain('failed');
  });

  it('migration writes version and description to console.log', () => {
    logger.migration('1.0.0', 'Create tables');
    expect(logSpy).toHaveBeenCalledTimes(1);
    const output = (logSpy.mock.calls[0] ?? []).join(' ');
    expect(output).toContain('1.0.0');
    expect(output).toContain('Create tables');
  });

  it('divider writes a line of dashes to console.log', () => {
    logger.divider();
    expect(logSpy).toHaveBeenCalledTimes(1);
    const output = (logSpy.mock.calls[0] ?? []).join(' ');
    expect(output).toContain('─');
  });
});
