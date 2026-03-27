import type { APIGatewayProxyResult } from '@services/shared/domain/interfaces/response';

export function addCors(
  result: APIGatewayProxyResult,
): APIGatewayProxyResult['headers'] {
  const headers: APIGatewayProxyResult['headers'] = {
    ...(result.headers ?? {}),
    'Access-Control-Allow-Origin': process.env['ALLOWED_ORIGINS'] ?? '',
    'Access-Control-Allow-Credentials': true,
    'Access-Control-Allow-Methods': process.env['ALLOWED_METHODS'] ?? '',
  };

  return headers;
}
