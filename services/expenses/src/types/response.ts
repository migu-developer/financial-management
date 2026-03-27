/**
 * Works with Lambda Proxy Integration for Rest API or HTTP API integration Payload Format version 1.0
 * @see - https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-develop-integrations-lambda.html
 */
export interface APIGatewayProxyResult {
  statusCode: number;
  headers?:
    | {
        [header: string]: boolean | number | string;
      }
    | undefined;
  multiValueHeaders?:
    | {
        [header: string]: Array<boolean | number | string>;
      }
    | undefined;
  body: string;
  isBase64Encoded?: boolean | undefined;
}
