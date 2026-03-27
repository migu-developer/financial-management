import { addCors } from './cors';
import type { APIGatewayProxyResult } from 'src/types';

const baseResult: APIGatewayProxyResult = { statusCode: 200, body: '{}' };

describe('addCors', () => {
  beforeEach(() => {
    delete process.env['ALLOWED_ORIGINS'];
    delete process.env['ALLOWED_METHODS'];
  });

  it('adds Access-Control-Allow-Origin from env', () => {
    process.env['ALLOWED_ORIGINS'] = 'https://example.com';
    expect(addCors(baseResult)?.['Access-Control-Allow-Origin']).toBe(
      'https://example.com',
    );
  });

  it('adds Access-Control-Allow-Methods from env', () => {
    process.env['ALLOWED_METHODS'] = 'GET,POST';
    expect(addCors(baseResult)?.['Access-Control-Allow-Methods']).toBe(
      'GET,POST',
    );
  });

  it('sets Access-Control-Allow-Credentials to true', () => {
    expect(addCors(baseResult)?.['Access-Control-Allow-Credentials']).toBe(
      true,
    );
  });

  it('falls back to empty string when env vars are not set', () => {
    const headers = addCors(baseResult);
    expect(headers?.['Access-Control-Allow-Origin']).toBe('');
    expect(headers?.['Access-Control-Allow-Methods']).toBe('');
  });

  it('preserves existing headers from result', () => {
    const result: APIGatewayProxyResult = {
      ...baseResult,
      headers: { 'X-Custom': 'value' },
    };
    expect(addCors(result)?.['X-Custom']).toBe('value');
  });

  it('CORS headers override existing headers with same key', () => {
    process.env['ALLOWED_ORIGINS'] = 'https://new.com';
    const result: APIGatewayProxyResult = {
      ...baseResult,
      headers: { 'Access-Control-Allow-Origin': 'old' },
    };
    expect(addCors(result)?.['Access-Control-Allow-Origin']).toBe(
      'https://new.com',
    );
  });
});
