import { CfnOutput, Duration } from 'aws-cdk-lib';
import {
  Alarm,
  AlarmRule,
  AlarmState,
  ComparisonOperator,
  CompositeAlarm,
  Dashboard,
  GraphWidget,
  LogQueryWidget,
  Metric,
  TextWidget,
  TreatMissingData,
  AlarmStatusWidget,
} from 'aws-cdk-lib/aws-cloudwatch';
import { SnsAction } from 'aws-cdk-lib/aws-cloudwatch-actions';
import { Rule, EventPattern } from 'aws-cdk-lib/aws-events';
import { SnsTopic } from 'aws-cdk-lib/aws-events-targets';
import { Runtime, Tracing } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction, OutputFormat } from 'aws-cdk-lib/aws-lambda-nodejs';
import { LogGroup, RetentionDays } from 'aws-cdk-lib/aws-logs';
import { PolicyStatement, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { Topic } from 'aws-cdk-lib/aws-sns';
import { LambdaSubscription } from 'aws-cdk-lib/aws-sns-subscriptions';
import { BaseStack, BaseStackProps } from '@core/base-stack';
import { importFromVersion } from '@utils/cross-version';
import type { Construct } from 'constructs';
import { join } from 'node:path';

export interface MonitoringStackProps extends BaseStackProps {
  /** Email address to receive alarm notifications. */
  readonly alertEmail: string;
  /** Email address used as sender (must be verified in SES). */
  readonly alertFromEmail: string;
  /** Stage name for friendly function naming (e.g. 'dev', 'prod'). */
  readonly stage: string;
}

export class MonitoringStack extends BaseStack {
  public readonly dashboard: Dashboard;
  public readonly alertTopic: Topic;
  public readonly alarms: Alarm[] = [];
  // The composite "Chat-Unhealthy" rollup is kept OUT of `alarms` (which holds
  // the individual component alarms) and exposed separately — it gets its own
  // dashboard widget as the primary, at-a-glance chat-health signal.
  public readonly chatUnhealthyAlarm: CompositeAlarm;

  constructor(scope: Construct, id: string, props: MonitoringStackProps) {
    const { version, stackName, description } = props;
    super(scope, id, { version, stackName, description });

    // ── SNS Topic for alarm notifications ──────────────────
    this.alertTopic = new Topic(this, `${stackName}-AlertTopic`, {
      displayName: 'Financial Management Alerts',
    });

    // ── Notification Lambda ──────────────────────────────
    const assetsBucketName = importFromVersion(
      this,
      'v1',
      'Assets',
      'AssetsBucketName',
    );

    const notificationFnName = `fm-${props.stage}-notifications`;
    const notificationLogGroup = new LogGroup(
      this,
      `${stackName}-NotificationLogGroup`,
      {
        logGroupName: `/aws/lambda/${notificationFnName}`,
        retention: RetentionDays.THREE_MONTHS,
      },
    );

    const notificationFn = new NodejsFunction(
      this,
      `${stackName}-NotificationFn`,
      {
        functionName: notificationFnName,
        runtime: Runtime.NODEJS_24_X,
        entry: join(
          __dirname,
          '../../../node_modules/@packages/notifications/src/handlers/notify.ts',
        ),
        handler: 'handler',
        bundling: {
          format: OutputFormat.ESM,
          sourceMap: true,
          minify: true,
          nodeModules: ['aws-xray-sdk-core'],
          environment: { npm_config_trust_policy: 'lenient' },
        },
        description:
          'Sends formatted alert emails via SES on CloudWatch alarms',
        tracing: Tracing.ACTIVE,
        logGroup: notificationLogGroup,
        environment: {
          ALERT_EMAIL_FROM: props.alertFromEmail,
          ALERT_EMAIL_TO: props.alertEmail,
          STAGE: props.stage,
          DASHBOARD_URL: `https://console.aws.amazon.com/cloudwatch/home#dashboards:name=${stackName}-Dashboard`,
          ASSETS_BUCKET_NAME: assetsBucketName,
          EMAILS_PREFIX: process.env.EMAILS_PREFIX ?? 'emails',
        },
        timeout: Duration.seconds(10),
      },
    );

    notificationFn.addToRolePolicy(
      new PolicyStatement({
        actions: ['ses:SendEmail'],
        resources: ['*'],
      }),
    );

    notificationFn.addToRolePolicy(
      new PolicyStatement({
        actions: ['s3:GetObject'],
        resources: [`arn:aws:s3:::${assetsBucketName}/*`],
      }),
    );

    this.alertTopic.addSubscription(new LambdaSubscription(notificationFn));

    const snsAction = new SnsAction(this.alertTopic);

    // ── Cross-version imports ──────────────────────────────
    const apiGatewayName = importFromVersion(
      this,
      'v2',
      'ApiGateway',
      'ApiName',
    );
    const amplifyAppId = importFromVersion(
      this,
      'v2',
      'AmplifyHosting',
      'AppId',
    );

    interface LambdaAlarmConfig {
      fnName: string;
      errorThreshold: number;
      evaluationPeriods: number;
      datapointsToAlarm: number;
      period: ReturnType<typeof Duration.minutes>;
    }

    const lambdaFunctions: Record<string, LambdaAlarmConfig> = {
      Expenses: {
        fnName: importFromVersion(this, 'v2', 'LambdaExpenses', 'FunctionName'),
        errorThreshold: 3,
        evaluationPeriods: 3,
        datapointsToAlarm: 2,
        period: Duration.minutes(1),
      },
      Documents: {
        fnName: importFromVersion(
          this,
          'v2',
          'LambdaDocuments',
          'FunctionName',
        ),
        errorThreshold: 3,
        evaluationPeriods: 3,
        datapointsToAlarm: 2,
        period: Duration.minutes(1),
      },
      Currencies: {
        fnName: importFromVersion(
          this,
          'v2',
          'LambdaCurrencies',
          'FunctionName',
        ),
        errorThreshold: 3,
        evaluationPeriods: 3,
        datapointsToAlarm: 2,
        period: Duration.minutes(1),
      },
      Users: {
        fnName: importFromVersion(this, 'v2', 'LambdaUsers', 'FunctionName'),
        errorThreshold: 3,
        evaluationPeriods: 3,
        datapointsToAlarm: 2,
        period: Duration.minutes(1),
      },
      UpdateRates: {
        fnName: importFromVersion(
          this,
          'v2',
          'LambdaExchangeRates',
          'FunctionName',
        ),
        errorThreshold: 2,
        evaluationPeriods: 1,
        datapointsToAlarm: 1,
        period: Duration.hours(24),
      },
      // ── AI Chat Lambdas (Phase 1) ───────────────────────
      // The chat handler is on the synchronous path (API Gateway) and must
      // ACK in under a second, so we alarm at the first error within a
      // minute. The Step Function task Lambdas run in background — slightly
      // higher tolerance to avoid noisy alarms during the LLM cold-starts.
      ChatHandler: {
        fnName: importFromVersion(this, 'v2', 'LambdaChat', 'FunctionName'),
        errorThreshold: 3,
        evaluationPeriods: 3,
        datapointsToAlarm: 2,
        period: Duration.minutes(1),
      },
      ChatExecuteQuery: {
        fnName: importFromVersion(
          this,
          'v2',
          'StepFunctionsChat',
          'ExecuteQueryFnName',
        ),
        errorThreshold: 3,
        evaluationPeriods: 3,
        datapointsToAlarm: 2,
        period: Duration.minutes(5),
      },
      ChatValidateFields: {
        fnName: importFromVersion(
          this,
          'v2',
          'StepFunctionsChat',
          'ValidateFieldsFnName',
        ),
        errorThreshold: 3,
        evaluationPeriods: 3,
        datapointsToAlarm: 2,
        period: Duration.minutes(5),
      },
      ChatCreateExpense: {
        fnName: importFromVersion(
          this,
          'v2',
          'StepFunctionsChat',
          'CreateExpenseFnName',
        ),
        errorThreshold: 3,
        evaluationPeriods: 3,
        datapointsToAlarm: 2,
        period: Duration.minutes(5),
      },
      ChatSaveAndPublish: {
        fnName: importFromVersion(
          this,
          'v2',
          'StepFunctionsChat',
          'SaveAndPublishFnName',
        ),
        errorThreshold: 3,
        evaluationPeriods: 3,
        datapointsToAlarm: 2,
        period: Duration.minutes(5),
      },
      ChatSavePreview: {
        fnName: importFromVersion(
          this,
          'v2',
          'StepFunctionsChat',
          'SavePreviewFnName',
        ),
        errorThreshold: 3,
        evaluationPeriods: 3,
        datapointsToAlarm: 2,
        period: Duration.minutes(5),
      },
      // Attachment image normalization (Phase 2). `convert-image` runs sharp on
      // a full bitmap, so an error here is usually OOM or a timeout rather than
      // a bad photo — an unreadable image is reported to the user and the
      // execution SUCCEEDS, so it never reaches these alarms.
      ChatProbeImage: {
        fnName: importFromVersion(
          this,
          'v2',
          'StepFunctionsImageProcess',
          'ProbeImageFnName',
        ),
        errorThreshold: 3,
        evaluationPeriods: 3,
        datapointsToAlarm: 2,
        period: Duration.minutes(5),
      },
      ChatConvertImage: {
        fnName: importFromVersion(
          this,
          'v2',
          'StepFunctionsImageProcess',
          'ConvertImageFnName',
        ),
        errorThreshold: 3,
        evaluationPeriods: 3,
        datapointsToAlarm: 2,
        period: Duration.minutes(5),
      },
      ChatPublishAttachment: {
        fnName: importFromVersion(
          this,
          'v2',
          'StepFunctionsImageProcess',
          'PublishAttachmentFnName',
        ),
        errorThreshold: 3,
        evaluationPeriods: 3,
        datapointsToAlarm: 2,
        period: Duration.minutes(5),
      },
      // Receipt attachments (Phase 2). Textract failures do NOT fail the
      // conversation — the use case degrades to "unreadable" — so an error here
      // means the task itself broke (bad key, missing IAM, Textract outage).
      ChatAnalyzeReceipt: {
        fnName: importFromVersion(
          this,
          'v2',
          'StepFunctionsChat',
          'AnalyzeReceiptFnName',
        ),
        errorThreshold: 3,
        evaluationPeriods: 3,
        datapointsToAlarm: 2,
        period: Duration.minutes(5),
      },
      // Caches the receipt reading for the follow-up turn. Its failures are
      // caught in the state machine and do NOT fail the conversation, so an
      // alarm here means the cache is silently broken: receipts still work, but
      // every follow-up would re-read the image. Worth knowing about precisely
      // because the user would never notice.
      ChatPersistReceipt: {
        fnName: importFromVersion(
          this,
          'v2',
          'StepFunctionsChat',
          'PersistReceiptExtractionFnName',
        ),
        errorThreshold: 3,
        evaluationPeriods: 3,
        datapointsToAlarm: 2,
        period: Duration.minutes(5),
      },
    };

    const cognitoTriggers: Record<string, string> = {
      PreSignUp: importFromVersion(this, 'v1', 'Auth', 'PreSignUpFnName'),
      CustomMessage: importFromVersion(
        this,
        'v1',
        'Auth',
        'CustomMessageFnName',
      ),
      UserSync: importFromVersion(this, 'v1', 'Auth', 'UserSyncFnName'),
    };

    // ── Helper: create metric ──────────────────────────────
    const apiMetric = (metricName: string, statistic = 'Sum') =>
      new Metric({
        namespace: 'AWS/ApiGateway',
        metricName,
        dimensionsMap: { ApiName: apiGatewayName },
        statistic,
        period: Duration.minutes(1),
      });

    const lambdaMetric = (
      functionName: string,
      metricName: string,
      statistic = 'Sum',
      label?: string,
    ) =>
      new Metric({
        namespace: 'AWS/Lambda',
        metricName,
        dimensionsMap: { FunctionName: functionName },
        statistic,
        period: Duration.minutes(1),
        ...(label && { label }),
      });

    // ── API Gateway Alarms ─────────────────────────────────
    const api5xxAlarm = new Alarm(this, `${stackName}-Api5xxAlarm`, {
      alarmName: `${stackName}-Api-5xx-Errors`,
      alarmDescription: 'API Gateway 5xx errors exceed threshold',
      metric: apiMetric('5XXError'),
      threshold: 5,
      evaluationPeriods: 3,
      datapointsToAlarm: 2,
      comparisonOperator: ComparisonOperator.GREATER_THAN_THRESHOLD,
      treatMissingData: TreatMissingData.NOT_BREACHING,
    });
    api5xxAlarm.addAlarmAction(snsAction);
    this.alarms.push(api5xxAlarm);

    // NOTE: there is deliberately NO 4xx alarm. 4xx means the CLIENT sent a bad
    // request (expired token, validation failure) — it is not a service fault
    // and is not actionable by an on-call alert. 4xx stays on the dashboard
    // widget for trend analysis; a real server-side problem shows up as 5xx.

    const apiLatencyAlarm = new Alarm(this, `${stackName}-ApiLatencyAlarm`, {
      alarmName: `${stackName}-Api-Latency-High`,
      alarmDescription: 'API Gateway p99 latency exceeds 5s',
      metric: apiMetric('Latency', 'p99'),
      threshold: 5000,
      evaluationPeriods: 5,
      datapointsToAlarm: 3,
      comparisonOperator: ComparisonOperator.GREATER_THAN_THRESHOLD,
      treatMissingData: TreatMissingData.NOT_BREACHING,
    });
    apiLatencyAlarm.addAlarmAction(snsAction);
    this.alarms.push(apiLatencyAlarm);

    // ── Lambda Alarms (per service function) ───────────────
    // Capture chat Lambda error alarms so the composite "Chat unhealthy"
    // alarm can OR them together into a single actionable signal.
    const chatLambdaErrorAlarms = new Map<string, Alarm>();

    for (const [service, config] of Object.entries(lambdaFunctions)) {
      const errAlarm = new Alarm(this, `${stackName}-${service}-ErrorsAlarm`, {
        alarmName: `${stackName}-Lambda-${service}-Errors`,
        alarmDescription: `Lambda ${service} errors exceed threshold`,
        metric: lambdaMetric(config.fnName, 'Errors').with({
          period: config.period,
        }),
        threshold: config.errorThreshold,
        evaluationPeriods: config.evaluationPeriods,
        datapointsToAlarm: config.datapointsToAlarm,
        comparisonOperator: ComparisonOperator.GREATER_THAN_THRESHOLD,
        treatMissingData: TreatMissingData.NOT_BREACHING,
      });
      errAlarm.addAlarmAction(snsAction);
      this.alarms.push(errAlarm);

      if (service.startsWith('Chat')) {
        chatLambdaErrorAlarms.set(service, errAlarm);
      }
    }

    // NOTE: there are deliberately NO per-Lambda `Throttles` alarms.
    //
    // CORRECTION (2026-08): the original justification here claimed the
    // account-level limit was 1000 concurrent executions. It is NOT — this
    // account is on the reduced quota AWS gives new accounts:
    //
    //   aws lambda get-account-settings
    //   → ConcurrentExecutions: 10
    //
    // So the ceiling is far closer than that comment implied. The decision to
    // skip these alarms still holds, but now on MEASURED grounds rather than a
    // wrong premise — 30 days of CloudWatch show:
    //
    //   Throttles (whole account) ... 0
    //   Peak ConcurrentExecutions ... 3 of 10
    //
    // Peak usage is 30% of the ceiling and nothing has ever been throttled, so
    // these alarms would still be non-actionable noise at $0.10 each per month.
    // A throttled invocation also surfaces through signals we DO alarm on:
    // `Errors` on the function and 5xx on API Gateway. Throttles stay visible
    // on the dashboard widget, which is free.
    //
    // REVISIT if peak concurrency approaches 10, or if the quota is raised and
    // traffic grows — the headroom, not the alarm cost, is the thing to watch.

    // ── Cognito Trigger Alarms ─────────────────────────────
    for (const [trigger, fnName] of Object.entries(cognitoTriggers)) {
      const alarm = new Alarm(
        this,
        `${stackName}-Cognito-${trigger}-ErrorsAlarm`,
        {
          alarmName: `${stackName}-Cognito-${trigger}-Errors`,
          alarmDescription: `Cognito trigger ${trigger} errors`,
          metric: lambdaMetric(fnName, 'Errors').with({
            period: Duration.minutes(5),
          }),
          threshold: 1,
          evaluationPeriods: 3,
          datapointsToAlarm: 2,
          comparisonOperator: ComparisonOperator.GREATER_THAN_THRESHOLD,
          treatMissingData: TreatMissingData.NOT_BREACHING,
        },
      );
      alarm.addAlarmAction(snsAction);
      this.alarms.push(alarm);
    }

    // ── Step Functions Alarms (AI Chat workflow) ───────────
    // The chat Lambdas alarm individually, but a Bedrock failure or a state
    // machine timeout kills the conversation without touching any Lambda —
    // alarm on the workflow itself.
    const chatStateMachineArn = importFromVersion(
      this,
      'v2',
      'StepFunctionsChat',
      'StateMachineArn',
    );

    const chatWorkflowMetric = (metricName: string) =>
      new Metric({
        namespace: 'AWS/States',
        metricName,
        dimensionsMap: { StateMachineArn: chatStateMachineArn },
        statistic: 'Sum',
        period: Duration.minutes(5),
      });

    // The workflow's catch-all publishes a friendly error to the user before
    // failing, so a SINGLE failed execution is no longer a silent hang — the
    // user got a reply and can retry. Alarm on a sustained PATTERN instead of
    // every failure (which would cause alert fatigue): >2 failed executions
    // (i.e. ≥3) in 2 of 3 consecutive 5-minute windows. Consistent with the
    // per-Lambda error alarms' "2 of 3 datapoints" sustain. The cases that DO
    // mean "the user truly got nothing" stay single-datapoint sensitive:
    // Chat-PublishFailed (the error publish itself failed) and ExecutionsAborted.
    const chatExecutionsFailedAlarm = new Alarm(
      this,
      `${stackName}-ChatWorkflowFailedAlarm`,
      {
        alarmName: `${stackName}-ChatWorkflow-ExecutionsFailed`,
        alarmDescription:
          'AI Chat state machine executions are failing at an elevated, sustained rate (>2 per 5-min window in 2 of 3 windows) — each failure is already shown to the user via the catch-all, so this flags a systemic problem, not one-off errors',
        metric: chatWorkflowMetric('ExecutionsFailed'),
        threshold: 2,
        evaluationPeriods: 3,
        datapointsToAlarm: 2,
        comparisonOperator: ComparisonOperator.GREATER_THAN_THRESHOLD,
        treatMissingData: TreatMissingData.NOT_BREACHING,
      },
    );
    chatExecutionsFailedAlarm.addAlarmAction(snsAction);
    this.alarms.push(chatExecutionsFailedAlarm);

    // ── Image-processing workflow ──────────────────────────
    // Only GENUINE faults reach here: an image the user sent that we cannot
    // decode ends SUCCEEDED (the user is told), precisely so somebody's HEIC
    // holiday photo never pages anyone. A failure therefore means our own
    // problem — OOM, timeout, IAM, or S3.
    const imageStateMachineArn = importFromVersion(
      this,
      'v2',
      'StepFunctionsImageProcess',
      'StateMachineArn',
    );
    const imageWorkflowFailedAlarm = new Alarm(
      this,
      `${stackName}-ImageWorkflowFailedAlarm`,
      {
        alarmName: `${stackName}-ImageWorkflow-ExecutionsFailed`,
        alarmDescription:
          'Attachment image normalization is failing — unreadable user images end SUCCEEDED by design, so this means an infrastructure fault (OOM, timeout, IAM, S3)',
        metric: new Metric({
          namespace: 'AWS/States',
          metricName: 'ExecutionsFailed',
          dimensionsMap: { StateMachineArn: imageStateMachineArn },
          statistic: 'Sum',
          period: Duration.minutes(5),
        }),
        threshold: 2,
        evaluationPeriods: 3,
        datapointsToAlarm: 2,
        comparisonOperator: ComparisonOperator.GREATER_THAN_THRESHOLD,
        treatMissingData: TreatMissingData.NOT_BREACHING,
      },
    );
    imageWorkflowFailedAlarm.addAlarmAction(snsAction);
    this.alarms.push(imageWorkflowFailedAlarm);

    // HITL previews now wait up to 7 days and an abandoned one is caught
    // (States.Timeout) and ends cleanly, so ExecutionsTimedOut should be ~0.
    // A non-zero value here means the 8-day execution backstop fired — a real
    // anomaly (e.g. confirmations stuck), so require a sustained signal
    // (3 datapoints) to page instead of alerting on a single benign blip.
    const chatExecutionsTimedOutAlarm = new Alarm(
      this,
      `${stackName}-ChatWorkflowTimedOutAlarm`,
      {
        alarmName: `${stackName}-ChatWorkflow-ExecutionsTimedOut`,
        alarmDescription:
          'AI Chat executions hit the 8-day backstop timeout — abandoned HITL previews are caught at 7 days and end cleanly, so this indicates a real anomaly',
        metric: chatWorkflowMetric('ExecutionsTimedOut'),
        threshold: 0,
        evaluationPeriods: 3,
        datapointsToAlarm: 3,
        comparisonOperator: ComparisonOperator.GREATER_THAN_THRESHOLD,
        treatMissingData: TreatMissingData.NOT_BREACHING,
      },
    );
    chatExecutionsTimedOutAlarm.addAlarmAction(snsAction);
    this.alarms.push(chatExecutionsTimedOutAlarm);

    // ── AppSync Events Alarms (AI Chat realtime delivery) ──
    // Metric names/dimensions verified against CloudWatch list-metrics for
    // the deployed Event API (namespace AWS/AppSync, dimension EventAPIId).
    const eventApiId = importFromVersion(
      this,
      'v2',
      'AppSyncEvents',
      'EventApiId',
    );

    const appSyncEventsMetric = (metricName: string) =>
      new Metric({
        namespace: 'AWS/AppSync',
        metricName,
        dimensionsMap: { EventAPIId: eventApiId },
        statistic: 'Sum',
        period: Duration.minutes(5),
      });

    const appSync5xxAlarm = new Alarm(
      this,
      `${stackName}-AppSyncEvents5xxAlarm`,
      {
        alarmName: `${stackName}-AppSyncEvents-5xx-Errors`,
        alarmDescription: 'AppSync Events API server errors',
        metric: appSyncEventsMetric('5XXError'),
        threshold: 0,
        evaluationPeriods: 1,
        datapointsToAlarm: 1,
        comparisonOperator: ComparisonOperator.GREATER_THAN_THRESHOLD,
        treatMissingData: TreatMissingData.NOT_BREACHING,
      },
    );
    appSync5xxAlarm.addAlarmAction(snsAction);
    this.alarms.push(appSync5xxAlarm);

    const appSyncFailedEventsAlarm = new Alarm(
      this,
      `${stackName}-AppSyncEventsFailedAlarm`,
      {
        alarmName: `${stackName}-AppSyncEvents-FailedEvents`,
        alarmDescription:
          'AppSync Events failed to deliver published events to subscribers',
        metric: appSyncEventsMetric('FailedEvents'),
        threshold: 0,
        evaluationPeriods: 1,
        datapointsToAlarm: 1,
        comparisonOperator: ComparisonOperator.GREATER_THAN_THRESHOLD,
        treatMissingData: TreatMissingData.NOT_BREACHING,
      },
    );
    appSyncFailedEventsAlarm.addAlarmAction(snsAction);
    this.alarms.push(appSyncFailedEventsAlarm);

    // ── Chat Workflow Latency + Aborted Alarms ─────────────
    // A slow workflow (p90 > 60s) means users are waiting too long for the
    // assistant to respond — usually a Bedrock slowdown — so page on a
    // sustained signal rather than a single spike.
    const chatWorkflowLatencyAlarm = new Alarm(
      this,
      `${stackName}-ChatWorkflowLatencyAlarm`,
      {
        alarmName: `${stackName}-ChatWorkflow-LatencyP90High`,
        alarmDescription:
          'AI Chat state machine p90 execution time exceeds 60s — users are waiting too long for a response',
        metric: new Metric({
          namespace: 'AWS/States',
          metricName: 'ExecutionTime',
          dimensionsMap: { StateMachineArn: chatStateMachineArn },
          statistic: 'p90',
          period: Duration.minutes(5),
        }),
        threshold: 60000,
        evaluationPeriods: 3,
        datapointsToAlarm: 2,
        comparisonOperator: ComparisonOperator.GREATER_THAN_THRESHOLD,
        treatMissingData: TreatMissingData.NOT_BREACHING,
      },
    );
    chatWorkflowLatencyAlarm.addAlarmAction(snsAction);
    this.alarms.push(chatWorkflowLatencyAlarm);

    // An aborted execution means a chat conversation was killed mid-flight
    // (manual stop or quota). Always investigate the first one.
    const chatExecutionsAbortedAlarm = new Alarm(
      this,
      `${stackName}-ChatWorkflowAbortedAlarm`,
      {
        alarmName: `${stackName}-ChatWorkflow-ExecutionsAborted`,
        alarmDescription: 'AI Chat state machine executions were aborted',
        metric: chatWorkflowMetric('ExecutionsAborted'),
        threshold: 0,
        evaluationPeriods: 1,
        datapointsToAlarm: 1,
        comparisonOperator: ComparisonOperator.GREATER_THAN_THRESHOLD,
        treatMissingData: TreatMissingData.NOT_BREACHING,
      },
    );
    chatExecutionsAbortedAlarm.addAlarmAction(snsAction);
    this.alarms.push(chatExecutionsAbortedAlarm);

    // ── Chat Business Metrics Alarms (EMF) ─────────────────
    // The chat service emits EMF counters in the FinancialManagement
    // namespace, dimension service=chat.
    const chatBusinessMetric = (metricName: string, statistic = 'Sum') =>
      new Metric({
        namespace: 'FinancialManagement',
        metricName,
        dimensionsMap: { service: 'chat' },
        statistic,
        period: Duration.minutes(5),
      });

    // A publish failure means the assistant computed a response but the user
    // never received it over AppSync — a silent UX failure. Alarm on the first.
    const chatPublishFailedAlarm = new Alarm(
      this,
      `${stackName}-ChatPublishFailedAlarm`,
      {
        alarmName: `${stackName}-Chat-PublishFailed`,
        alarmDescription:
          'AI Chat failed to publish an assistant message to the client over AppSync — a silent delivery failure',
        metric: chatBusinessMetric('ChatPublishFailed'),
        threshold: 0,
        evaluationPeriods: 1,
        datapointsToAlarm: 1,
        comparisonOperator: ComparisonOperator.GREATER_THAN_THRESHOLD,
        treatMissingData: TreatMissingData.NOT_BREACHING,
      },
    );
    chatPublishFailedAlarm.addAlarmAction(snsAction);
    this.alarms.push(chatPublishFailedAlarm);

    // ── Composite "Chat Unhealthy" Alarm ───────────────────
    // Single actionable chat-health signal: ORs together the workflow
    // failure, AppSync delivery failure, publish failure, and every chat
    // Lambda error alarm. On-call watches this one alarm instead of a dozen.
    const chatUnhealthyAlarm = new CompositeAlarm(
      this,
      `${stackName}-ChatUnhealthyAlarm`,
      {
        compositeAlarmName: `${stackName}-Chat-Unhealthy`,
        alarmDescription:
          'Single actionable AI Chat health signal — fires when the chat workflow, AppSync delivery, message publish, or any chat Lambda is in alarm',
        alarmRule: AlarmRule.anyOf(
          AlarmRule.fromAlarm(chatExecutionsFailedAlarm, AlarmState.ALARM),
          AlarmRule.fromAlarm(appSyncFailedEventsAlarm, AlarmState.ALARM),
          AlarmRule.fromAlarm(chatPublishFailedAlarm, AlarmState.ALARM),
          ...[...chatLambdaErrorAlarms.values()].map((alarm) =>
            AlarmRule.fromAlarm(alarm, AlarmState.ALARM),
          ),
        ),
      },
    );
    chatUnhealthyAlarm.addAlarmAction(snsAction);
    this.chatUnhealthyAlarm = chatUnhealthyAlarm;

    // ── Dashboard ──────────────────────────────────────────
    this.dashboard = new Dashboard(this, `${stackName}-Dashboard`, {
      dashboardName: `${stackName}-Dashboard`,
    });

    // Header
    this.dashboard.addWidgets(
      new TextWidget({
        markdown: '# Financial Management — Monitoring Dashboard',
        width: 24,
        height: 1,
      }),
    );

    // API Gateway section
    this.dashboard.addWidgets(
      new TextWidget({
        markdown: '## API Gateway',
        width: 24,
        height: 1,
      }),
    );

    this.dashboard.addWidgets(
      new GraphWidget({
        title: 'Requests',
        left: [apiMetric('Count')],
        width: 8,
      }),
      new GraphWidget({
        title: 'Errors (4xx / 5xx)',
        left: [apiMetric('4XXError'), apiMetric('5XXError')],
        width: 8,
      }),
      new GraphWidget({
        title: 'Latency (p50 / p90 / p99)',
        left: [
          apiMetric('Latency', 'p50'),
          apiMetric('Latency', 'p90'),
          apiMetric('Latency', 'p99'),
        ],
        width: 8,
      }),
    );

    // Lambda Services section
    this.dashboard.addWidgets(
      new TextWidget({
        markdown: '## Lambda Services',
        width: 24,
        height: 1,
      }),
    );

    const fnEntries = Object.entries(lambdaFunctions).map(
      ([name, config]) => [name, config.fnName] as [string, string],
    );

    this.dashboard.addWidgets(
      new GraphWidget({
        title: 'Invocations',
        left: fnEntries.map(([name, fn]) =>
          lambdaMetric(fn, 'Invocations', 'Sum', name),
        ),
        width: 8,
      }),
      new GraphWidget({
        title: 'Errors',
        left: fnEntries.map(([name, fn]) =>
          lambdaMetric(fn, 'Errors', 'Sum', name),
        ),
        width: 8,
      }),
      new GraphWidget({
        title: 'Duration (p90)',
        left: fnEntries.map(([name, fn]) =>
          lambdaMetric(fn, 'Duration', 'p90', name),
        ),
        width: 8,
      }),
    );

    this.dashboard.addWidgets(
      new GraphWidget({
        title: 'Throttles',
        left: fnEntries.map(([name, fn]) =>
          lambdaMetric(fn, 'Throttles', 'Sum', name),
        ),
        width: 12,
      }),
      new GraphWidget({
        title: 'Concurrent Executions',
        left: fnEntries.map(([name, fn]) =>
          lambdaMetric(fn, 'ConcurrentExecutions', 'Maximum', name),
        ),
        width: 12,
      }),
    );

    // Cognito Triggers section
    this.dashboard.addWidgets(
      new TextWidget({
        markdown: '## Cognito Triggers',
        width: 24,
        height: 1,
      }),
    );

    const triggerEntries = Object.entries(cognitoTriggers);

    this.dashboard.addWidgets(
      new GraphWidget({
        title: 'Invocations',
        left: triggerEntries.map(([name, fn]) =>
          lambdaMetric(fn, 'Invocations', 'Sum', name).with({
            period: Duration.minutes(5),
          }),
        ),
        width: 8,
      }),
      new GraphWidget({
        title: 'Errors',
        left: triggerEntries.map(([name, fn]) =>
          lambdaMetric(fn, 'Errors', 'Sum', name).with({
            period: Duration.minutes(5),
          }),
        ),
        width: 8,
      }),
      new GraphWidget({
        title: 'Duration',
        left: triggerEntries.map(([name, fn]) =>
          lambdaMetric(fn, 'Duration', 'Average', name).with({
            period: Duration.minutes(5),
          }),
        ),
        width: 8,
      }),
    );

    // ── Cognito Logs Insights section ──────────────────────
    this.dashboard.addWidgets(
      new TextWidget({
        markdown: '## Cognito Trigger Errors (Logs Insights)',
        width: 24,
        height: 1,
      }),
    );

    const triggerLogGroups = Object.entries(cognitoTriggers).map(
      ([, fnName]) => `/aws/lambda/${fnName}`,
    );

    this.dashboard.addWidgets(
      new LogQueryWidget({
        title: 'Recent Cognito Trigger Errors',
        logGroupNames: triggerLogGroups,
        queryLines: [
          'fields @timestamp, @message',
          'filter level = "ERROR" or @message like /ERROR/',
          'sort @timestamp desc',
          'limit 20',
        ],
        width: 24,
        height: 6,
      }),
    );

    // Amplify section
    this.dashboard.addWidgets(
      new TextWidget({
        markdown: '## Amplify Hosting',
        width: 24,
        height: 1,
      }),
    );

    const amplifyMetric = (metricName: string, statistic = 'Sum') =>
      new Metric({
        namespace: 'AWS/AmplifyHosting',
        metricName,
        dimensionsMap: { App: amplifyAppId },
        statistic,
        period: Duration.minutes(5),
      });

    this.dashboard.addWidgets(
      new GraphWidget({
        title: 'Requests',
        left: [amplifyMetric('Requests')],
        width: 8,
      }),
      new GraphWidget({
        title: 'Errors (4xx / 5xx)',
        left: [amplifyMetric('4xxErrors'), amplifyMetric('5xxErrors')],
        width: 8,
      }),
      new GraphWidget({
        title: 'Latency (p50 / p90)',
        left: [
          amplifyMetric('Latency', 'p50'),
          amplifyMetric('Latency', 'p90'),
        ],
        width: 8,
      }),
    );

    // AI Chat Workflow section
    this.dashboard.addWidgets(
      new TextWidget({
        markdown: '## AI Chat Workflow (Step Functions)',
        width: 24,
        height: 1,
      }),
    );

    this.dashboard.addWidgets(
      new GraphWidget({
        title: 'Executions',
        left: [
          chatWorkflowMetric('ExecutionsStarted'),
          chatWorkflowMetric('ExecutionsSucceeded'),
          chatWorkflowMetric('ExecutionsFailed'),
          chatWorkflowMetric('ExecutionsTimedOut'),
        ],
        width: 12,
      }),
      new GraphWidget({
        title: 'Execution Time (p90)',
        left: [
          new Metric({
            namespace: 'AWS/States',
            metricName: 'ExecutionTime',
            dimensionsMap: { StateMachineArn: chatStateMachineArn },
            statistic: 'p90',
            period: Duration.minutes(5),
          }),
        ],
        width: 12,
      }),
    );

    // AI Chat Business Metrics section (EMF — emitted by the chat service)
    this.dashboard.addWidgets(
      new TextWidget({
        markdown: '## AI Chat Business Metrics (EMF)',
        width: 24,
        height: 1,
      }),
    );

    this.dashboard.addWidgets(
      new GraphWidget({
        title: 'Conversation outcomes',
        left: [
          chatBusinessMetric('ChatMessageReceived'),
          chatBusinessMetric('ChatQueryExecuted'),
          chatBusinessMetric('ChatExpenseCreated'),
          chatBusinessMetric('ChatClarificationSent'),
          chatBusinessMetric('ChatExpenseCancelled'),
        ],
        width: 12,
      }),
      new GraphWidget({
        title: 'Errors & anomalies',
        left: [
          chatBusinessMetric('ChatUnknownIntent'),
          chatBusinessMetric('ChatWorkflowError'),
          chatBusinessMetric('ChatPublishFailed'),
          chatBusinessMetric('ChatPreviewSuperseded'),
        ],
        width: 12,
      }),
    );

    // ── SNS Topic Policy (allow EventBridge and CloudWatch Alarms to publish) ──
    this.alertTopic.addToResourcePolicy(
      new PolicyStatement({
        actions: ['sns:Publish'],
        principals: [
          new ServicePrincipal('events.amazonaws.com'),
          new ServicePrincipal('cloudwatch.amazonaws.com'),
        ],
        resources: [this.alertTopic.topicArn],
        conditions: {
          StringEquals: { 'AWS:SourceAccount': this.account },
        },
      }),
    );

    // ── EventBridge Rule: Amplify Build Status ──────────
    new Rule(this, `${stackName}-AmplifyBuildRule`, {
      ruleName: `${stackName}-Amplify-Build-Status`,
      description:
        'Captures Amplify build status changes (started, failed, succeed) and sends alerts',
      eventPattern: {
        source: ['aws.amplify'],
        detailType: ['Amplify Deployment Status Change'],
        detail: {
          appId: [amplifyAppId],
          jobStatus: ['STARTED', 'FAILED', 'SUCCEED'],
        },
      } as EventPattern,
      targets: [new SnsTopic(this.alertTopic)],
    });

    // Alarms overview
    this.dashboard.addWidgets(
      new TextWidget({
        markdown: '## Alarm Status',
        width: 24,
        height: 1,
      }),
    );

    // Primary at-a-glance signal: the composite chat-health rollup on its own,
    // so on-call sees overall chat health before scanning the component alarms.
    this.dashboard.addWidgets(
      new AlarmStatusWidget({
        title: 'AI Chat Health (composite)',
        alarms: [this.chatUnhealthyAlarm],
        width: 24,
      }),
    );

    this.dashboard.addWidgets(
      new AlarmStatusWidget({
        title: 'All Alarms',
        alarms: this.alarms,
        width: 24,
      }),
    );

    // ── Outputs ────────────────────────────────────────────
    new CfnOutput(this, `${stackName}-DashboardUrl`, {
      value: `https://console.aws.amazon.com/cloudwatch/home#dashboards:name=${stackName}-Dashboard`,
      description: 'CloudWatch Dashboard URL',
    });

    new CfnOutput(this, `${stackName}-AlertTopicArn`, {
      value: this.alertTopic.topicArn,
      description: 'SNS Topic ARN for alarm notifications',
    });
  }
}
