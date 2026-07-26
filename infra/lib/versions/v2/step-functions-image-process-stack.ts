import { BaseStack, BaseStackProps } from '@core/base-stack';
import {
  ATTACHMENT_READY_PREFIX,
  ATTACHMENT_UPLOAD_PREFIX,
} from '@packages/models/chat/attachment-keys';
import { exportForCrossVersion, importFromVersion } from '@utils/cross-version';
import type { StackDeps } from '@utils/types';
import { Duration } from 'aws-cdk-lib';
import { EventField, Rule, RuleTargetInput } from 'aws-cdk-lib/aws-events';
import { SfnStateMachine } from 'aws-cdk-lib/aws-events-targets';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Architecture, Runtime, Tracing } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction, OutputFormat } from 'aws-cdk-lib/aws-lambda-nodejs';
import { LogGroup, RetentionDays } from 'aws-cdk-lib/aws-logs';
import {
  Choice,
  Condition,
  DefinitionBody,
  Fail,
  LogLevel,
  Pass,
  StateMachine,
  StateMachineType,
  Succeed,
  TaskInput,
} from 'aws-cdk-lib/aws-stepfunctions';
import {
  CallAwsService,
  LambdaInvoke,
} from 'aws-cdk-lib/aws-stepfunctions-tasks';
import { Construct } from 'constructs';
import { join } from 'path';

/**
 * sharp version installed into the image Lambdas' bundles.
 *
 * MUST match `sharp` in the `catalog:` block of `pnpm-workspace.yaml`, so the
 * binary that runs in Lambda is the same one the unit tests exercise locally.
 * `step-functions-image-process-stack.test.ts` asserts the two agree.
 */
export const SHARP_VERSION = '0.35.3';

export interface StepFunctionsImageProcessStackProps extends BaseStackProps {
  readonly deps?: StackDeps;
  readonly stage: string;
}

/**
 * ImageProcess state machine — normalizes an uploaded attachment before the
 * chat workflow ever sees it.
 *
 * Triggered by the S3 `ObjectCreated` event (via EventBridge) on the UPLOAD
 * prefix, so the user can send any image the client can produce and still get
 * something Textract accepts.
 *
 *   Probe → NeedsConversion?
 *             ├── unsupported  → PublishRejected → Succeed   (user error, NO alarm)
 *             ├── convert      → Convert   ─┐
 *             └── passthrough  → CopyOriginal ─┴→ PublishReady → Succeed
 *   (any genuine fault) ──────────────────────→ PublishFailed → Fail (alarms)
 *
 * Deliberately SEPARATE from ChatProcess: it lets a bad image be rejected
 * before any chat message row exists, and keeps the heavy image Lambda (and its
 * native sharp binary) off the conversational path.
 */
export class StepFunctionsImageProcessStack extends BaseStack {
  public readonly stateMachine: StateMachine;
  private logRetention: RetentionDays = RetentionDays.THREE_MONTHS;

