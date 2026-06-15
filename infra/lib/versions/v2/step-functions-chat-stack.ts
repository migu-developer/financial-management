import { BaseStack, BaseStackProps } from '@core/base-stack';
import {
  BEDROCK_MODELS,
  CLAUDE_HAIKU_FOUNDATION_MODEL_ID,
} from '@packages/prompts/bedrock/models';
import { CHAT_BEDROCK_PROMPTS } from '@packages/prompts/chat/catalog';
import { exportForCrossVersion, importFromVersion } from '@utils/cross-version';
import { Duration } from 'aws-cdk-lib';
import {
  FoundationModel,
  FoundationModelIdentifier,
} from 'aws-cdk-lib/aws-bedrock';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Runtime, Tracing } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction, OutputFormat } from 'aws-cdk-lib/aws-lambda-nodejs';
import { LogGroup, RetentionDays } from 'aws-cdk-lib/aws-logs';
import {
  Choice,
  Condition,
  DefinitionBody,
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
    const novaMicro = FoundationModel.fromFoundationModelId(
      this,
      'NovaMicroModel',
      new FoundationModelIdentifier(BEDROCK_MODELS.NOVA_MICRO),
    );
    const novaLite = FoundationModel.fromFoundationModelId(
      this,
      'NovaLiteModel',
      new FoundationModelIdentifier(BEDROCK_MODELS.NOVA_LITE),
    );
    // Anthropic Claude models require an *inference profile* (not the
    // foundation-model ARN that `FoundationModel.fromFoundationModelId`
    // produces). We build the inference-profile ARN by hand and grant
    // bedrock:InvokeModel on both the profile AND the underlying foundation
    // models the profile fans out to (us-east-1, us-east-2, us-west-2).
    const claudeHaiku = {
      modelArn: `arn:aws:bedrock:${this.region}:${this.account}:inference-profile/${BEDROCK_MODELS.CLAUDE_HAIKU}`,
    };

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
    });

    // Validate parses the raw JSON inside the Lambda (handles markdown fences).
    const validateFields = new LambdaInvoke(this, 'ValidateFields', {
      lambdaFunction: validateFieldsFn,
      payload: TaskInput.fromObject({
        'rawJson.$': '$.fieldsRaw.json',
      }),
      resultPath: '$.validation',
      payloadResponseOnly: true,
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
      .otherwise(
        generateUnknown.next(
          saveAndPublish('SaveUnknownReply', '$.finalText.text'),
        ),
      );

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
      logs: { destination: logGroup, level: LogLevel.ALL },
      // Backstop above the 7-day HITL task timeout so the catchable task-level
      // timeout governs (the execution-level timeout is not catchable).
      timeout: Duration.days(8),
    });

    // For the Claude Haiku cross-region inference profile, the state machine
    // also needs InvokeModel on the underlying foundation models in every
    // region the profile fans out to (us-east-1, us-east-2, us-west-2 for `us.`).
    this.stateMachine.role.addToPrincipalPolicy(
      new PolicyStatement({
        actions: ['bedrock:InvokeModel'],
        resources: [
          `arn:aws:bedrock:*::foundation-model/${CLAUDE_HAIKU_FOUNDATION_MODEL_ID}`,
        ],
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
