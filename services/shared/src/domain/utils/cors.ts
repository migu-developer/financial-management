import type { APIGatewayProxyResult } from '@services/shared/domain/interfaces/response';
import type { APIGatewayProxyEventHeaders } from '@services/shared/domain/interfaces/request';

export function addCors(
  result: APIGatewayProxyResult,
  requestHeaders?: APIGatewayProxyEventHeaders,
): APIGatewayProxyResult['headers'] {
  const allowedOrigins = (process.env['ALLOWED_ORIGINS'] ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  const requestOrigin =
    requestHeaders?.['origin'] ?? requestHeaders?.['Origin'];
  const origin =
    allowedOrigins.length === 0
      ? ''
      : requestOrigin && allowedOrigins.includes(requestOrigin)
        ? requestOrigin
        : allowedOrigins[0]!;

  return {
    ...(result.headers ?? {}),
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Credentials': true,
    'Access-Control-Allow-Methods': process.env['ALLOWED_METHODS'] ?? '',
  };
}
