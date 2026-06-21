#!/usr/bin/env bash
#
# Exhaustively test the ChatProcess state machine's branches, retries and
# catches against AWS Step Functions Local — WITHOUT deploying to AWS.
#
# Pipeline:
#   1. cdk synth the SFN stack → cdk.out/<stack>.template.json
#   2. extract-asl.mjs resolves the CloudFormation DefinitionString (with its
#      Fn::Join / GetAtt / Ref intrinsics) into a flat ASL JSON document.
#   3. Boot the amazon/aws-stepfunctions-local container with our MockConfigFile
#      (mock-config.json) mounted and SFN_MOCK_CONFIG pointing at it.
#   4. create-state-machine using the resolved ASL.
#   5. For each test case: start-execution against the "#<TestCaseName>"
#      qualified ARN, poll describe-execution, and assert the final status.
#
# Exits non-zero on the first mismatch (or any setup failure).
#
# Requirements: Docker, AWS CLI v2, node >= 18, pnpm. The container image is
# amazon/aws-stepfunctions-local (pull it before running offline).

set -euo pipefail

# ── Config ─────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INFRA_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
SFN_LOCAL_DIR="${INFRA_DIR}/test/sfn-local"

# Local-only AWS env — Step Functions Local ignores credentials, but BOTH the
# AWS CLI and `cdk synth`/`cdk list` refuse to run without them. The REGION in
# particular MUST be exported BEFORE the `cdk list` below: the Cognito UserPool
# derives its SES/SNS region from `AWS_REGION`, and CDK throws "Your stack region
# cannot be determined" during synth when it is empty. CI sets none of these, so
# without this the script would die silently on the `cdk list` call.
export AWS_REGION="${AWS_REGION:-us-east-1}"
export AWS_DEFAULT_REGION="${AWS_DEFAULT_REGION:-us-east-1}"
export CDK_DEFAULT_REGION="${CDK_DEFAULT_REGION:-us-east-1}"
export AWS_ACCESS_KEY_ID="${AWS_ACCESS_KEY_ID:-localtest}"
export AWS_SECRET_ACCESS_KEY="${AWS_SECRET_ACCESS_KEY:-localtest}"
# `cdk list`/`cdk synth` builds the WHOLE app (every version), so unrelated
# stacks must also construct. The Cognito UserPoolDomain requires a non-empty
# domain prefix at synth — supply a dummy (this is synth-only; nothing is
# deployed). Any other stack's empty env values are tolerated at synth.
export COGNITO_DOMAIN_PREFIX="${COGNITO_DOMAIN_PREFIX:-fmsfnlocaltest}"

# Resolve the synthesized stack name dynamically — it carries the stage suffix
# (e.g. FinancialManagementDev-v2-StepFunctionsChatStack), so never hardcode it.
# Capture stdout+stderr so a synth failure surfaces with its real error instead
# of dying silently (set -e + a suppressed pipe used to hide the cause).
CDK_LIST_OUT="$(cd "${INFRA_DIR}" && pnpm exec cdk list 2>&1)" || {
  printf '\033[1;31mX `cdk list` failed:\033[0m\n%s\n' "${CDK_LIST_OUT}" >&2
  exit 1
}
STACK="$(printf '%s\n' "${CDK_LIST_OUT}" | awk '/StepFunctionsChatStack/{print $1; exit}')"
if [[ -z "${STACK:-}" ]]; then
  printf '\033[1;31mX Could not resolve the StepFunctionsChat stack via cdk list\033[0m\n%s\n' "${CDK_LIST_OUT}" >&2
  exit 1
fi
ASL_FILE="${SFN_LOCAL_DIR}/chat-process.asl.json"
MOCK_CONFIG="${SFN_LOCAL_DIR}/mock-config.json"

ENDPOINT="http://localhost:8083"
CONTAINER_NAME="sfn-local-chat-test"
# The state-machine name here MUST match the key under "StateMachines" in
# mock-config.json ("ChatProcessTest"), so the mocked responses are applied.
SM_NAME="ChatProcessTest"
SM_ARN="arn:aws:states:us-east-1:123456789012:stateMachine:${SM_NAME}"
ROLE_ARN="arn:aws:iam::123456789012:role/DummyRole"

# Test case → expected execution status. Every case here MUST exist as a
# TestCase key in mock-config.json.
#   queryHappyPath                       → SUCCEEDED (QUERY branch)
#   createCompleteConfirmed              → SUCCEEDED (CREATE → confirmed)
#   createCompleteCancelled              → SUCCEEDED (CREATE → cancelled)
#   createCompleteSuperseded             → SUCCEEDED (PreviewSuperseded)
#   createCompleteExpired                → SUCCEEDED (PreviewExpired, Timeout caught)
#   createIncompleteClarification        → SUCCEEDED (clarification branch)
#   unknownIntent                        → SUCCEEDED (UNKNOWN branch)
#   executeQueryFailsRoutesToPublishError→ FAILED (catch-all → PublishError → WorkflowFailed)
#   bedrockThrottleRecovers              → SUCCEEDED (Retry recovers from throttle)
declare -a CASES=(
  "queryHappyPath:SUCCEEDED"
  "createCompleteConfirmed:SUCCEEDED"
  "createCompleteCancelled:SUCCEEDED"
  "createCompleteSuperseded:SUCCEEDED"
  "createCompleteExpired:SUCCEEDED"
  "createIncompleteClarification:SUCCEEDED"
  "unknownIntent:SUCCEEDED"
  "executeQueryFailsRoutesToPublishError:FAILED"
  "bedrockThrottleRecovers:SUCCEEDED"
)

