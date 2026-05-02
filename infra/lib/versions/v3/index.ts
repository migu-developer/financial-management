import type { NamedStackFactory } from '@utils/types';
import type { Construct } from 'constructs';
import { fullStackResource } from '@config/entry-config';
import { ActiveStack } from './stacks';
import { ActiveStack as V2Stack } from '@versions/v2/stacks';
import { MonitoringStack } from './monitoring-stack';

const createMonitoringStack: NamedStackFactory = {
  name: 'Monitoring',
  create: (scope: Construct, version: string) =>
    new MonitoringStack(
      scope,
      fullStackResource(version, `${ActiveStack.MONITORING}Stack`),
      {
        version,
        stackName: fullStackResource(version, ActiveStack.MONITORING),
        description:
          'CloudWatch dashboard, alarms, and SNS notifications for all services',
        alertEmail: process.env.ALERT_EMAIL_TO ?? '',
        alertFromEmail: process.env.ALERT_EMAIL_FROM ?? '',
        stage: process.env.STAGE ?? 'dev',
        dependsOn: [
          V2Stack.API_GATEWAY,
          V2Stack.LAMBDA_EXPENSES,
          V2Stack.LAMBDA_DOCUMENTS,
          V2Stack.LAMBDA_CURRENCIES,
          V2Stack.LAMBDA_USERS,
          V2Stack.LAMBDA_EXCHANGE_RATES,
          V2Stack.AMPLIFY_HOSTING,
        ],
      },
    ),
};

export const v3Stacks: NamedStackFactory[] = [createMonitoringStack];
