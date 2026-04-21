---
name: fm-deploy-prod
description: |
  Deploy the financial-management infrastructure to production.
  Includes the TWO-PHASE deploy required when Lambda functionName changes.
  TRIGGER when: deploying to production, changing Lambda function names, or running prod CDK deploy.
metadata:
  version: '1.0'
  scope: [infra]
  auto_invoke: 'Deploying to production'
allowed-tools: [Read, Edit, Write, Glob, Grep, Bash]
---

# fm-deploy-prod -- Production Deployment

## Version

1.0

## Regular Deploy (No functionName Change)

When Lambda `functionName` values have NOT changed, deploy is straightforward:

```bash
source config/.env.production
pnpm infra:cdk synth
pnpm infra:cdk deploy --all --require-approval broadening
```

Always use `--require-approval broadening` in production to review IAM/security changes.

## TWO-PHASE Deploy (functionName Change)

When a Lambda `functionName` changes (e.g. renaming `fm-prod-expenses` to a new name),
CloudFormation cannot update in-place because the monitoring stack references the old
exported function name. Use this two-phase process:

### Phase 1: Break the dependency cycle

1. In `infra/lib/versions/v3/monitoring-stack.ts`, temporarily hardcode the Lambda
   function names instead of importing via `importFromVersion`:

   ```typescript
   const lambdaFunctions: Record<string, string> = {
     Expenses: 'fm-prod-expenses', // hardcoded old name
     Documents: 'fm-prod-documents',
     Currencies: 'fm-prod-currencies',
     Users: 'fm-prod-users',
   };
   ```

2. In the affected Lambda stack(s), temporarily remove API Gateway route definitions
   (the `addMethod` calls) so CloudFormation can delete and recreate the function.

3. In `infra/lib/versions/v2/api-gateway-stack.ts`, add a mock integration for the
   removed routes to keep the API operational during transition.

4. Deploy in order:
   ```bash
   source config/.env.production
   pnpm infra:cdk deploy fm-v3-MonitoringStack --require-approval broadening
   pnpm infra:cdk deploy fm-v2-LambdaExpensesStack fm-v2-LambdaDocumentsStack \
     fm-v2-LambdaCurrenciesStack fm-v2-LambdaUsersStack --require-approval broadening
   pnpm infra:cdk deploy fm-v1-AuthStack --require-approval broadening
   ```

### Phase 2: Restore full configuration

1. Restore `importFromVersion` calls in monitoring-stack.ts
2. Restore route definitions in Lambda stacks
3. Remove mock integrations from API Gateway
4. Restore all import dependencies

5. Deploy everything:
   ```bash
   pnpm infra:cdk deploy --all --require-approval broadening
   ```

## Post-Deploy Verification

```bash
# Check all stacks are healthy
aws cloudformation list-stacks \
  --stack-status-filter CREATE_COMPLETE UPDATE_COMPLETE \
  --query "StackSummaries[?contains(StackName,'fm-')].{Name:StackName,Status:StackStatus}" \
  --output table

# Verify API Gateway endpoint responds
curl -s -o /dev/null -w "%{http_code}" https://<api-domain>/prod/expenses

# Check CloudWatch alarms are OK
aws cloudwatch describe-alarms \
  --alarm-name-prefix "fm-v3-Monitoring" \
  --query "MetricAlarms[].{Name:AlarmName,State:StateValue}" \
  --output table
```

## Critical Patterns

- Always use `--require-approval broadening` in production
- Verify all alarms return to OK state after deploy
- The monitoring stack (v3) depends on v2 Lambda and v1 Auth exports via `importFromVersion`
- Stack order in v2: ApiGateway -> Lambdas -> ApiDocs -> AmplifyHosting

## Must NOT Do

- Deploy with `--require-approval never` in production
- Change functionName without the two-phase process
- Skip post-deploy alarm verification
- Deploy monitoring stack before Lambda stacks are updated (in phase 2)
