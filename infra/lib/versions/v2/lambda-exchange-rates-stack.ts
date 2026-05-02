import { BaseStack, BaseStackProps } from '@core/base-stack';
import { exportForCrossVersion } from '@utils/cross-version';
import { Duration } from 'aws-cdk-lib';
import { Rule, Schedule } from 'aws-cdk-lib/aws-events';
import { LambdaFunction } from 'aws-cdk-lib/aws-events-targets';
import { Runtime, Tracing } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction, OutputFormat } from 'aws-cdk-lib/aws-lambda-nodejs';
import { LogGroup, RetentionDays } from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';
import { join } from 'path';

export interface LambdaExchangeRatesStackProps extends BaseStackProps {
  readonly databaseUrl: string;
  readonly exchangeRateApiKey: string;
  readonly exchangeRateApiBaseUrl: string;
  readonly stage: string;
}

export class LambdaExchangeRatesStack extends BaseStack {
  constructor(
    scope: Construct,
    id: string,
    props: LambdaExchangeRatesStackProps,
  ) {
    const {
      version,
      stackName,
      description,
      databaseUrl,
      exchangeRateApiKey,
      exchangeRateApiBaseUrl,
      stage,
    } = props;
    super(scope, id, { version, stackName, description });

    // ── Lambda Function ─────────────────────────────────────
    const fnName = `fm-${stage}-update-rates`;
    const logGroup = new LogGroup(this, `${stackName}-UpdateRatesLogGroup`, {
      logGroupName: `/aws/lambda/${fnName}`,
      retention: RetentionDays.THREE_MONTHS,
    });

    const lambda = new NodejsFunction(this, `${stackName}-UpdateRatesFn`, {
      functionName: fnName,
      runtime: Runtime.NODEJS_24_X,
      entry: join(
        __dirname,
        '../../../node_modules/@services/currencies/src/handlers/update-rates.ts',
      ),
      bundling: {
        format: OutputFormat.ESM,
        sourceMap: true,
        minify: true,
        nodeModules: ['aws-xray-sdk-core'],
        environment: { npm_config_trust_policy: 'lenient' },
        banner:
          "import { createRequire } from 'module'; const require = createRequire(import.meta.url);",
      },
      handler: 'handler',
      timeout: Duration.seconds(60),
      memorySize: 128,
      tracing: Tracing.ACTIVE,
      logGroup,
      environment: {
        DATABASE_URL: databaseUrl,
        EXCHANGE_RATE_API_KEY: exchangeRateApiKey,
        EXCHANGE_RATE_API_BASE_URL: exchangeRateApiBaseUrl,
      },
    });

    // ── EventBridge Schedule (every 12 hours) ───────────────
    new Rule(this, `${stackName}-UpdateRatesSchedule`, {
      ruleName: `fm-${stage}-update-rates-schedule`,
      description: 'Triggers exchange rate update every 12 hours',
      schedule: Schedule.rate(Duration.hours(12)),
      targets: [new LambdaFunction(lambda)],
    });

    exportForCrossVersion(
      this,
      'FunctionName',
      lambda.functionName,
      version,
      'LambdaExchangeRates',
    );
  }
}
