import type { NamedStackFactory, StackDeps } from '@utils/types';
import { AmplifyHostingStack, AmplifyStage } from './amplify-hosting-stack';
import type { Construct } from 'constructs';
import { fullStackResource } from '@config/entry-config';
import { ActiveStack } from './stacks';
import { LambdaExpensesStack } from './lambda-expenses-stack';

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
        allowedOrigins: (process.env.ALLOWED_ORIGINS ?? '')
          .split(',')
          .map((origin) => origin.trim()),
      },
    ),
};

export const v2Stacks: NamedStackFactory[] = [
  createLambdaExpensesStack,
  createAmplifyHostingStack,
];
