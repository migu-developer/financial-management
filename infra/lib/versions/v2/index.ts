import type { NamedStackFactory, StackDeps } from '@utils/types';
import { AmplifyHostingStack, AmplifyStage } from './amplify-hosting-stack';
import type { Construct } from 'constructs';
import { fullStackResource } from '@config/entry-config';
import { ActiveStack } from './stacks';
import { ApiGatewayStack } from './api-gateway-stack';
import { LambdaExpensesStack } from './lambda-expenses-stack';
import { LambdaDocumentsStack } from './lambda-documents-stack';
import { LambdaCurrenciesStack } from './lambda-currencies-stack';
import { LambdaUsersStack } from './lambda-users-stack';
import { ApiDocsStack } from './api-docs-stack';

const createApiGatewayStack: NamedStackFactory = {
  name: 'ApiGateway',
  create: (scope: Construct, version: string, deps: StackDeps) =>
    new ApiGatewayStack(
      scope,
      fullStackResource(version, `${ActiveStack.API_GATEWAY}Stack`),
      {
        deps,
        version,
        stackName: fullStackResource(version, ActiveStack.API_GATEWAY),
        description: 'Shared API Gateway for all financial management services',
        allowedOrigins: (process.env.ALLOWED_ORIGINS ?? '')
          .split(',')
          .map((origin) => origin.trim()),
        stage: process.env.STAGE ?? '',
        customDomain: process.env.CUSTOM_DOMAIN || undefined,
        customDomainHostedZoneId:
          process.env.CUSTOM_DOMAIN_HOSTED_ZONE_ID || undefined,
        customDomainPrefix: process.env.API_CUSTOM_DOMAIN_PREFIX ?? '',
      },
    ),
};

const createAmplifyHostingStack: NamedStackFactory = {
  name: 'AmplifyHosting',
  create: (scope: Construct, version: string, deps: StackDeps) =>
    new AmplifyHostingStack(
      scope,
      fullStackResource(version, `${ActiveStack.AMPLIFY_HOSTING}Stack`),
      {
        version,
        stackName: fullStackResource(version, ActiveStack.AMPLIFY_HOSTING),
        deps,
        description:
          'Amplify Hosting for the client app (web then mobile) with Auth and Assets env vars from v1.',
        platform: 'WEB',
        defaultBranchName: process.env.AMPLIFY_DEFAULT_BRANCH ?? '',
        stage: process.env.AMPLIFY_STAGE as AmplifyStage,
        repository: process.env.AMPLIFY_REPOSITORY ?? '',
        accessTokenName: process.env.ACCESS_TOKEN_NAME ?? '',
        enableAutoBuild: process.env.AMPLIFY_ENABLE_AUTO_BUILD === 'true',
        appRoot: process.env.AMPLIFY_CLIENT_MAIN_ROOT ?? '',
        assetsBucketUrl: process.env.ASSETS_BUCKET_URL ?? '',
        applicationUrl: process.env.APPLICATION_URL ?? '',
        customDomain: process.env.AMPLIFY_CUSTOM_DOMAIN || undefined,
        customDomainPrefix: process.env.AMPLIFY_CUSTOM_DOMAIN_PREFIX ?? '',
      },
    ),
};

const createLambdaExpensesStack: NamedStackFactory = {
  name: 'LambdaExpenses',
  create: (scope: Construct, version: string, deps: StackDeps) =>
    new LambdaExpensesStack(
      scope,
      fullStackResource(version, `${ActiveStack.LAMBDA_EXPENSES}Stack`),
      {
        version,
        stackName: fullStackResource(version, ActiveStack.LAMBDA_EXPENSES),
        deps,
        description: 'Lambda function for expenses service',
        databaseUrl: process.env.DATABASE_URL ?? '',
        databaseReadonlyUrl: process.env.DATABASE_READONLY_URL ?? '',
        allowedOrigins: (process.env.ALLOWED_ORIGINS ?? '')
          .split(',')
          .map((origin) => origin.trim()),
      },
    ),
};

const createLambdaDocumentsStack: NamedStackFactory = {
  name: 'LambdaDocuments',
  create: (scope: Construct, version: string, deps: StackDeps) =>
    new LambdaDocumentsStack(
      scope,
      fullStackResource(version, `${ActiveStack.LAMBDA_DOCUMENTS}Stack`),
      {
        version,
        stackName: fullStackResource(version, ActiveStack.LAMBDA_DOCUMENTS),
        deps,
        description: 'Lambda function for documents service',
        databaseUrl: process.env.DATABASE_URL ?? '',
        databaseReadonlyUrl: process.env.DATABASE_READONLY_URL ?? '',
        allowedOrigins: (process.env.ALLOWED_ORIGINS ?? '')
          .split(',')
          .map((origin) => origin.trim()),
      },
    ),
};

const createLambdaCurrenciesStack: NamedStackFactory = {
  name: 'LambdaCurrencies',
  create: (scope: Construct, version: string, deps: StackDeps) =>
    new LambdaCurrenciesStack(
      scope,
      fullStackResource(version, `${ActiveStack.LAMBDA_CURRENCIES}Stack`),
      {
        version,
        stackName: fullStackResource(version, ActiveStack.LAMBDA_CURRENCIES),
        deps,
        description: 'Lambda function for currencies service',
        databaseUrl: process.env.DATABASE_URL ?? '',
        databaseReadonlyUrl: process.env.DATABASE_READONLY_URL ?? '',
        allowedOrigins: (process.env.ALLOWED_ORIGINS ?? '')
          .split(',')
          .map((origin) => origin.trim()),
      },
    ),
};

const createLambdaUsersStack: NamedStackFactory = {
  name: 'LambdaUsers',
  create: (scope: Construct, version: string, deps: StackDeps) =>
    new LambdaUsersStack(
      scope,
      fullStackResource(version, `${ActiveStack.LAMBDA_USERS}Stack`),
      {
        version,
        stackName: fullStackResource(version, ActiveStack.LAMBDA_USERS),
        deps,
        description: 'Lambda function for users service',
        databaseUrl: process.env.DATABASE_URL ?? '',
        databaseReadonlyUrl: process.env.DATABASE_READONLY_URL ?? '',
        allowedOrigins: (process.env.ALLOWED_ORIGINS ?? '')
          .split(',')
          .map((origin) => origin.trim()),
      },
    ),
};

const createApiDocsStack: NamedStackFactory = {
  name: 'ApiDocs',
  create: (scope: Construct, version: string, deps: StackDeps) =>
    new ApiDocsStack(
      scope,
      fullStackResource(version, `${ActiveStack.API_DOCS}Stack`),
      {
        version,
        stackName: fullStackResource(version, ActiveStack.API_DOCS),
        deps,
        description: 'API Gateway documentation parts for all services',
      },
    ),
};

// Order matters:
// 1. ApiGateway first (lambdas depend on it, includes certificate + custom domain)
// 2. Lambda stacks (add resources to the API)
// 3. ApiDocs (documents the fully-built API)
// 4. AmplifyHosting last (references the API URL)
export const v2Stacks: NamedStackFactory[] = [
  createApiGatewayStack,
  createLambdaExpensesStack,
  createLambdaDocumentsStack,
  createLambdaCurrenciesStack,
  createLambdaUsersStack,
  createApiDocsStack,
  createAmplifyHostingStack,
];
