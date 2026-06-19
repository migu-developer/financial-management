/* eslint-disable no-console */
// Completeness guard for the Step Functions Local mock suite.
//
// Every `Task` state in the ChatProcess ASL performs a service integration
// (Bedrock / Lambda) that MUST be mocked, so it has to be referenced by at
// least one TestCase in mock-config.json. This script fails (exit 1) when a
// Task state is not covered by any test case — so adding a new state to the
// state machine WITHOUT adding a matching mock/test case breaks CI instead of
// silently going untested. Choice / Succeed / Fail / Pass states need no mock
// and are ignored.
//
// Usage: node assert-coverage.mjs <chat-process.asl.json> <mock-config.json>

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const [, , aslArg, mockArg] = process.argv;
if (!aslArg || !mockArg) {
  console.error(
    'Usage: node assert-coverage.mjs <asl.json> <mock-config.json>',
  );
  process.exit(2);
}

const asl = JSON.parse(readFileSync(resolve(process.cwd(), aslArg), 'utf8'));
const mock = JSON.parse(readFileSync(resolve(process.cwd(), mockArg), 'utf8'));

// Task states in the ASL — the ones that need a mocked response.
const taskStates = Object.entries(asl.States ?? {})
  .filter(([, s]) => s?.Type === 'Task')
  .map(([name]) => name);

// Every state name referenced across all TestCases of every state machine.
const referenced = new Set();
const testCasesBySm = {};
for (const [smName, sm] of Object.entries(mock.StateMachines ?? {})) {
  testCasesBySm[smName] = Object.keys(sm.TestCases ?? {});
  for (const tc of Object.values(sm.TestCases ?? {})) {
    for (const stateName of Object.keys(tc)) referenced.add(stateName);
  }
}

// Every mocked-response name referenced by a test case must exist.
const mockedResponses = new Set(Object.keys(mock.MockedResponses ?? {}));
const danglingResponses = [];
for (const sm of Object.values(mock.StateMachines ?? {})) {
  for (const [tcName, tc] of Object.entries(sm.TestCases ?? {})) {
    for (const [stateName, respName] of Object.entries(tc)) {
      if (!mockedResponses.has(respName)) {
        danglingResponses.push(`${tcName}.${stateName} → "${respName}"`);
      }
    }
  }
}

const uncovered = taskStates.filter((name) => !referenced.has(name));
const stale = [...referenced].filter((name) => !(name in (asl.States ?? {})));

let failed = false;

if (uncovered.length > 0) {
  failed = true;
  console.error(
    `\n✘ ${uncovered.length} Task state(s) have NO mock in any TestCase — add a ` +
      `TestCase covering each in mock-config.json:\n  - ${uncovered.join('\n  - ')}`,
  );
}
if (stale.length > 0) {
  failed = true;
  console.error(
    `\n✘ ${stale.length} TestCase reference(s) point to a state that no longer ` +
      `exists in the ASL — remove or rename them:\n  - ${stale.join('\n  - ')}`,
  );
}
if (danglingResponses.length > 0) {
  failed = true;
  console.error(
    `\n✘ ${danglingResponses.length} TestCase mapping(s) reference an undefined ` +
      `MockedResponse:\n  - ${danglingResponses.join('\n  - ')}`,
  );
}

if (failed) process.exit(1);

console.log(
  `✔ Mock coverage complete: all ${taskStates.length} Task states are exercised ` +
    `by ${Object.values(testCasesBySm).flat().length} test case(s).`,
);
