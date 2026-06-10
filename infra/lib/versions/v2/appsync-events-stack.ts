import { BaseStack, BaseStackProps } from '@core/base-stack';
import { exportForCrossVersion, importFromVersion } from '@utils/cross-version';
import {
  AppSyncAuthorizationType,
  ChannelNamespace,
  EventApi,
} from 'aws-cdk-lib/aws-appsync';
import { UserPool } from 'aws-cdk-lib/aws-cognito';
import { Construct } from 'constructs';

export interface AppSyncEventsStackProps extends BaseStackProps {
  readonly stage: string;
}

/**
 * AppSync Events API for real-time chat response delivery.
 *
 * Auth model:
 * - Clients connect & subscribe with Cognito User Pool JWT (USER_POOL).
 * - Backend Lambdas publish using IAM (signed SigV4 from Step Functions / Lambda role).
 *
 * Channel namespace `chat` will be used as `chat/{userId}/responses` by the
 * chat handler Lambdas in the next stage of Phase 1.
 *
 * Exports for cross-version consumption:
 * - EventApiId, EventApiArn, HttpDns, RealtimeDns, ChannelNamespaceName
 */
export class AppSyncEventsStack extends BaseStack {
  public readonly eventApi: EventApi;
  public readonly chatNamespace: ChannelNamespace;
  public static readonly CHAT_NAMESPACE_NAME = 'chat';

  constructor(scope: Construct, id: string, props: AppSyncEventsStackProps) {
    const { version, stackName, description, stage } = props;
    super(scope, id, { version, stackName, description });

    // ── Import Cognito User Pool from v1 ─────────────────────
    const userPoolArn = importFromVersion(this, 'v1', 'Auth', 'UserPoolArn');
    const userPool = UserPool.fromUserPoolArn(
      this,
      `${stackName}-ImportedUserPool`,
      userPoolArn,
    );

    // ── Event API ──────────────────────────────────────────
    // Two auth providers:
    //   1. USER_POOL — clients connect, subscribe and (optionally) publish with JWT
    //   2. IAM       — backend services publish via SigV4 with explicit grants
    this.eventApi = new EventApi(this, `${stackName}-EventApi`, {
      apiName: `fm-${stage}-chat-events`,
      ownerContact: 'Financial Management Team',
      authorizationConfig: {
        authProviders: [
          {
            authorizationType: AppSyncAuthorizationType.USER_POOL,
            cognitoConfig: { userPool },
          },
          { authorizationType: AppSyncAuthorizationType.IAM },
        ],
        connectionAuthModeTypes: [AppSyncAuthorizationType.USER_POOL],
        defaultPublishAuthModeTypes: [AppSyncAuthorizationType.IAM],
        defaultSubscribeAuthModeTypes: [AppSyncAuthorizationType.USER_POOL],
      },
    });

    // ── Channel Namespace: chat ─────────────────────────────
    // Clients will subscribe to `chat/{userId}/responses`; the backend publishes
    // to that same channel after the Step Function completes.
    this.chatNamespace = this.eventApi.addChannelNamespace(
      AppSyncEventsStack.CHAT_NAMESPACE_NAME,
    );

    // ── Cross-version exports ──────────────────────────────
    exportForCrossVersion(
      this,
      'EventApiId',
      this.eventApi.apiId,
      version,
      'AppSyncEvents',
    );
    exportForCrossVersion(
      this,
      'EventApiArn',
      this.eventApi.apiArn,
      version,
      'AppSyncEvents',
    );
    exportForCrossVersion(
      this,
      'HttpDns',
      this.eventApi.httpDns,
      version,
      'AppSyncEvents',
    );
    exportForCrossVersion(
      this,
      'RealtimeDns',
      this.eventApi.realtimeDns,
      version,
      'AppSyncEvents',
    );
    exportForCrossVersion(
      this,
      'ChatNamespaceName',
      AppSyncEventsStack.CHAT_NAMESPACE_NAME,
      version,
      'AppSyncEvents',
    );
  }
}