  constructor(
    scope: Construct,
    id: string,
    props: StepFunctionsImageProcessStackProps,
  ) {
    const { version, stackName, description, stage } = props;
    super(scope, id, { version, stackName, description });

    this.logRetention =
      stage === 'prod' ? RetentionDays.THREE_MONTHS : RetentionDays.ONE_MONTH;

    const attachmentsBucketName = importFromVersion(
      this,
      version,
      'ChatAttachments',
      'AttachmentsBucketName',
    );
    const attachmentsBucketArn = importFromVersion(
      this,
      version,
      'ChatAttachments',
      'AttachmentsBucketArn',
    );
    const appSyncHttpDns = importFromVersion(
      this,
      version,
      'AppSyncEvents',
      'HttpDns',
    );
    const appSyncEventApiArn = importFromVersion(
      this,
      version,
      'AppSyncEvents',
      'EventApiArn',
    );
    const chatNamespaceName = importFromVersion(
      this,
      version,
      'AppSyncEvents',
      'ChatNamespaceName',
    );

    // ── Lambdas ────────────────────────────────────────────
    const probeFn = this.makeImageLambda(
      'ProbeImageFn',
      `fm-${stage}-chat-probe-image`,
      'src/handlers/sfn-probe-attachment-image.ts',
      { CHAT_ATTACHMENTS_BUCKET: attachmentsBucketName },
      // Probing only reads metadata, but libvips still loads the file.
      1024,
      Duration.seconds(30),
    );
    const convertFn = this.makeImageLambda(
      'ConvertImageFn',
      `fm-${stage}-chat-convert-image`,
      'src/handlers/sfn-convert-attachment-image.ts',
      { CHAT_ATTACHMENTS_BUCKET: attachmentsBucketName },
      // libvips decodes the full bitmap; on Lambda more memory also means more
      // CPU, so a bigger size finishes sooner for nearly the same cost.
      2048,
      Duration.seconds(120),
    );
    const publishStatusFn = this.makeImageLambda(
      'PublishAttachmentStatusFn',
      `fm-${stage}-chat-publish-attachment`,
      'src/handlers/sfn-publish-attachment-status.ts',
      {
        APPSYNC_HTTP_DNS: appSyncHttpDns,
        APPSYNC_CHAT_NAMESPACE: chatNamespaceName,
      },
      // No image work here — just a signed HTTPS publish.
      256,
      Duration.seconds(30),
      // sharp is only needed by the two image Lambdas; bundling it into the
      // publisher would add ~30 MB and a Docker build for nothing.
      false,
    );

    // ── IAM ────────────────────────────────────────────────
    const uploadPrefixArn = `${attachmentsBucketArn}/${ATTACHMENT_UPLOAD_PREFIX}/*`;
    const readyPrefixArn = `${attachmentsBucketArn}/${ATTACHMENT_READY_PREFIX}/*`;

    // Probe only ever READS a raw upload.
    probeFn.addToRolePolicy(
      new PolicyStatement({
        actions: ['s3:GetObject'],
        resources: [uploadPrefixArn],
      }),
    );
    // Convert reads the raw upload and writes ONLY to the ready prefix — it can
    // never overwrite a user's original.
    convertFn.addToRolePolicy(
      new PolicyStatement({
        actions: ['s3:GetObject'],
        resources: [uploadPrefixArn],
      }),
    );
    convertFn.addToRolePolicy(
      new PolicyStatement({
        actions: ['s3:PutObject'],
        resources: [readyPrefixArn],
      }),
    );
    publishStatusFn.addToRolePolicy(
      new PolicyStatement({
        actions: ['appsync:EventPublish'],
        resources: [`${appSyncEventApiArn}/*`],
      }),
    );

    // ── Resilience helpers ─────────────────────────────────
    const LAMBDA_RETRY_ERRORS = [
      'Lambda.ServiceException',
      'Lambda.AWSLambdaException',
      'Lambda.SdkClientException',
      'Lambda.TooManyRequestsException',
    ];
    const addLambdaRetry = (task: LambdaInvoke) =>
      task.addRetry({
        errors: LAMBDA_RETRY_ERRORS,
        interval: Duration.seconds(1),
        maxAttempts: 3,
        backoffRate: 2,
      });
    const LAMBDA_TASK_TIMEOUT = { seconds: 130 } as never;

    // ── States ─────────────────────────────────────────────
    const probeImage = new LambdaInvoke(this, 'ProbeImage', {
      lambdaFunction: probeFn,
      payload: TaskInput.fromObject({ 'uploadKey.$': '$.uploadKey' }),
      resultPath: '$.probe',
      payloadResponseOnly: true,
      taskTimeout: LAMBDA_TASK_TIMEOUT,
    });
    addLambdaRetry(probeImage);

    const convertImage = new LambdaInvoke(this, 'ConvertImage', {
      lambdaFunction: convertFn,
      payload: TaskInput.fromObject({
        'uploadKey.$': '$.probe.uploadKey',
        'readyKey.$': '$.probe.readyKey',
      }),
      resultPath: '$.converted',
      payloadResponseOnly: true,
      taskTimeout: LAMBDA_TASK_TIMEOUT,
    });
    addLambdaRetry(convertImage);

    // Already Textract-ready: a server-side copy is enough, so this costs no
    // Lambda invocation at all. CopySource must be `bucket/key`.
    const copyOriginal = new CallAwsService(this, 'CopyOriginal', {
      service: 's3',
      action: 'copyObject',
      parameters: {
        Bucket: attachmentsBucketName,
        'Key.$': '$.probe.readyKey',
        // CopySource is `bucket/key`. Our keys only ever contain UUIDs, slashes
        // and a file extension, so no URL-encoding is required here.
        'CopySource.$': `States.Format('${attachmentsBucketName}/{}', $.probe.uploadKey)`,
      },
      // Read side only. The PutObject half is granted explicitly on the state
      // machine role below — `s3:*Object` would also hand out DeleteObject.
      iamResources: [uploadPrefixArn],
      iamAction: 's3:GetObject',
      resultPath: '$.copied',
    });

    const publishReady = new LambdaInvoke(this, 'PublishReady', {
      lambdaFunction: publishStatusFn,
      payload: TaskInput.fromObject({
        'uid.$': '$.probe.userId',
        'uploadKey.$': '$.probe.uploadKey',
        'readyKey.$': '$.probe.readyKey',
        outcome: 'ready',
      }),
      payloadResponseOnly: true,
      resultPath: '$.published',
      taskTimeout: LAMBDA_TASK_TIMEOUT,
    });
    addLambdaRetry(publishReady);

    const publishRejected = new LambdaInvoke(this, 'PublishRejected', {
      lambdaFunction: publishStatusFn,
      payload: TaskInput.fromObject({
        'uid.$': '$.probe.userId',
        'uploadKey.$': '$.probe.uploadKey',
        outcome: 'unsupported',
      }),
      payloadResponseOnly: true,
      resultPath: '$.published',
      taskTimeout: LAMBDA_TASK_TIMEOUT,
    });
    addLambdaRetry(publishRejected);

    // An image we cannot decode is the USER's problem, not ours: the execution
    // ends SUCCEEDED so it never trips ExecutionsFailed on someone's photo.
    const rejected = new Succeed(this, 'AttachmentRejected');
    const normalized = new Succeed(this, 'AttachmentNormalized');

    // ── Catch-all: a GENUINE fault ─────────────────────────
    // Publishes a static message so the client never waits forever, then fails
    // the execution so the alarm still fires.
    const processingFailed = new Fail(this, 'ImageProcessingFailed', {
      error: 'ChatImageProcessingError',
      cause:
        'Image normalization failed after retries; a friendly message was published to the user.',
    });
    // `$.probe.userId` may not exist yet (Probe itself can be what failed), so
    // recover the owner from the upload key instead — it is always in the input.
    const resolveOwner = new Pass(this, 'ResolveOwnerFromKey', {
      parameters: {
        'uploadKey.$': '$.uploadKey',
        'userId.$':
          "States.ArrayGetItem(States.StringSplit($.uploadKey, '/'), 1)",
      },
      resultPath: '$.owner',
    });
    const publishFailed = new LambdaInvoke(this, 'PublishFailed', {
      lambdaFunction: publishStatusFn,
      payload: TaskInput.fromObject({
        'uid.$': '$.owner.userId',
        'uploadKey.$': '$.owner.uploadKey',
        outcome: 'failed',
      }),
      payloadResponseOnly: true,
      resultPath: '$.published',
      taskTimeout: LAMBDA_TASK_TIMEOUT,
    });
    addLambdaRetry(publishFailed);
    resolveOwner.next(publishFailed);
    publishFailed.next(processingFailed);

    for (const task of [probeImage, convertImage, copyOriginal, publishReady]) {
      task.addCatch(resolveOwner, {
        errors: ['States.ALL'],
        resultPath: '$.error',
      });
    }
    // PublishRejected has no catch: it is already the error-reporting path, and
    // a failure there legitimately fails the execution.

    const decision = new Choice(this, 'NeedsConversion?')
      .when(
        Condition.stringEquals('$.probe.decision', 'unsupported'),
        publishRejected.next(rejected),
      )
      .when(
        Condition.stringEquals('$.probe.decision', 'convert'),
        convertImage.next(publishReady),
      )
      .otherwise(copyOriginal.next(publishReady));

    publishReady.next(normalized);

    const definition = probeImage.next(decision);

    // ── State machine ──────────────────────────────────────
    const logGroup = new LogGroup(this, `${stackName}-StateMachineLogs`, {
      logGroupName: `/aws/vendedlogs/states/fm-${stage}-image-process`,
      retention: this.logRetention,
    });

    this.stateMachine = new StateMachine(this, `${stackName}-ImageProcess`, {
      stateMachineName: `fm-${stage}-image-process`,
      stateMachineType: StateMachineType.STANDARD,
      definitionBody: DefinitionBody.fromChainable(definition),
      tracingEnabled: true,
      logs: {
        destination: logGroup,
        level: stage === 'prod' ? LogLevel.ERROR : LogLevel.ALL,
        includeExecutionData: true,
      },
      // Nothing here waits on a human, so a short backstop is right: a run
      // that has not finished in 10 minutes is stuck, not slow.
      timeout: Duration.minutes(10),
    });

    // The CopyOriginal task writes under the state machine's own role.
    this.stateMachine.addToRolePolicy(
      new PolicyStatement({
        actions: ['s3:PutObject'],
        resources: [readyPrefixArn],
      }),
    );

    // ── EventBridge: S3 upload → StartExecution ────────────
    // The prefix filter is what prevents an infinite loop: the normalized
    // object is written to the SAME bucket, and without this filter its own
    // ObjectCreated event would start the workflow again.
    new Rule(this, `${stackName}-UploadRule`, {
      ruleName: `fm-${stage}-chat-attachment-uploaded`,
      description:
        'Starts the ImageProcess state machine when a chat attachment is uploaded',
      eventPattern: {
        source: ['aws.s3'],
        detailType: ['Object Created'],
        detail: {
          bucket: { name: [attachmentsBucketName] },
          object: { key: [{ prefix: `${ATTACHMENT_UPLOAD_PREFIX}/` }] },
        },
      },
      targets: [
        new SfnStateMachine(this.stateMachine, {
          // Reshape the S3 event into the workflow's own input contract, so no
          // state has to know the S3 event schema.
          input: RuleTargetInput.fromObject({
            uploadKey: EventField.fromPath('$.detail.object.key'),
          }),
        }),
      ],
    });

    exportForCrossVersion(
      this,
      'StateMachineArn',
      this.stateMachine.stateMachineArn,
      version,
      'StepFunctionsImageProcess',
    );
    exportForCrossVersion(
      this,
      'ProbeImageFnName',
      probeFn.functionName,
      version,
      'StepFunctionsImageProcess',
    );
    exportForCrossVersion(
      this,
      'ConvertImageFnName',
      convertFn.functionName,
      version,
      'StepFunctionsImageProcess',
    );
    exportForCrossVersion(
      this,
      'PublishAttachmentFnName',
      publishStatusFn.functionName,
      version,
      'StepFunctionsImageProcess',
    );
  }

