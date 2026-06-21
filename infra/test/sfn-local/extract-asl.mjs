/* eslint-disable no-console */
// Extract the resolved Amazon States Language (ASL) definition for the
// ChatProcess state machine from a synthesized CloudFormation template and
// write it to chat-process.asl.json so Step Functions Local can load it.
//
// The CDK emits the state machine `DefinitionString` as a CloudFormation
// `Fn::Join` over a list that mixes literal JSON fragments with intrinsics
// (`Fn::GetAtt` for the task Lambda ARNs, `Ref` for things like the partition
// or region). Step Functions Local cannot evaluate CloudFormation intrinsics,
// so we resolve every intrinsic to a deterministic PLACEHOLDER ARN. The mock
// config matches on STATE NAMES (not Resource ARNs), so the exact placeholder
// value is irrelevant to the test — it only has to be syntactically valid ARN
// shape that the local engine will accept.
//
// Usage:
//   node test/sfn-local/extract-asl.mjs <template.json> [out.asl.json]
//
// <template.json> is the synthesized template for the SFN stack, e.g.
//   cdk.out/FinancialManagement-v2-StepFunctionsChatStack.template.json

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ACCOUNT = '123456789012';
const REGION = 'us-east-1';
const PARTITION = 'aws';

const [, , templateArg, outArg] = process.argv;

if (!templateArg) {
  console.error('Usage: node extract-asl.mjs <template.json> [out.asl.json]');
  process.exit(2);
}

const templatePath = resolve(process.cwd(), templateArg);
const outPath = resolve(
  process.cwd(),
  outArg ?? 'test/sfn-local/chat-process.asl.json',
);

const template = JSON.parse(readFileSync(templatePath, 'utf8'));

const resources = template.Resources ?? {};

// Find the single AWS::StepFunctions::StateMachine resource.
const stateMachine = Object.values(resources).find(
  (r) => r?.Type === 'AWS::StepFunctions::StateMachine',
);

if (!stateMachine) {
  console.error(`No AWS::StepFunctions::StateMachine found in ${templatePath}`);
  process.exit(1);
}

const definition = stateMachine.Properties?.DefinitionString;

if (!definition) {
  console.error('State machine has no DefinitionString property.');
  process.exit(1);
}

// Resolve a CloudFormation intrinsic node to a placeholder string. The goal is
// a syntactically valid ASL document — never a real, deployable ARN.
function resolveIntrinsic(node) {
  if (typeof node === 'string') return node;
  if (typeof node !== 'object' || node === null) return String(node);

  if ('Fn::Join' in node) {
    const [separator, parts] = node['Fn::Join'];
    return parts.map(resolveIntrinsic).join(separator);
  }
  if ('Fn::GetAtt' in node) {
    // e.g. [ "ExecuteQueryFnABC123", "Arn" ] → a placeholder Lambda ARN keyed
    // by the logical id so distinct Lambdas stay distinguishable in the ASL.
    const [logicalId, attr] = node['Fn::GetAtt'];
    if (attr === 'Arn') {
      return `arn:${PARTITION}:lambda:${REGION}:${ACCOUNT}:function:${logicalId}`;
    }
    return `${logicalId}.${attr}`;
  }
  if ('Ref' in node) {
    const ref = node['Ref'];
    if (ref === 'AWS::Partition') return PARTITION;
    if (ref === 'AWS::Region') return REGION;
    if (ref === 'AWS::AccountId') return ACCOUNT;
    if (ref === 'AWS::URLSuffix') return 'amazonaws.com';
    // Any other Ref (a resource logical id) → a placeholder ARN-ish token.
    return `arn:${PARTITION}:placeholder:${REGION}:${ACCOUNT}:resource/${ref}`;
  }
  if ('Fn::Sub' in node) {
    const sub = node['Fn::Sub'];
    return Array.isArray(sub) ? sub[0] : sub;
  }

  console.error(
    `Unhandled intrinsic: ${JSON.stringify(node)} — extend resolveIntrinsic.`,
  );
  process.exit(1);
}

const resolved = resolveIntrinsic(definition);

// Validate it parses as JSON (the resolved ASL must be a JSON document).
let asl;
try {
  asl = JSON.parse(resolved);
} catch (err) {
  console.error('Resolved definition is not valid JSON:', err.message);
  console.error('First 500 chars:\n', resolved.slice(0, 500));
  process.exit(1);
}

// Step Functions Local cannot execute the Bedrock optimized integration
// (`arn:aws:states:::bedrock:invokeModel`) — StartExecution 500s even when the
// task is mocked. For LOCAL TESTING ONLY, rewrite every Bedrock task into a
// mockable `lambda:invoke` task: the MockConfigFile matches on STATE NAME and
// returns a Bedrock-shaped `Body`, so each task's ResultSelector still resolves
// and its Retry/Catch are preserved (mock can still Throw `Bedrock.*` errors).
// The deployed ASL is untouched — this rewrite lives only in the extracted copy.
let rewritten = 0;
for (const [name, state] of Object.entries(asl.States ?? {})) {
  if (
    typeof state?.Resource === 'string' &&
    state.Resource.includes('bedrock:invokeModel')
  ) {
    state.Resource = 'arn:aws:states:::lambda:invoke';
    state.Parameters = {
      FunctionName: `arn:${PARTITION}:lambda:${REGION}:${ACCOUNT}:function:${name}`,
      'Payload.$': '$',
    };
    rewritten += 1;
  }
}

writeFileSync(outPath, `${JSON.stringify(asl, null, 2)}\n`, 'utf8');
console.log(
  `Wrote resolved ASL (${asl.States ? Object.keys(asl.States).length : 0} states, ${rewritten} Bedrock tasks rewritten to lambda:invoke for local mocking) to ${outPath}`,
);
