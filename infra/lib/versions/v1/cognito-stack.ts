import { RemovalPolicy, SecretValue } from 'aws-cdk-lib';
import {
  AccountRecovery,
  Mfa,
  OAuthScope,
  ProviderAttribute,
  UserPool,
  UserPoolClient,
  UserPoolClientIdentityProvider,
  UserPoolDomain,
  UserPoolEmail,
  UserPoolIdentityProviderApple,
  UserPoolIdentityProviderFacebook,
  UserPoolIdentityProviderGoogle,
  UserPoolIdentityProviderOidc,
  OidcAttributeRequestMethod,
} from 'aws-cdk-lib/aws-cognito';
import { CfnIdentityPool } from 'aws-cdk-lib/aws-cognito';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction, OutputFormat } from 'aws-cdk-lib/aws-lambda-nodejs';
import { LogGroup, RetentionDays } from 'aws-cdk-lib/aws-logs';
import { PolicyStatement, Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import {
  AwsCustomResource,
  AwsCustomResourcePolicy,
  PhysicalResourceId,
} from 'aws-cdk-lib/custom-resources';
import { BaseStack, BaseStackProps } from '@core/base-stack';
import type { AssetsBucketStack } from './assets-bucket-stack';
import { exportForCrossVersion } from '@utils/cross-version';
import type { Construct } from 'constructs';
import { StackDeps } from '@utils/types';
import { join } from 'node:path';
import { ActiveStack } from './stacks';

/**
 * Ensures PEM content has real newlines for Cognito.
 * Env vars / Secrets often store the key with literal "\\n" or "\\r\\n"; Cognito expects proper PEM.
 * Also normalizes CRLF to LF and trims.
 */
export function normalizePemFromEnv(pem: string): string {
  if (!pem || typeof pem !== 'string') return pem;
  return pem
    .replace(/\\r\\n/g, '\n')
    .replace(/\\n/g, '\n')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .trim();
}

export interface CognitoStackProps extends BaseStackProps {
  /** Optional: only needed if this stack depends on other v1 stacks. */
  readonly deps?: StackDeps;

  // Google
  readonly googleClientId: string;
  readonly googleClientSecret: string;
  // Facebook
  readonly facebookAppId: string;
  readonly facebookAppSecret: string;
  // Apple
  readonly appleClientId: string;
  readonly appleTeamId: string;
  readonly appleKeyId: string;
  readonly applePrivateKey: string;
  // Microsoft (OIDC)
  readonly microsoftClientId: string;
  readonly microsoftClientSecret: string;
  readonly microsoftTenantId: string;
  // Cognito General
  readonly domainPrefix: string;
  readonly callbackUrls: string[];
  readonly logoutUrls: string[];
  // SES Email
  readonly sesFromEmail: string;
  readonly sesReplyTo: string;
  // SNS SMS
  readonly snsRegion: string;
  readonly snsMonthlySpendLimit: string;
  readonly smsBlockedCountries: string[];
  // Protection
  readonly removalProtect: boolean;
  readonly cognitoEmailsPrefix: string;
}

/**
 * Cognito User Pool with social identity providers (Google, Facebook, Apple, Microsoft),
 * TOTP MFA required, SMS verification via SNS, and email via SES.
 *
 * Exports values for cross-version consumption (v2 Lambdas):
 * - UserPoolId, UserPoolClientId, IdentityPoolId, UserPoolArn
 */
export class CognitoStack extends BaseStack {
  public readonly userPool: UserPool;
  public readonly userPoolClient: UserPoolClient;
  public readonly userPoolDomain: UserPoolDomain;
  public readonly identityPoolId: string;

  private readonly microsoftUrl: string = `https://login.microsoftonline.com`;

  constructor(scope: Construct, id: string, props: CognitoStackProps) {
    const { version, stackName, description } = props;
    super(scope, id, { version, stackName, description });

    const removalPolicy = props.removalProtect
      ? RemovalPolicy.RETAIN
      : RemovalPolicy.DESTROY;

    // ── Custom Message Lambda Trigger ────────────────────
    const assetsStack = props.deps?.getStack(ActiveStack.ASSETS) as
      | AssetsBucketStack
      | undefined;

    const customMessageFn = new NodejsFunction(this, 'CustomMessageFn', {
      runtime: Runtime.NODEJS_22_X,
      entry: join(
        __dirname,
        '../../../node_modules/@packages/cognito/src/custom-message/index.ts',
      ),
      handler: 'handler',
      bundling: {
        format: OutputFormat.ESM,
        sourceMap: true,
        minify: true,
      },
      description: 'Cognito CustomMessage trigger for multi-language email/SMS',
      environment: {
        ...(assetsStack?.bucket && {
          ASSETS_BUCKET_NAME: assetsStack.bucket.bucketName,
          COGNITO_EMAILS_PREFIX: props.cognitoEmailsPrefix,
        }),
      },
    });

    if (assetsStack?.bucket) {
      assetsStack.bucket.grantRead(customMessageFn);
    }

    // ── User Pool ──────────────────────────────────────
    this.userPool = new UserPool(this, 'UserPool', {
      selfSignUpEnabled: true,
      signInAliases: { email: true, phone: true },
      autoVerify: { email: true, phone: true },
      standardAttributes: {
        givenName: { required: true, mutable: true },
        fullname: { required: true, mutable: true },
        email: { required: true, mutable: true },
        phoneNumber: { required: false, mutable: true },
        birthdate: { required: false, mutable: true },
        profilePicture: { required: false, mutable: true },
        locale: { required: false, mutable: true },
        address: { required: false, mutable: true },
        lastUpdateTime: { required: false, mutable: true },
      },
      mfa: Mfa.REQUIRED,
      mfaSecondFactor: { sms: true, otp: true },
      accountRecovery: AccountRecovery.EMAIL_AND_PHONE_WITHOUT_MFA,
      enableSmsRole: true,
      snsRegion: props.snsRegion,
      lambdaTriggers: {
        customMessage: customMessageFn,
      },
      email: UserPoolEmail.withSES({
        fromEmail: props.sesFromEmail,
        fromName: 'Financial Management',
        replyTo: props.sesReplyTo,
        sesRegion: props.snsRegion,
      }),
      removalPolicy,
    });

    // ── SNS Monthly Spend Limit ───────────────────────
    new AwsCustomResource(this, 'SnsMonthlySpendLimit', {
      onUpdate: {
        service: 'PinpointSMSVoiceV2',
        action: 'SetTextMessageSpendLimitOverride',
        parameters: {
          MonthlyLimit: parseInt(props.snsMonthlySpendLimit, 10),
        },
        physicalResourceId: PhysicalResourceId.of('SnsMonthlySpendLimit'),
        region: props.snsRegion,
      },
      policy: AwsCustomResourcePolicy.fromStatements([
        new PolicyStatement({
          actions: ['sms-voice:SetTextMessageSpendLimitOverride'],
          resources: ['*'],
        }),
      ]),
    });

    // ── SMS Delivery Logging ──────────────────────────
    const smsDeliveryLogs = new LogGroup(this, 'SmsDeliveryLogs', {
      logGroupName: `/aws/sns/sms/${version}`,
      retention: RetentionDays.ONE_MONTH,
      removalPolicy,
    });

    const snsLogsRole = new Role(this, 'SnsLogsRole', {
      assumedBy: new ServicePrincipal('sns.amazonaws.com'),
      description:
        'Allows SNS to publish SMS delivery status to CloudWatch Logs',
    });

    snsLogsRole.addToPolicy(
      new PolicyStatement({
        actions: [
          'logs:CreateLogGroup',
          'logs:CreateLogStream',
          'logs:PutLogEvents',
          'logs:DescribeLogStreams',
        ],
        resources: [
          smsDeliveryLogs.logGroupArn,
          `${smsDeliveryLogs.logGroupArn}:*`,
        ],
      }),
    );

    new AwsCustomResource(this, 'SnsDeliveryLogging', {
      onUpdate: {
        service: 'SNS',
        action: 'setSMSAttributes',
        parameters: {
          attributes: {
            DeliveryStatusIAMRole: snsLogsRole.roleArn,
            DeliveryStatusSuccessSamplingRate: '100',
          },
        },
        physicalResourceId: PhysicalResourceId.of('SnsDeliveryLogging'),
        region: props.snsRegion,
      },
      policy: AwsCustomResourcePolicy.fromStatements([
        new PolicyStatement({
          actions: ['sns:SetSMSAttributes'],
          resources: ['*'],
        }),
        new PolicyStatement({
          actions: ['iam:PassRole'],
          resources: [snsLogsRole.roleArn],
        }),
      ]),
    });

    // ── SMS Protect Configuration (country block) ─────
    if (props.smsBlockedCountries.length > 0) {
      const countryRuleSet = props.smsBlockedCountries.reduce<
        Record<string, { ProtectStatus: string }>
      >(
        (acc, country) => ({ ...acc, [country]: { ProtectStatus: 'BLOCK' } }),
        {},
      );

      const protectConfig = new AwsCustomResource(this, 'SmsProtectConfig', {
        onCreate: {
          service: 'PinpointSMSVoiceV2',
          action: 'CreateProtectConfiguration',
          parameters: { DeletionProtectionEnabled: false },
          physicalResourceId: PhysicalResourceId.fromResponse(
            'ProtectConfigurationId',
          ),
          region: props.snsRegion,
        },
        policy: AwsCustomResourcePolicy.fromStatements([
          new PolicyStatement({
            actions: ['sms-voice:CreateProtectConfiguration'],
            resources: ['*'],
          }),
        ]),
      });

      const protectConfigId = protectConfig.getResponseField(
        'ProtectConfigurationId',
      );

      const protectConfigRules = new AwsCustomResource(
        this,
        'SmsProtectConfigRules',
        {
          onUpdate: {
            service: 'PinpointSMSVoiceV2',
            action: 'UpdateProtectConfigurationCountryRuleSet',
            parameters: {
              ProtectConfigurationId: protectConfigId,
              NumberCapability: 'SMS',
              CountryRuleSetUpdates: countryRuleSet,
            },
            physicalResourceId: PhysicalResourceId.of('SmsProtectConfigRules'),
            region: props.snsRegion,
            outputPaths: [],
          },
          policy: AwsCustomResourcePolicy.fromStatements([
            new PolicyStatement({
              actions: ['sms-voice:UpdateProtectConfigurationCountryRuleSet'],
              resources: ['*'],
            }),
          ]),
        },
      );
      protectConfigRules.node.addDependency(protectConfig);

      const protectConfigDefault = new AwsCustomResource(
        this,
        'SmsProtectConfigDefault',
        {
          onUpdate: {
            service: 'PinpointSMSVoiceV2',
            action: 'SetAccountDefaultProtectConfiguration',
            parameters: {
              ProtectConfigurationId: protectConfigId,
            },
            physicalResourceId: PhysicalResourceId.of(
              'SmsProtectConfigDefault',
            ),
            region: props.snsRegion,
            outputPaths: [],
          },
          policy: AwsCustomResourcePolicy.fromStatements([
            new PolicyStatement({
              actions: ['sms-voice:SetAccountDefaultProtectConfiguration'],
              resources: ['*'],
            }),
          ]),
        },
      );
      protectConfigDefault.node.addDependency(protectConfig);
    }

    // ── Identity Providers ─────────────────────────────

    const googleIdp = new UserPoolIdentityProviderGoogle(this, 'Google', {
      userPool: this.userPool,
      clientId: props.googleClientId,
      clientSecretValue: SecretValue.unsafePlainText(props.googleClientSecret),
      scopes: ['openid', 'email', 'profile'],
      attributeMapping: {
        email: ProviderAttribute.GOOGLE_EMAIL,
        givenName: ProviderAttribute.GOOGLE_GIVEN_NAME,
        familyName: ProviderAttribute.GOOGLE_FAMILY_NAME,
      },
    });

    const facebookIdp = new UserPoolIdentityProviderFacebook(this, 'Facebook', {
      userPool: this.userPool,
      clientId: props.facebookAppId,
      clientSecret: props.facebookAppSecret,
      scopes: ['public_profile', 'email'],
      attributeMapping: {
        email: ProviderAttribute.FACEBOOK_EMAIL,
      },
    });

    // Normalize PEM: env/Secrets often use literal \n or \r\n; Cognito requires real newlines.
    // Ensure APPLE_KEY_ID matches the Key ID of the .p8 file and APPLE_CLIENT_ID is the Services ID.
    const applePrivateKeyPem = normalizePemFromEnv(props.applePrivateKey);
    const appleIdp = new UserPoolIdentityProviderApple(this, 'Apple', {
      userPool: this.userPool,
      clientId: props.appleClientId,
      teamId: props.appleTeamId,
      keyId: props.appleKeyId,
      privateKeyValue: SecretValue.unsafePlainText(applePrivateKeyPem),
      scopes: ['name', 'email'],
      attributeMapping: {
        email: ProviderAttribute.APPLE_EMAIL,
        fullname: ProviderAttribute.APPLE_NAME,
      },
    });

    const microsoftIdp = new UserPoolIdentityProviderOidc(this, 'Microsoft', {
      userPool: this.userPool,
      name: 'Microsoft',
      clientId: props.microsoftClientId,
      clientSecret: props.microsoftClientSecret,
      issuerUrl: `${this.microsoftUrl}/${props.microsoftTenantId}/v2.0`,
      scopes: ['openid', 'email', 'profile'],
      attributeRequestMethod: OidcAttributeRequestMethod.GET,
      attributeMapping: {
        email: ProviderAttribute.other('email'),
        givenName: ProviderAttribute.other('given_name'),
        familyName: ProviderAttribute.other('family_name'),
      },
    });

    // ── User Pool Domain ───────────────────────────────

    this.userPoolDomain = new UserPoolDomain(this, 'UserPoolDomain', {
      userPool: this.userPool,
      cognitoDomain: { domainPrefix: props.domainPrefix },
    });

    // ── User Pool Client ───────────────────────────────

    this.userPoolClient = new UserPoolClient(this, 'UserPoolClient', {
      userPool: this.userPool,
      oAuth: {
        flows: { authorizationCodeGrant: true },
        scopes: [OAuthScope.OPENID, OAuthScope.EMAIL, OAuthScope.PROFILE],
        callbackUrls: props.callbackUrls,
        logoutUrls: props.logoutUrls,
      },
      supportedIdentityProviders: [
        UserPoolClientIdentityProvider.COGNITO,
        UserPoolClientIdentityProvider.GOOGLE,
        UserPoolClientIdentityProvider.FACEBOOK,
        UserPoolClientIdentityProvider.APPLE,
        UserPoolClientIdentityProvider.custom('Microsoft'),
      ],
      authFlows: { userSrp: true },
    });

    // Ensure IdPs are created before the client references them
    this.userPoolClient.node.addDependency(googleIdp);
    this.userPoolClient.node.addDependency(facebookIdp);
    this.userPoolClient.node.addDependency(appleIdp);
    this.userPoolClient.node.addDependency(microsoftIdp);

    // ── Identity Pool (L1) ─────────────────────────────

    const identityPool = new CfnIdentityPool(this, 'IdentityPool', {
      allowUnauthenticatedIdentities: false,
      identityPoolName: `FinancialManagement-${version}-IdentityPool`,
      cognitoIdentityProviders: [
        {
          clientId: this.userPoolClient.userPoolClientId,
          providerName: this.userPool.userPoolProviderName,
        },
      ],
    });

    this.identityPoolId = identityPool.ref;

    // ── Cross-version exports ──────────────────────────

    exportForCrossVersion(
      this,
      'UserPoolId',
      this.userPool.userPoolId,
      version,
      'Auth',
    );
    exportForCrossVersion(
      this,
      'UserPoolClientId',
      this.userPoolClient.userPoolClientId,
      version,
      'Auth',
    );
    exportForCrossVersion(
      this,
      'IdentityPoolId',
      this.identityPoolId,
      version,
      'Auth',
    );
    exportForCrossVersion(
      this,
      'UserPoolArn',
      this.userPool.userPoolArn,
      version,
      'Auth',
    );
    exportForCrossVersion(
      this,
      'CognitoDomain',
      this.userPoolDomain.domainName,
      version,
      'Auth',
    );
  }
}
