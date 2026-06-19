import { BaseStack, BaseStackProps } from '@core/base-stack';
import {
  BEDROCK_MODELS,
  CLAUDE_HAIKU_FOUNDATION_MODEL_ID,
  NOVA_LITE_FOUNDATION_MODEL_ID,
  NOVA_MICRO_FOUNDATION_MODEL_ID,
} from '@packages/prompts/bedrock/models';
import { CHAT_BEDROCK_PROMPTS } from '@packages/prompts/chat/catalog';
import { exportForCrossVersion, importFromVersion } from '@utils/cross-version';
import { Duration } from 'aws-cdk-lib';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Runtime, Tracing } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction, OutputFormat } from 'aws-cdk-lib/aws-lambda-nodejs';
import { LogGroup, RetentionDays } from 'aws-cdk-lib/aws-logs';
import {
  Choice,
  Condition,
  DefinitionBody,
  Fail,
  IntegrationPattern,
  JsonPath,
  LogLevel,
  StateMachine,
  StateMachineType,
  Succeed,
  TaskInput,
} from 'aws-cdk-lib/aws-stepfunctions';
import {
  BedrockInvokeModel,
  LambdaInvoke,
} from 'aws-cdk-lib/aws-stepfunctions-tasks';
import { Construct } from 'constructs';
import { join } from 'path';

export interface StepFunctionsChatStackProps extends BaseStackProps {
  readonly databaseUrl: string;
  readonly databaseReadonlyUrl: string;
  readonly stage: string;
}

// All prompt texts, model routing and inference settings come from
// @packages/prompts — the single source of truth shared with services/chat.
const PROMPTS = CHAT_BEDROCK_PROMPTS;

/**
 * StepFunctionsChat stack — the ChatProcess Standard workflow.
 *
 * Provisions:
 *   - 5 task Lambdas (sfn-execute-query, sfn-validate-expense-fields,
 *     sfn-create-expense, sfn-save-and-publish, sfn-save-preview)
 *   - State machine with Bedrock direct integration for 8 Bedrock calls and
 *     Lambda invokes for business logic / persistence
 *   - Human-in-the-Loop: WaitForConfirmation uses `.waitForTaskToken`
 *   - Choice states for intent (QUERY/CREATE/UNKNOWN), fields-complete and
 *     user-confirmed
 *
 * Exports `StateMachineArn` so the LambdaChat stack can grant
 * `states:StartExecution` to the chat handler.
 */
export class StepFunctionsChatStack extends BaseStack {
  public readonly stateMachine: StateMachine;