  private makeImageLambda(
    id: string,
    fnName: string,
    relativeEntry: string,
    env: Record<string, string>,
    memorySize: number,
    timeout: Duration,
    withSharp = true,
  ): NodejsFunction {
    const logGroup = new LogGroup(this, `${id}LogGroup`, {
      logGroupName: `/aws/lambda/${fnName}`,
      retention: this.logRetention,
    });

    return new NodejsFunction(this, id, {
      functionName: fnName,
      runtime: Runtime.NODEJS_24_X,
      // Explicit so the Docker bundling image below matches the target arch.
      architecture: Architecture.X86_64,
      entry: join(
        __dirname,
        '../../../node_modules/@services/chat',
        relativeEntry,
      ),
      handler: 'handler',
      timeout,
      memorySize,
      tracing: Tracing.ACTIVE,
      logGroup,
      environment: env,
      bundling: {
        format: OutputFormat.ESM,
        sourceMap: true,
        minify: true,
        // `sharp` is a NATIVE module and must never be bundled by esbuild.
        externalModules: withSharp ? ['@aws-sdk/*', 'sharp'] : ['@aws-sdk/*'],
        nodeModules: ['aws-xray-sdk-core'],
        ...(withSharp && {
          commandHooks: {
            beforeBundling: () => [],
            beforeInstall: () => [],
            // Install sharp with EXPLICIT platform overrides.
            //
            // This cannot go through `nodeModules`: CDK installs those with the
            // host's own package manager, so a build on macOS resolves
            // @img/sharp-darwin-arm64 and the function throws "Could not load
            // the sharp module" at runtime. Docker bundling would fix the
            // platform, but `public.ecr.aws/sam/build-nodejs24.x` does not
            // exist, so that path is unavailable.
            //
            // `--os/--cpu/--libc` is sharp's own documented cross-platform
            // recipe and must stay in sync with `architecture` above. npm (not
            // pnpm) is used deliberately: pnpm's symlinked layout is unusable
            // in Lambda, which cannot follow symlinks.
            afterBundling: (_inputDir: string, outputDir: string) => [
              `npm install --prefix ${outputDir} --os=linux --cpu=x64 --libc=glibc --no-save --no-package-lock sharp@${SHARP_VERSION}`,
            ],
          },
        }),
        environment: { npm_config_trust_policy: 'lenient' },
        banner:
          "import { createRequire } from 'module'; const require = createRequire(import.meta.url);",
      },
    });
  }
}
