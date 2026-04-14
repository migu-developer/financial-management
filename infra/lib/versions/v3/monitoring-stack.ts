import { CfnOutput, Duration } from 'aws-cdk-lib';
import {
  Alarm,
  ComparisonOperator,
  Dashboard,
  GraphWidget,
  Metric,
  TextWidget,
  TreatMissingData,
  AlarmStatusWidget,
} from 'aws-cdk-lib/aws-cloudwatch';
import { SnsAction } from 'aws-cdk-lib/aws-cloudwatch-actions';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction, OutputFormat } from 'aws-cdk-lib/aws-lambda-nodejs';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Topic } from 'aws-cdk-lib/aws-sns';
import {
  EmailSubscription,
  LambdaSubscription,
} from 'aws-cdk-lib/aws-sns-subscriptions';
import { BaseStack, BaseStackProps } from '@core/base-stack';
import { importFromVersion } from '@utils/cross-version';
import type { Construct } from 'constructs';
import { join } from 'node:path';

export interface MonitoringStackProps extends BaseStackProps {
  /** Email address to receive alarm notifications. */
  readonly alertEmail: string;
  /** Email address used as sender (must be verified in SES). */
  readonly alertFromEmail: string;
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
    const notificationFn = new NodejsFunction(
      this,
      `${stackName}-NotificationFn`,
      {
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
        },
        description:
          'Sends formatted alert emails via SES on CloudWatch alarms',
        environment: {
          ALERT_EMAIL_FROM: props.alertFromEmail,
          ALERT_EMAIL_TO: props.alertEmail,
          DASHBOARD_URL: '',
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

    this.alertTopic.addSubscription(new LambdaSubscription(notificationFn));

    if (props.alertEmail) {
      this.alertTopic.addSubscription(new EmailSubscription(props.alertEmail));
    }

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
    ) =>
      new Metric({
        namespace: 'AWS/Lambda',
        metricName,
        dimensionsMap: { FunctionName: functionName },
        statistic,
        period: Duration.minutes(1),
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

    const fnNames = Object.values(lambdaFunctions);
    const fnEntries = Object.entries(lambdaFunctions);

    this.dashboard.addWidgets(
      new GraphWidget({
        title: 'Invocations',
        left: fnNames.map((fn) => lambdaMetric(fn, 'Invocations')),
        width: 8,
      }),
      new GraphWidget({
        title: 'Errors',
        left: fnNames.map((fn) => lambdaMetric(fn, 'Errors')),
        width: 8,
      }),
      new GraphWidget({
        title: 'Duration (p90)',
        left: fnNames.map((fn) => lambdaMetric(fn, 'Duration', 'p90')),
        width: 8,
      }),
    );

    this.dashboard.addWidgets(
      new GraphWidget({
        title: 'Throttles',
        left: fnNames.map((fn) => lambdaMetric(fn, 'Throttles')),
        width: 12,
      }),
      new GraphWidget({
        title: 'Concurrent Executions',
        left: fnEntries.map(([, fn]) =>
          lambdaMetric(fn, 'ConcurrentExecutions', 'Maximum'),
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

    const triggerNames = Object.values(cognitoTriggers);

    this.dashboard.addWidgets(
      new GraphWidget({
        title: 'Invocations',
        left: triggerNames.map((fn) =>
          lambdaMetric(fn, 'Invocations').with({
            period: Duration.minutes(5),
          }),
        ),
        width: 8,
      }),
      new GraphWidget({
        title: 'Errors',
        left: triggerNames.map((fn) =>
          lambdaMetric(fn, 'Errors').with({ period: Duration.minutes(5) }),
        ),
        width: 8,
      }),
      new GraphWidget({
        title: 'Duration',
        left: triggerNames.map((fn) =>
          lambdaMetric(fn, 'Duration', 'Average').with({
            period: Duration.minutes(5),
          }),
        ),
        width: 8,
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