  constructor(
    scope: Construct,
    id: string,
    props: StepFunctionsChatStackProps,
  ) {
    const {
      version,
      stackName,
      description,
      databaseUrl,
      databaseReadonlyUrl,
      stage,
    } = props;
    super(scope, id, { version, stackName, description });

    // ── Lambdas ────────────────────────────────────────────
    const baseEnv = {
      DATABASE_URL: databaseUrl,
      DATABASE_READONLY_URL: databaseReadonlyUrl,
    };

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

    const publisherEnv = {
      APPSYNC_HTTP_DNS: appSyncHttpDns,
      APPSYNC_CHAT_NAMESPACE: chatNamespaceName,
    };

    const executeQueryFn = this.makeLambda(
      'ExecuteQueryFn',
      `fm-${stage}-chat-execute-query`,
      'src/handlers/sfn-execute-query.ts',
      baseEnv,
    );
    const validateFieldsFn = this.makeLambda(
      'ValidateFieldsFn',
      `fm-${stage}-chat-validate-fields`,
      'src/handlers/sfn-validate-expense-fields.ts',
      baseEnv,
    );
    const createExpenseFn = this.makeLambda(
      'CreateExpenseFn',
      `fm-${stage}-chat-create-expense`,
      'src/handlers/sfn-create-expense.ts',
      baseEnv,
    );
    const saveAndPublishFn = this.makeLambda(
      'SaveAndPublishFn',
      `fm-${stage}-chat-save-and-publish`,
      'src/handlers/sfn-save-and-publish.ts',
      { ...baseEnv, ...publisherEnv },
    );
    const savePreviewFn = this.makeLambda(
      'SavePreviewFn',
      `fm-${stage}-chat-save-preview`,
      'src/handlers/sfn-save-preview.ts',
      { ...baseEnv, ...publisherEnv },
    );

    // Grant the publishers IAM EventPublish on the Event API.
    const eventApiPublishPolicy = new PolicyStatement({
      actions: ['appsync:EventPublish'],
      resources: [`${appSyncEventApiArn}/*`],
    });
    saveAndPublishFn.addToRolePolicy(eventApiPublishPolicy);
    savePreviewFn.addToRolePolicy(eventApiPublishPolicy);

    // ── Bedrock task helpers ───────────────────────────────
    // Every model is invoked through its `us.` cross-region INFERENCE PROFILE
    // (built as an ARN by hand), never the bare on-demand model id: Nova is
    // not on-demand-invocable in every region (fails in us-east-2), and
    // Anthropic Claude requires a profile everywhere. We then grant
    // bedrock:InvokeModel on the profile (auto, per task) AND on the underlying
    // foundation models the profiles fan out to (us-east-1/2, us-west-2).
    const inferenceProfile = (profileId: string) => ({
      modelArn: `arn:aws:bedrock:${this.region}:${this.account}:inference-profile/${profileId}`,
    });
    const novaMicro = inferenceProfile(BEDROCK_MODELS.NOVA_MICRO);
    const novaLite = inferenceProfile(BEDROCK_MODELS.NOVA_LITE);
    const claudeHaiku = inferenceProfile(BEDROCK_MODELS.CLAUDE_HAIKU);

    const novaBody = (
      systemPrompt: string,
      userPromptPath: string,
      maxTokens: number,
    ) =>
      TaskInput.fromObject({
        messages: [
          {
            role: 'user',
            content: [{ 'text.$': userPromptPath }],
          },
        ],
        inferenceConfig: { max_new_tokens: maxTokens, temperature: 0 },
        system: [{ text: systemPrompt }],
      });

    const claudeBody = (
      systemPrompt: string,
      userPromptPath: string,
      maxTokens: number,
      temperature = 0.5,
    ) =>
      TaskInput.fromObject({
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: maxTokens,
        temperature,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            'content.$': userPromptPath,
          },
        ],
      });

    // ── Resilience helpers ─────────────────────────────────
    // Transient infra errors worth retrying on a task Lambda. Business
    // failures surface as States.TaskFailed and are intentionally NOT retried
    // (they route to the catch-all error path instead).
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

    // Bound every model call so a stalled Bedrock invocation can't pin an
    // execution open up to the 8-day state-machine timeout. The `as never`
    // cast matches the existing WaitForConfirmation taskTimeout shape.
    const BEDROCK_TASK_TIMEOUT = { seconds: 60 } as never;
    const LAMBDA_TASK_TIMEOUT = { seconds: 40 } as never;

    // ── Step Function states ───────────────────────────────

    // [1] Classify intent → output: $.intent (string)
    const classifyIntent = new BedrockInvokeModel(this, 'ClassifyIntent', {
      model: novaMicro,
      body: novaBody(
        PROMPTS.intent.system,
        "States.Format('Historial de la conversación: {} === Último mensaje del usuario: {}', $.history, $.content)",
        PROMPTS.intent.maxTokens,
      ),
      resultSelector: {
        'intent.$': '$.Body.output.message.content[0].text',
      },
      resultPath: '$.intentResult',
      taskTimeout: BEDROCK_TASK_TIMEOUT,
    });

    // Note: Nova Micro may return "QUERY", "QUERY ", "QUERY.\n" etc.
    // We use `stringMatches` with `*` wildcards in the Choice below instead
    // of trying to normalize the value in a Pass state (Step Functions'
    // intrinsic functions are too limited to make that clean).

    // [2] Extract SQL params (QUERY branch) → output: $.queryParams JSON
    const extractSqlParams = new BedrockInvokeModel(this, 'ExtractSqlParams', {
      model: novaLite,
      body: novaBody(
        PROMPTS.extractSqlParams.system,
        "States.Format('Fecha actual: {}. Historial: {} === Mensaje actual: {}', $$.Execution.StartTime, $.history, $.content)",
        PROMPTS.extractSqlParams.maxTokens,
      ),
      resultSelector: {
        'json.$': '$.Body.output.message.content[0].text',
      },
      resultPath: '$.queryParamsRaw',
      taskTimeout: BEDROCK_TASK_TIMEOUT,
    });

    // Pass the raw JSON string Nova Lite produced straight to the Lambda;
    // the handler itself strips any markdown fence and parses it. `today`
    // comes from the Step Functions context object (ISO timestamp).
    const executeQuery = new LambdaInvoke(this, 'ExecuteQuery', {
      lambdaFunction: executeQueryFn,
      payload: TaskInput.fromObject({
        'uid.$': '$.userId',
        'rawJson.$': '$.queryParamsRaw.json',
        'today.$': '$$.Execution.StartTime',
      }),
      resultPath: '$.queryResult',
      payloadResponseOnly: true,
      taskTimeout: LAMBDA_TASK_TIMEOUT,
    });

    const generateQueryNL = new BedrockInvokeModel(this, 'GenerateQueryNL', {
      model: claudeHaiku,
      body: claudeBody(
        PROMPTS.nlResponse.system,
        "States.Format('Consulta del usuario: {}. Resultados: {}', $.content, States.JsonToString($.queryResult))",
        PROMPTS.nlResponse.maxTokens,
        PROMPTS.nlResponse.temperature,
      ),
      resultSelector: { 'text.$': '$.Body.content[0].text' },
      resultPath: '$.nlAnswer',
      taskTimeout: BEDROCK_TASK_TIMEOUT,
    });

    // [3] Extract expense fields (CREATE branch) → JSON
    const extractFields = new BedrockInvokeModel(this, 'ExtractExpenseFields', {
      model: novaLite,
      body: novaBody(
        PROMPTS.extractExpenseFields.system,
        "States.Format('Fecha actual: {}. Historial: {} === Mensaje actual: {}', $$.Execution.StartTime, $.history, $.content)",
        PROMPTS.extractExpenseFields.maxTokens,
      ),
      resultSelector: {
        'json.$': '$.Body.output.message.content[0].text',
      },
      resultPath: '$.fieldsRaw',
      taskTimeout: BEDROCK_TASK_TIMEOUT,
    });

    // Validate parses the raw JSON inside the Lambda (handles markdown fences).
    const validateFields = new LambdaInvoke(this, 'ValidateFields', {
      lambdaFunction: validateFieldsFn,
      payload: TaskInput.fromObject({
        'rawJson.$': '$.fieldsRaw.json',
      }),
      resultPath: '$.validation',
      payloadResponseOnly: true,
      taskTimeout: LAMBDA_TASK_TIMEOUT,
    });

    // [4] Preview + WaitForConfirmation (HITL)
    const generatePreview = new BedrockInvokeModel(this, 'GeneratePreview', {
      model: claudeHaiku,
      body: claudeBody(
        PROMPTS.preview.system,
        // Feed the human-readable `display` (labels/codes), NOT `fields`
        // (which carries catalog UUIDs that would leak into the message).
        "States.Format('Gasto a registrar: {}', States.JsonToString($.validation.display))",
        PROMPTS.preview.maxTokens,
        PROMPTS.preview.temperature,
      ),
      resultSelector: { 'text.$': '$.Body.content[0].text' },
      resultPath: '$.preview',
      taskTimeout: BEDROCK_TASK_TIMEOUT,
    });

    // A preview can wait up to 7 days for the user to Confirm/Cancel — they
    // may decide today, tomorrow or next week. Step Functions Standard bills
    // per state transition (not per wait time), so a paused execution costs
    // nothing while it waits.
    const waitForConfirmation = new LambdaInvoke(this, 'WaitForConfirmation', {
      lambdaFunction: savePreviewFn,
      integrationPattern: IntegrationPattern.WAIT_FOR_TASK_TOKEN,
      payload: TaskInput.fromObject({
        'sessionId.$': '$.sessionId',
        'uid.$': '$.userId',
        'userEmail.$': '$.userEmail',
        'content.$': '$.preview.text',
        taskToken: JsonPath.taskToken,
      }),
      resultPath: '$.confirmation',
      taskTimeout: { seconds: 7 * 24 * 60 * 60 } as never, // 7 days
    });

    // If the 7-day window elapses with no decision, the task raises
    // States.Timeout. Catch it and end the execution cleanly (no expense, no
    // publish) instead of letting it surface as a failed/timed-out execution
    // that would page an on-call alarm — an abandoned HITL preview is expected,
    // not an error. The matching DB row is reconciled to 'expired' lazily when
    // a late Confirm/Cancel hits a now-invalid task token.
    const previewExpired = new Succeed(this, 'PreviewExpired');
    waitForConfirmation.addCatch(previewExpired, {
      errors: ['States.Timeout'],
    });

    // [5] Create expense + confirmation message
    const createExpense = new LambdaInvoke(this, 'CreateExpense', {
      lambdaFunction: createExpenseFn,
      payload: TaskInput.fromObject({
        'uid.$': '$.userId',
        'userEmail.$': '$.userEmail',
        'fields.$': '$.validation.fields',
      }),
      resultPath: '$.createResult',
      payloadResponseOnly: true,
      taskTimeout: LAMBDA_TASK_TIMEOUT,
    });

    const generateConfirmation = new BedrockInvokeModel(
      this,
      'GenerateConfirmation',
      {
        model: claudeHaiku,
        body: claudeBody(
          PROMPTS.confirmation.system,
          // Use the human-readable `display` (labels/codes) instead of the
          // created row, which carries catalog UUIDs.
          "States.Format('Gasto registrado: {}', States.JsonToString($.validation.display))",
          PROMPTS.confirmation.maxTokens,
          PROMPTS.confirmation.temperature,
        ),
        resultSelector: { 'text.$': '$.Body.content[0].text' },
        resultPath: '$.finalText',
        taskTimeout: BEDROCK_TASK_TIMEOUT,
      },
    );

    const generateCancellation = new BedrockInvokeModel(
      this,
      'GenerateCancellation',
      {
        model: claudeHaiku,
        body: claudeBody(
          PROMPTS.cancellation.system,
          "States.Format('Cancelado por el usuario: {}', $.content)",
          PROMPTS.cancellation.maxTokens,
          PROMPTS.cancellation.temperature,
        ),
        resultSelector: { 'text.$': '$.Body.content[0].text' },
        resultPath: '$.finalText',
        taskTimeout: BEDROCK_TASK_TIMEOUT,
      },
    );

    const generateClarification = new BedrockInvokeModel(
      this,
      'GenerateClarification',
      {
        model: claudeHaiku,
        body: claudeBody(
          PROMPTS.clarification.system,
          'States.Format(\'Faltan estos campos: {}. Moneda no soportada: "{}". Monedas disponibles: {}. Mensaje original: {}\', States.JsonToString($.validation.missing), $.validation.unsupportedCurrency, States.JsonToString($.validation.availableCurrencies), $.content)',
          PROMPTS.clarification.maxTokens,
          PROMPTS.clarification.temperature,
        ),
        resultSelector: { 'text.$': '$.Body.content[0].text' },
        resultPath: '$.finalText',
        taskTimeout: BEDROCK_TASK_TIMEOUT,
      },
    );

    // [6] Terminal: save assistant message + publish via AppSync Events
    const saveAndPublish = (
      id: string,
      contentPath: string,
      expensePath?: string,
    ) =>
      new LambdaInvoke(this, id, {
        lambdaFunction: saveAndPublishFn,
        payload: TaskInput.fromObject({
          'sessionId.$': '$.sessionId',
          'uid.$': '$.userId',
          'userEmail.$': '$.userEmail',
          'content.$': contentPath,
          ...(expensePath !== undefined && { 'expenseId.$': expensePath }),
        }),
        payloadResponseOnly: true,
        taskTimeout: LAMBDA_TASK_TIMEOUT,
      });

    const saveQueryAnswer = saveAndPublish(
      'SaveQueryAnswer',
      '$.nlAnswer.text',
    );
    const saveCreatedExpense = saveAndPublish(
      'SaveCreatedExpense',
      '$.finalText.text',
      '$.createResult.expense.id',
    );
    const saveCancellation = saveAndPublish(
      'SaveCancellation',
      '$.finalText.text',
    );
    const saveClarification = saveAndPublish(
      'SaveClarification',
      '$.finalText.text',
    );
    const saveUnknownReply = saveAndPublish(
      'SaveUnknownReply',
      '$.finalText.text',
    );

    // ── Choice states ───────────────────────────────────────
    // When the user iterates on a preview, the send-message use case releases
    // this paused execution with `{ confirmed: false, superseded: true }`.
    // End silently: don't create an expense and don't publish a cancellation
    // (a new preview is already on its way from the iterating message).
    const supersededSucceed = new Succeed(this, 'PreviewSuperseded');

    const confirmedChoice = new Choice(this, 'Confirmed?')
      .when(
        Condition.and(
          Condition.isPresent('$.confirmation.superseded'),
          Condition.booleanEquals('$.confirmation.superseded', true),
        ),
        supersededSucceed,
      )
      .when(
        Condition.booleanEquals('$.confirmation.confirmed', true),
        createExpense.next(generateConfirmation).next(saveCreatedExpense),
      )
      .otherwise(generateCancellation.next(saveCancellation));

    const fieldsCompleteChoice = new Choice(this, 'FieldsComplete?')
      .when(
        Condition.booleanEquals('$.validation.complete', true),
        generatePreview.next(waitForConfirmation).next(confirmedChoice),
      )
      .otherwise(generateClarification.next(saveClarification));

    const createBranch = extractFields
      .next(validateFields)
      .next(fieldsCompleteChoice);

    const queryBranch = extractSqlParams
      .next(executeQuery)
      .next(generateQueryNL)
      .next(saveQueryAnswer);

    const generateUnknown = new BedrockInvokeModel(this, 'GenerateUnknown', {
      model: claudeHaiku,
      body: claudeBody(
        PROMPTS.unknown.system,
        "States.Format('Historial: {} === Mensaje no entendido: {}', $.history, $.content)",
        PROMPTS.unknown.maxTokens,
        PROMPTS.unknown.temperature,
      ),
      resultSelector: { 'text.$': '$.Body.content[0].text' },
      resultPath: '$.finalText',
      taskTimeout: BEDROCK_TASK_TIMEOUT,
    });

    // Bedrock returns transient 503s ("Too many connections") and throttles
    // under load — without an explicit Retry the whole conversation dies on
    // the first hiccup (observed in dev: ServiceUnavailableException, SDK
    // attempt count 1).
    const bedrockTasks = [
      classifyIntent,
      extractSqlParams,
      generateQueryNL,
      extractFields,
      generatePreview,
      generateConfirmation,
      generateCancellation,
      generateClarification,
      generateUnknown,
    ];

    for (const task of bedrockTasks) {
      task.addRetry({
        errors: [
          'Bedrock.ServiceUnavailableException',
          'Bedrock.ThrottlingException',
          'Bedrock.InternalServerException',
          'Bedrock.ModelTimeoutException',
        ],
        interval: Duration.seconds(2),
        maxAttempts: 4,
        backoffRate: 2,
      });
    }

    // ── Error handling — never leave the client hanging ────
    // Any unhandled failure (Bedrock retries exhausted, a task Lambda error,
    // malformed model JSON) routes here: publish a friendly, STATIC message to
    // the user over AppSync — no Bedrock dependency, since that's exactly what
    // may have failed — then fail the execution so ExecutionsFailed still
    // alarms. The user gets a reply; we still get paged.
    const ERROR_REPLY_TEXT =
      'Uy, tuve un problema procesando tu mensaje. ¿Lo intentamos de nuevo en un momento?';
    const workflowFailed = new Fail(this, 'WorkflowFailed', {
      error: 'ChatWorkflowError',
      cause:
        'A chat workflow step failed after retries; a friendly error message was published to the user.',
    });
    const publishError = new LambdaInvoke(this, 'PublishError', {
      lambdaFunction: saveAndPublishFn,
      payload: TaskInput.fromObject({
        'sessionId.$': '$.sessionId',
        'uid.$': '$.userId',
        'userEmail.$': '$.userEmail',
        content: ERROR_REPLY_TEXT,
        eventKind: 'error',
      }),
      payloadResponseOnly: true,
      taskTimeout: LAMBDA_TASK_TIMEOUT,
    });
    addLambdaRetry(publishError);
    publishError.next(workflowFailed);

    // Attach the catch-all to every task that can fail terminally. PublishError
    // itself has NO catch — a failure there legitimately fails the execution.
    const catchAllTasks: Array<LambdaInvoke | BedrockInvokeModel> = [
      classifyIntent,
      extractSqlParams,
      executeQuery,
      generateQueryNL,
      extractFields,
      validateFields,
      generatePreview,
      createExpense,
      generateConfirmation,
      generateCancellation,
      generateClarification,
      generateUnknown,
      saveQueryAnswer,
      saveCreatedExpense,
      saveCancellation,
      saveClarification,
      saveUnknownReply,
    ];
    for (const task of catchAllTasks) {
      task.addCatch(publishError, {
        errors: ['States.ALL'],
        resultPath: '$.error',
      });
    }

    // WaitForConfirmation already catches States.Timeout → PreviewExpired
    // (registered earlier, so it's evaluated first). Add a second catch for any
    // OTHER error during the preview-save invocation so a failed HITL save also
    // notifies the user instead of hanging silently.
    waitForConfirmation.addCatch(publishError, {
      errors: ['States.ALL'],
      resultPath: '$.error',
    });

    // Retry transient infra errors on the task Lambdas. CreateExpense is
    // deliberately EXCLUDED — it is not idempotent yet, so an infra retry could
    // duplicate the expense; its failures route to the catch-all instead.
    const retryableLambdas = [
      executeQuery,
      validateFields,
      saveQueryAnswer,
      saveCreatedExpense,
      saveCancellation,
      saveClarification,
      saveUnknownReply,
      waitForConfirmation,
    ];
    for (const task of retryableLambdas) {
      addLambdaRetry(task);
    }

    // Use stringMatches with wildcards so trailing whitespace / punctuation
    // from Nova Micro's output doesn't break the dispatch.
    const intentChoice = new Choice(this, 'Intent?')
      .when(
        Condition.stringMatches('$.intentResult.intent', 'QUERY*'),
        queryBranch,
      )
      .when(
        Condition.stringMatches('$.intentResult.intent', 'CREATE*'),
        createBranch,
      )
      .otherwise(generateUnknown.next(saveUnknownReply));

    const definition = classifyIntent.next(intentChoice);

    // ── State Machine ──────────────────────────────────────
    const logGroup = new LogGroup(this, `${stackName}-StateMachineLogs`, {
      logGroupName: `/aws/vendedlogs/states/fm-${stage}-chat-process`,
      retention: RetentionDays.THREE_MONTHS,
    });

    this.stateMachine = new StateMachine(this, `${stackName}-ChatProcess`, {
      stateMachineName: `fm-${stage}-chat-process`,
      stateMachineType: StateMachineType.STANDARD,
      definitionBody: DefinitionBody.fromChainable(definition),
      tracingEnabled: true,
      // Stage-aware logging (cost control): dev logs every transition with
      // full input/output for debugging; prod logs only failing states (the
      // catch-all error path still captures every failure, so we lose no
      // signal). CloudWatch Logs bills on ingestion volume, and LogLevel.ALL
      // with execution data is the dominant lever as chat volume grows.
      logs: {
        destination: logGroup,
        level: stage === 'prod' ? LogLevel.ERROR : LogLevel.ALL,
        includeExecutionData: true,
      },
      // Backstop above the 7-day HITL task timeout so the catchable task-level
      // timeout governs (the execution-level timeout is not catchable).
      timeout: Duration.days(8),
    });

    // For each cross-region inference profile (Nova Micro/Lite, Claude Haiku),
    // the state machine also needs InvokeModel on the underlying foundation
    // models in every region the `us.` profile fans out to. The per-task
    // auto-grant only covers the profile ARN. Scope to those exact regions
    // (not a wildcard) to keep the grant least-privilege.
    const US_PROFILE_REGIONS = ['us-east-1', 'us-east-2', 'us-west-2'];
    const FOUNDATION_MODEL_IDS = [
      CLAUDE_HAIKU_FOUNDATION_MODEL_ID,
      NOVA_MICRO_FOUNDATION_MODEL_ID,
      NOVA_LITE_FOUNDATION_MODEL_ID,
    ];
    this.stateMachine.role.addToPrincipalPolicy(
      new PolicyStatement({
        actions: ['bedrock:InvokeModel'],
        resources: FOUNDATION_MODEL_IDS.flatMap((modelId) =>
          US_PROFILE_REGIONS.map(
            (region) =>
              `arn:aws:bedrock:${region}::foundation-model/${modelId}`,
          ),
        ),
      }),
    );

    // ── Cross-version exports ──────────────────────────────
    exportForCrossVersion(
      this,
      'StateMachineArn',
      this.stateMachine.stateMachineArn,
      version,
      'StepFunctionsChat',
    );
    // Lambda function names — consumed by the v3 monitoring stack to attach
    // error / throttle alarms and dashboard widgets.
    exportForCrossVersion(
      this,
      'ExecuteQueryFnName',
      executeQueryFn.functionName,
      version,
      'StepFunctionsChat',
    );
    exportForCrossVersion(
      this,
      'ValidateFieldsFnName',
      validateFieldsFn.functionName,
      version,
      'StepFunctionsChat',
    );
    exportForCrossVersion(
      this,
      'CreateExpenseFnName',
      createExpenseFn.functionName,
      version,
      'StepFunctionsChat',
    );
    exportForCrossVersion(
      this,
      'SaveAndPublishFnName',
      saveAndPublishFn.functionName,
      version,
      'StepFunctionsChat',
    );
    exportForCrossVersion(
      this,
      'SavePreviewFnName',
      savePreviewFn.functionName,
      version,
      'StepFunctionsChat',
    );
  }

  private makeLambda(
    id: string,
    fnName: string,
    relativeEntry: string,
    env: Record<string, string>,
  ): NodejsFunction {
    const logGroup = new LogGroup(this, `${id}LogGroup`, {
      logGroupName: `/aws/lambda/${fnName}`,
      retention: RetentionDays.THREE_MONTHS,
    });

    return new NodejsFunction(this, id, {
      functionName: fnName,
      runtime: Runtime.NODEJS_24_X,
      entry: join(
        __dirname,
        '../../../node_modules/@services/chat',
        relativeEntry,
      ),
      handler: 'handler',
      timeout: Duration.seconds(30),
      memorySize: 256,
      tracing: Tracing.ACTIVE,
      logGroup,
      environment: env,
      bundling: {
        format: OutputFormat.ESM,
        sourceMap: true,
        minify: true,
        // Only `@aws-sdk/*` is in the Node 24 Lambda runtime. `@smithy/*` and
        // `@aws-crypto/*` are NOT — they must be bundled. Setting
        // `externalModules` explicitly overrides the CDK default which
        // externalises both families.
        externalModules: ['@aws-sdk/*'],
        nodeModules: ['aws-xray-sdk-core'],
        environment: { npm_config_trust_policy: 'lenient' },
        banner:
          "import { createRequire } from 'module'; const require = createRequire(import.meta.url);",
      },
    });
  }
}
