import type { NamedStackFactory, StackDeps } from '@utils/types';
import { AmplifyHostingStack, AmplifyStage } from './amplify-hosting-stack';
import type { Construct } from 'constructs';
import { fullStackResource } from '@config/entry-config';
import { ActiveStack } from './stacks';

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
      },
    ),
};

export const v2Stacks: NamedStackFactory[] = [createAmplifyHostingStack];
