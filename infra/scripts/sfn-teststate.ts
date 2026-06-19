/* eslint-disable no-console */
/**
 * D4 — TestState API harness for the ChatProcess state machine.
 *
 * Uses the Step Functions `TestState` API to exercise INDIVIDUAL states in
 * isolation against a real (DEV-only) account, without starting a full
 * execution. This complements the Step Functions Local mock suite
 * (scripts/sfn-local-test.sh): Local validates whole-execution branching with
 * mocked task results; TestState validates that a single state — most usefully
 * the `Intent?` Choice — routes to the next state we expect given a concrete
 * input, using the live state-machine role and (optionally) live task invokes.
 *
 * SAFETY: This runs against DEV ONLY. TestState can really invoke the task
 * resources referenced by a state, so never point it at prod. The script
 * refuses to run unless SFN_TESTSTATE_STAGE is explicitly "dev".
 *
 * IAM: the role passed as --role-arn (or SFN_TESTSTATE_ROLE_ARN) needs
 *   - states:TestState
 *   - the task-invoke permissions the tested state would use (for Choice
 *     states there is no task to invoke, so states:TestState is enough; for
 *     Task states it also needs the matching lambda:InvokeModel /
 *     bedrock:InvokeModel grant). See test/sfn-local/README.md.
 *
 * Run:  pnpm --filter @infra test:sfn-teststate
 *   env SFN_TESTSTATE_STAGE=dev
 *       SFN_TESTSTATE_ROLE_ARN=arn:aws:iam::<dev-acct>:role/<teststate-role>
 *       AWS_REGION=us-east-1
 */

import {
  SFNClient,
  TestStateCommand,
  type TestStateCommandOutput,
} from '@aws-sdk/client-sfn';

const STAGE = process.env['SFN_TESTSTATE_STAGE'];
const ROLE_ARN = process.env['SFN_TESTSTATE_ROLE_ARN'];
const REGION = process.env['AWS_REGION'] ?? 'us-east-1';

if (STAGE !== 'dev') {
  console.error(
    `Refusing to run: SFN_TESTSTATE_STAGE must be "dev" (got "${STAGE ?? ''}"). ` +
      'TestState may invoke live task resources — never run it against prod.',
  );
  process.exit(2);
}
if (!ROLE_ARN) {
  console.error('Missing SFN_TESTSTATE_ROLE_ARN (the narrow TestState role).');
  process.exit(2);
}

const client = new SFNClient({ region: REGION });

// ── State definitions under test ───────────────────────────
// We inline the minimal ASL for the states we test. TestState accepts a single
// state's definition, so we mirror the relevant fragment of the deployed ASL.
// Keep these in sync with step-functions-chat-stack.ts if the routing changes.

// `Intent?` Choice: QUERY* → queryBranch, CREATE* → createBranch, else UNKNOWN.
// TestState reports the matched next-state name in the output `nextState`.
const INTENT_CHOICE_DEFINITION = JSON.stringify({
  Type: 'Choice',
  Choices: [
    {
      Variable: '$.intentResult.intent',
      StringMatches: 'QUERY*',
      Next: 'ExtractSqlParams',
    },
    {
      Variable: '$.intentResult.intent',
      StringMatches: 'CREATE*',
      Next: 'ExtractExpenseFields',
    },
  ],
  Default: 'GenerateUnknown',
});

// `Confirmed?` Choice: superseded → PreviewSuperseded, confirmed → CreateExpense,
// else → GenerateCancellation. Verifies the catch/branch routing on user reply.
const CONFIRMED_CHOICE_DEFINITION = JSON.stringify({
  Type: 'Choice',
  Choices: [
    {
      And: [
        { Variable: '$.confirmation.superseded', IsPresent: true },
        { Variable: '$.confirmation.superseded', BooleanEquals: true },
      ],
      Next: 'PreviewSuperseded',
    },
    {
      Variable: '$.confirmation.confirmed',
      BooleanEquals: true,
      Next: 'CreateExpense',
    },
  ],
  Default: 'GenerateCancellation',
});

interface Assertion {
  readonly label: string;
  readonly definition: string;
  readonly input: unknown;
  readonly expectedNextState: string;
}

const ASSERTIONS: readonly Assertion[] = [
  {
    label: 'Intent? QUERY → ExtractSqlParams',
    definition: INTENT_CHOICE_DEFINITION,
    input: { intentResult: { intent: 'QUERY' } },
    expectedNextState: 'ExtractSqlParams',
  },
  {
    label: 'Intent? "QUERY.\\n" (trailing noise) → ExtractSqlParams',
    definition: INTENT_CHOICE_DEFINITION,
    input: { intentResult: { intent: 'QUERY.\n' } },
    expectedNextState: 'ExtractSqlParams',
  },
  {
    label: 'Intent? CREATE → ExtractExpenseFields',
    definition: INTENT_CHOICE_DEFINITION,
    input: { intentResult: { intent: 'CREATE' } },
    expectedNextState: 'ExtractExpenseFields',
  },
  {
    label: 'Intent? gibberish → GenerateUnknown (default)',
    definition: INTENT_CHOICE_DEFINITION,
    input: { intentResult: { intent: 'asldkfj' } },
    expectedNextState: 'GenerateUnknown',
  },
  {
    label: 'Confirmed? superseded → PreviewSuperseded',
    definition: CONFIRMED_CHOICE_DEFINITION,
    input: { confirmation: { confirmed: false, superseded: true } },
    expectedNextState: 'PreviewSuperseded',
  },
  {
    label: 'Confirmed? confirmed → CreateExpense',
    definition: CONFIRMED_CHOICE_DEFINITION,
    input: { confirmation: { confirmed: true } },
    expectedNextState: 'CreateExpense',
  },
  {
    label: 'Confirmed? declined → GenerateCancellation (default)',
    definition: CONFIRMED_CHOICE_DEFINITION,
    input: { confirmation: { confirmed: false } },
    expectedNextState: 'GenerateCancellation',
  },
];

async function runAssertion(a: Assertion): Promise<boolean> {
  let result: TestStateCommandOutput;
  try {
    result = await client.send(
      new TestStateCommand({
        definition: a.definition,
        roleArn: ROLE_ARN,
        input: JSON.stringify(a.input),
      }),
    );
  } catch (err) {
    console.error(`✘ ${a.label} — TestState call failed:`, err);
    return false;
  }

  const next = result.nextState;
  if (next === a.expectedNextState) {
    console.log(`✔ ${a.label} → ${next}`);
    return true;
  }
  console.error(
    `✘ ${a.label} — expected nextState "${a.expectedNextState}", got "${next ?? '<none>'}" (status: ${result.status ?? '?'})`,
  );
  return false;
}

async function main(): Promise<void> {
  console.log(
    `Running ${ASSERTIONS.length} TestState assertions in ${REGION} (stage=dev)\n`,
  );
  let failures = 0;
  for (const a of ASSERTIONS) {
    const ok = await runAssertion(a);
    if (!ok) failures += 1;
  }
  console.log('');
  if (failures > 0) {
    console.error(`${failures} assertion(s) failed`);
    process.exit(1);
  }
  console.log(`All ${ASSERTIONS.length} assertions passed`);
}

void main();
