import { CfnOutput, Fn } from 'aws-cdk-lib';
import { CfnApp, CfnBranch } from 'aws-cdk-lib/aws-amplify';
import { BaseStack, BaseStackProps } from '@core/base-stack';
import { importFromVersion } from '@utils/cross-version';
import type { Construct } from 'constructs';
import { StackDeps } from '@utils/types';

export type AmplifyStage = 'PRODUCTION' | 'DEVELOPMENT';
export type AmplifyPlatform = 'WEB' | 'MOBILE';

export interface AmplifyHostingStackProps extends BaseStackProps {
  /** Optional: only needed if this stack depends on other v2 stacks. */
  readonly deps?: StackDeps;
  /** Default branch to create (e.g. main). */
  readonly defaultBranchName: string;
  /** GitHub repository URL. */
  readonly repository: string;
  /**
   * GitHub access token (plain string).
   * Use this OR githubTokenSecretArn, not both.
   */
  readonly accessTokenName: string;
  /** Amplify app platform. */
  readonly platform: AmplifyPlatform;
  /** Enable branch auto deletion. */
  readonly stage: AmplifyStage;
  /**
   * If true (default), every push to the branch triggers a build.
   * Set to false for prod (e.g. us-east-2) so deploys only run when triggered (e.g. via API on release).
   */
  readonly enableAutoBuild: boolean;
  /**
   * Monorepo app root: path from repo root where this front lives (e.g. client/main).
   * Amplify uses this to run the build from that directory and to load amplify.yml from there.
   */
  readonly appRoot: string;
}

/**
 * Amplify Hosting stack for the client app (web, then mobile).
 * Imports from v1: Auth (UserPoolId, UserPoolClientId, IdentityPoolId) and Assets (AssetsBucketName).
 * Passes them as app-level environment variables for the frontend build.
 *
 * Build spec: the app uses {appRoot}/amplify.yml. appRoot is passed as AMPLIFY_MONOREPO_APP_ROOT so Amplify uses that directory.
 *
 * Token: pass either accessToken (plain) or githubTokenSecretArn (Secrets Manager).
 * When using a secret, set AMPLIFY_GITHUB_TOKEN_SECRET_ARN (and optionally AMPLIFY_GITHUB_TOKEN_SECRET_KEY for JSON secrets).
 * Deploy order: deploy v1 first, then deploy v2. Deploy this stack per region (e.g. us-east-1, us-east-2).
 */
export class AmplifyHostingStack extends BaseStack {
  public readonly amplifyApp: CfnApp;
  public readonly defaultBranch: CfnBranch;

  constructor(scope: Construct, id: string, props: AmplifyHostingStackProps) {
    const { version, stackName, description } = props;
    super(scope, id, { version, stackName, description });

    const appName = props.stackName;
    const defaultBranchName = props.defaultBranchName;

    // ── Import from v1 ─────────────────────────────────
    const userPoolId = importFromVersion(this, 'v1', 'Auth', 'UserPoolId');
    const userPoolClientId = importFromVersion(
      this,
      'v1',
      'Auth',
      'UserPoolClientId',
    );
    const identityPoolId = importFromVersion(
      this,
      'v1',
      'Auth',
      'IdentityPoolId',
    );
    const assetsBucketName = importFromVersion(
      this,
      'v1',
      'Assets',
      'AssetsBucketName',
    );

    const envVars: CfnApp.EnvironmentVariableProperty[] = [
      { name: 'AMPLIFY_MONOREPO_APP_ROOT', value: props.appRoot },
      { name: 'USER_POOL_ID', value: userPoolId },
      { name: 'USER_POOL_CLIENT_ID', value: userPoolClientId },
      { name: 'IDENTITY_POOL_ID', value: identityPoolId },
      { name: 'ASSETS_BUCKET_NAME', value: assetsBucketName },
    ];

    /** SPA rewrite: non-file requests serve index.html for client-side routing (React Native web). */
    const customRules: CfnApp.CustomRuleProperty[] = [
      {
        source:
          '</^[^.]+$|\\.(?!(css|gif|ico|jpg|js|png|txt|svg|woff|woff2|ttf|map|json|webp)$)([^.]+$)/>',
        target: '/index.html',
        status: '200',
      },
    ];

    /** Dynamic reference: CloudFormation resolves the secret at deploy time; the token never appears in the template. */
    const accessTokenRef = Fn.join('', [
      '{{resolve:secretsmanager:',
      props.accessTokenName,
      '}}',
    ]);

    this.amplifyApp = new CfnApp(this, 'ClientApp', {
      name: appName,
      description: `Client app (web/mobile) for Financial Management (${version})`,
      environmentVariables: envVars,
      repository: props.repository,
      accessToken: accessTokenRef,
      platform: props.platform,
      enableBranchAutoDeletion: true,
      customRules,
    });

    this.defaultBranch = new CfnBranch(this, 'MainBranch', {
      appId: this.amplifyApp.attrAppId,
      branchName: defaultBranchName,
      enableAutoBuild: props.enableAutoBuild,
      stage: props.stage,
    });
    this.defaultBranch.addDependency(this.amplifyApp);

    new CfnOutput(this, 'AmplifyAppId', {
      value: this.amplifyApp.attrAppId,
      description: 'Amplify App ID for the client',
    });
    new CfnOutput(this, 'AmplifyAppDefaultDomain', {
      value: this.amplifyApp.attrDefaultDomain,
      description: 'Default domain for the Amplify app',
    });
    new CfnOutput(this, 'AmplifyAppArn', {
      value: this.amplifyApp.attrArn,
      description: 'ARN of the Amplify app',
    });
  }
}
