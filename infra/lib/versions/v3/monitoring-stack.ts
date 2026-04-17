import { CfnOutput, Duration } from 'aws-cdk-lib';
import {
  Alarm,
  ComparisonOperator,
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
import {
  CfnConfigurationSet,
  CfnConfigurationSetEventDestination,
} from 'aws-cdk-lib/aws-ses';
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
        runtime: Runtime.NODEJS_22_X,
        entry: join(
          __dirname,
          '../../../node_modules/@packages/notifications/src/index.ts',
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

    const lambdaFunctions: Record<string, string> = {
      Expenses: importFromVersion(this, 'v2', 'LambdaExpenses', 'FunctionName'),
      Documents: importFromVersion(
        this,
        'v2',
        'LambdaDocuments',
        'FunctionName',
      ),
      Currencies: importFromVersion(
        this,
        'v2',
        'LambdaCurrencies',
        'FunctionName',
      ),
      Users: importFromVersion(this, 'v2', 'LambdaUsers', 'FunctionName'),
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

    const api4xxAlarm = new Alarm(this, `${stackName}-Api4xxAlarm`, {
      alarmName: `${stackName}-Api-4xx-Spike`,
      alarmDescription: 'API Gateway 4xx errors spike',
      metric: apiMetric('4XXError'),
      threshold: 50,
      evaluationPeriods: 5,
      datapointsToAlarm: 3,
      comparisonOperator: ComparisonOperator.GREATER_THAN_THRESHOLD,
      treatMissingData: TreatMissingData.NOT_BREACHING,
    });
    api4xxAlarm.addAlarmAction(snsAction);
    this.alarms.push(api4xxAlarm);

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
    for (const [service, fnName] of Object.entries(lambdaFunctions)) {
      const errAlarm = new Alarm(this, `${stackName}-${service}-ErrorsAlarm`, {
        alarmName: `${stackName}-Lambda-${service}-Errors`,
        alarmDescription: `Lambda ${service} errors exceed threshold`,
        metric: lambdaMetric(fnName, 'Errors'),
        threshold: 3,
        evaluationPeriods: 3,
        datapointsToAlarm: 2,
        comparisonOperator: ComparisonOperator.GREATER_THAN_THRESHOLD,
        treatMissingData: TreatMissingData.NOT_BREACHING,
      });
      errAlarm.addAlarmAction(snsAction);
      this.alarms.push(errAlarm);

      const throttleAlarm = new Alarm(
        this,
        `${stackName}-${service}-ThrottlesAlarm`,
        {
          alarmName: `${stackName}-Lambda-${service}-Throttles`,
          alarmDescription: `Lambda ${service} is being throttled`,
          metric: lambdaMetric(fnName, 'Throttles'),
          threshold: 0,
          evaluationPeriods: 1,
          datapointsToAlarm: 1,
          comparisonOperator: ComparisonOperator.GREATER_THAN_THRESHOLD,
          treatMissingData: TreatMissingData.NOT_BREACHING,
        },
      );
      throttleAlarm.addAlarmAction(snsAction);
      this.alarms.push(throttleAlarm);
    }

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

    const fnEntries = Object.entries(lambdaFunctions);

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

    // ── SNS Topic Policy (allow SES + EventBridge to publish) ──
    this.alertTopic.addToResourcePolicy(
      new PolicyStatement({
        actions: ['sns:Publish'],
        principals: [new ServicePrincipal('ses.amazonaws.com')],
        resources: [this.alertTopic.topicArn],
        conditions: {
          StringEquals: { 'AWS:SourceAccount': this.account },
        },
      }),
    );
    this.alertTopic.addToResourcePolicy(
      new PolicyStatement({
        actions: ['sns:Publish'],
        principals: [new ServicePrincipal('events.amazonaws.com')],
        resources: [this.alertTopic.topicArn],
        conditions: {
          StringEquals: { 'AWS:SourceAccount': this.account },
        },
      }),
    );

    // ── SES Configuration Set (bounce/complaint tracking) ──
    const sesConfigSet = new CfnConfigurationSet(
      this,
      `${stackName}-SesConfigSet`,
      {
        name: `${stackName}-ses-events`,
      },
    );

    new CfnConfigurationSetEventDestination(
      this,
      `${stackName}-SesEventDestination`,
      {
        configurationSetName: sesConfigSet.ref,
        eventDestination: {
          name: `${stackName}-ses-to-sns`,
          enabled: true,
          matchingEventTypes: ['bounce', 'complaint', 'reject'],
          snsDestination: {
            topicArn: this.alertTopic.topicArn,
          },
        },
      },
    );

    // ── EventBridge Rule: Amplify Build Failures ──────────
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
