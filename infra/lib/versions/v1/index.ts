import type { NamedStackFactory, StackDeps } from '@utils/types';
import { AssetsBucketStack } from './assets-bucket-stack';
import { CognitoStack } from './cognito-stack';
import type { Construct } from 'constructs';
import { fullStackResource } from '@config/entry-config';
import { ActiveStack } from './stacks';

const createAssetsStack: NamedStackFactory = {
  name: ActiveStack.ASSETS,
  create: (scope: Construct, version: string, deps: StackDeps) =>
    new AssetsBucketStack(
      scope,
      fullStackResource(version, `${ActiveStack.ASSETS}Stack`),
      {
        version,
        stackName: fullStackResource(version, ActiveStack.ASSETS),
        deps,
        assetsBucketPrefix: process.env.ASSETS_BUCKET_PREFIX ?? '',
        description:
          'S3 bucket for project assets and transactional emails (migudev-fm-{region}-assets).',
      },
    ),
};

const createAuthStack: NamedStackFactory = {
  name: ActiveStack.AUTH,
  create: (scope: Construct, version: string, deps: StackDeps) =>
    new CognitoStack(
      scope,
      fullStackResource(version, `${ActiveStack.AUTH}Stack`),
      {
        version,
        stackName: fullStackResource(version, ActiveStack.AUTH),
        deps,
        description:
          'Cognito User Pool with Google, Facebook, Apple, Microsoft IdPs, TOTP MFA, SMS and SES.',
        googleClientId: process.env.GOOGLE_CLIENT_ID ?? '',
        googleClientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
        facebookAppId: process.env.FACEBOOK_APP_ID ?? '',
        facebookAppSecret: process.env.FACEBOOK_APP_SECRET ?? '',
        appleClientId: process.env.APPLE_CLIENT_ID ?? '',
        appleTeamId: process.env.APPLE_TEAM_ID ?? '',
        appleKeyId: process.env.APPLE_KEY_ID ?? '',
        applePrivateKey: process.env.APPLE_PRIVATE_KEY ?? '',
        microsoftClientId: process.env.MICROSOFT_CLIENT_ID ?? '',
        microsoftClientSecret: process.env.MICROSOFT_CLIENT_SECRET ?? '',
        microsoftTenantId: process.env.MICROSOFT_TENANT_ID ?? '',
        domainPrefix: process.env.COGNITO_DOMAIN_PREFIX ?? '',
        callbackUrls: (process.env.COGNITO_CALLBACK_URLS || '')
          .split(',')
          .map((u) => u.trim()),
        logoutUrls: (process.env.COGNITO_LOGOUT_URLS || '')
          .split(',')
          .map((u) => u.trim()),
        sesFromEmail: process.env.SES_FROM_EMAIL ?? '',
        sesReplyTo: process.env.SES_REPLY_TO ?? '',
        snsRegion: process.env.AWS_REGION ?? '',
        snsMonthlySpendLimit: process.env.SNS_MONTHLY_SPEND_LIMIT ?? '1',
        smsBlockedCountries: (process.env.SMS_BLOCKED_COUNTRIES ?? '')
          .split(',')
          .map((c) => c.trim())
          .filter(Boolean),
        removalProtect: process.env.COGNITO_REMOVAL_PROTECT === 'true',
        cognitoEmailsPrefix: process.env.COGNITO_EMAILS_PREFIX ?? '',
        databaseUrl: process.env.DATABASE_URL ?? '',
        databaseReadonlyUrl: process.env.DATABASE_READONLY_URL ?? '',
      },
    ),
};

export const v1Stacks: NamedStackFactory[] = [
  createAssetsStack,
  createAuthStack,
];