# A representative execution input. The mock config matches on STATE NAME, not
# on input, so these values only need to satisfy the ASL's JsonPath references
# ($.userId, $.sessionId, $.messageId, $.userEmail, $.content, $.history).
EXECUTION_INPUT='{
  "userId": "user-123",
  "sessionId": "session-123",
  "messageId": "message-123",
  "userEmail": "test@example.com",
  "content": "¿cuánto gasté en comida este mes?",
  "history": "[]"
}'

# ── Helpers ────────────────────────────────────────────────
log() { printf '\n\033[1;34m▶ %s\033[0m\n' "$*"; }
ok() { printf '\033[1;32m✔ %s\033[0m\n' "$*"; }
fail() { printf '\033[1;31mX %s\033[0m\n' "$*" >&2; }

cleanup() {
  log "Tearing down container ${CONTAINER_NAME}"
  docker rm -f "${CONTAINER_NAME}" >/dev/null 2>&1 || true
}
trap cleanup EXIT

# ── 1. Synthesize the ASL ──────────────────────────────────
log "Synthesizing ${STACK} with cdk synth"
(
  cd "${INFRA_DIR}"
  pnpm exec cdk synth "${STACK}" --output cdk.out >/dev/null
)

TEMPLATE="${INFRA_DIR}/cdk.out/${STACK}.template.json"
if [[ ! -f "${TEMPLATE}" ]]; then
  fail "Synth did not produce ${TEMPLATE}"
  exit 1
fi

log "Extracting resolved ASL → ${ASL_FILE}"
node "${SFN_LOCAL_DIR}/extract-asl.mjs" "${TEMPLATE}" "${ASL_FILE}"

# Completeness guard: fail fast if a Task state in the ASL isn't covered by any
# test case (so a newly added state can't slip through untested), or if a test
# case references a stale state / undefined mocked response.
log "Asserting mock coverage of all Task states"
node "${SFN_LOCAL_DIR}/assert-coverage.mjs" "${ASL_FILE}" "${MOCK_CONFIG}"

# ── 2. Boot Step Functions Local with the mock config ──────
log "Starting amazon/aws-stepfunctions-local with mock config"
docker rm -f "${CONTAINER_NAME}" >/dev/null 2>&1 || true
docker run -d --name "${CONTAINER_NAME}" \
  -p 8083:8083 \
  -v "${MOCK_CONFIG}:/home/mock-config.json:ro" \
  -e SFN_MOCK_CONFIG="/home/mock-config.json" \
  amazon/aws-stepfunctions-local >/dev/null

# Wait for the container to accept requests.
log "Waiting for ${ENDPOINT} to become ready"
for i in $(seq 1 30); do
  if aws stepfunctions list-state-machines --endpoint-url "${ENDPOINT}" >/dev/null 2>&1; then
    ok "Step Functions Local is ready"
    break
  fi
  if [[ "${i}" -eq 30 ]]; then
    fail "Step Functions Local did not become ready in time"
    docker logs "${CONTAINER_NAME}" || true
    exit 1
  fi
  sleep 1
done

# ── 3. Create the state machine from the resolved ASL ──────
log "Creating state machine ${SM_NAME}"
aws stepfunctions create-state-machine \
  --endpoint-url "${ENDPOINT}" \
  --name "${SM_NAME}" \
  --role-arn "${ROLE_ARN}" \
  --definition "file://${ASL_FILE}" >/dev/null

# ── 4. Run each test case ──────────────────────────────────
FAILURES=0
for entry in "${CASES[@]}"; do
  CASE_NAME="${entry%%:*}"
  EXPECTED="${entry##*:}"

  log "Test case: ${CASE_NAME} (expect ${EXPECTED})"

  # Start the execution against the test-case-qualified ARN.
  EXEC_ARN="$(aws stepfunctions start-execution \
    --endpoint-url "${ENDPOINT}" \
    --state-machine-arn "${SM_ARN}#${CASE_NAME}" \
    --name "${CASE_NAME}-$(date +%s)" \
    --input "${EXECUTION_INPUT}" \
    --query 'executionArn' --output text)"

  # Poll for a terminal status.
  STATUS="RUNNING"
  for i in $(seq 1 30); do
    STATUS="$(aws stepfunctions describe-execution \
      --endpoint-url "${ENDPOINT}" \
      --execution-arn "${EXEC_ARN}" \
      --query 'status' --output text)"
    [[ "${STATUS}" != "RUNNING" ]] && break
    sleep 1
  done

  if [[ "${STATUS}" == "${EXPECTED}" ]]; then
    ok "${CASE_NAME}: ${STATUS}"
  else
    fail "${CASE_NAME}: expected ${EXPECTED}, got ${STATUS}"
    aws stepfunctions get-execution-history \
      --endpoint-url "${ENDPOINT}" \
      --execution-arn "${EXEC_ARN}" \
      --query 'events[?contains(type, `Failed`) || contains(type, `Succeeded`)]' \
      --output json || true
    FAILURES=$((FAILURES + 1))
  fi
done

# ── 5. Report ──────────────────────────────────────────────
echo
if [[ "${FAILURES}" -gt 0 ]]; then
  fail "${FAILURES} test case(s) failed"
  exit 1
fi
ok "All ${#CASES[@]} test cases passed"
