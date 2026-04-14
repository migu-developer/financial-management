import type { NamedStackFactory } from '@utils/types';
import type { Construct } from 'constructs';
import { fullStackResource } from '@config/entry-config';
import { ActiveStack } from './stacks';
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
      },
    ),
};

export const v3Stacks: NamedStackFactory[] = [createMonitoringStack];
