---
name: fm-test-alarms
description: |
  Test CloudWatch alarms, SNS notifications, and Amplify build events.
  TRIGGER when: testing alarms, verifying notifications, or debugging monitoring.
metadata:
  version: '1.0'
  scope: [infra]
  auto_invoke: 'Testing CloudWatch alarms or notifications'
allowed-tools: [Read, Edit, Write, Glob, Grep, Bash]
---

# fm-test-alarms -- Test CloudWatch Alarms and Notifications

## Version

1.0

## Overview

The monitoring stack (v3) creates CloudWatch alarms for API Gateway, Lambda services,
and Cognito triggers. Alarms publish to an SNS topic that invokes a notification Lambda,
which sends formatted emails via SES. Amplify build events are captured via EventBridge.

## Alarm Types

- **API Gateway**: 5xx errors, 4xx spike, p99 latency > 5s
- **Lambda Services** (Expenses, Documents, Currencies, Users): errors, throttles
- **Cognito Triggers** (PreSignUp, CustomMessage, UserSync): errors

## Test via SNS Publish (Simulate CloudWatch Alarm)

Get the SNS topic ARN from stack outputs:

```bash
TOPIC_ARN=$(aws cloudformation describe-stacks \
  --stack-name fm-v3-Monitoring \
  --query "Stacks[0].Outputs[?contains(OutputKey,'AlertTopicArn')].OutputValue" \
  --output text)
```

Publish a simulated CloudWatch alarm message:

```bash
aws sns publish \
  --topic-arn "$TOPIC_ARN" \
  --subject "ALARM: Test-Alarm in ALARM state" \
  --message '{
    "AlarmName": "fm-v3-Monitoring-Lambda-Expenses-Errors",
    "AlarmDescription": "Lambda Expenses errors exceed threshold",
    "NewStateValue": "ALARM",
    "NewStateReason": "Threshold crossed: 5 datapoints were greater than 3.0",
    "StateChangeTime": "2025-01-15T10:30:00.000+0000",
    "Region": "US East (N. Virginia)",
    "OldStateValue": "OK",
    "Trigger": {
      "MetricName": "Errors",
      "Namespace": "AWS/Lambda",
      "Dimensions": [{"name": "FunctionName", "value": "fm-dev-expenses"}]
    }
  }'
```

## Test Amplify Build Event

Trigger an Amplify build manually:

```bash
APP_ID=$(aws cloudformation describe-stacks \
  --stack-name fm-v2-AmplifyHosting \
  --query "Stacks[0].Outputs[?contains(OutputKey,'AppId')].OutputValue" \
  --output text)

aws amplify start-job \
  --app-id "$APP_ID" \
  --branch-name main \
  --job-type RELEASE
```

EventBridge captures STARTED, FAILED, and SUCCEED status changes and forwards to SNS.

## Verify Lambda Logs

Check the notification Lambda for errors or recent invocations:

```bash
aws logs filter-log-events \
  --log-group-name "/aws/lambda/fm-dev-notifications" \
  --start-time $(date -v-1H +%s000) \
  --filter-pattern "ERROR" \
  --query "events[].message" --output text
```

## Check Alarm States

```bash
# All monitoring alarms
aws cloudwatch describe-alarms \
  --alarm-name-prefix "fm-v3-Monitoring" \
  --query "MetricAlarms[].{Name:AlarmName,State:StateValue,Updated:StateUpdatedTimestamp}" \
  --output table

# Only alarms in ALARM state
aws cloudwatch describe-alarms \
  --state-value ALARM \
  --alarm-name-prefix "fm-v3-Monitoring" \
  --query "MetricAlarms[].{Name:AlarmName,Reason:StateReason}" \
  --output table
```

## Verify Email Delivery

After triggering a test alarm, check the `ALERT_EMAIL_TO` inbox. The email should
contain alarm name, severity, service, timestamp, and dashboard link. If no email
arrives, check SES sandbox restrictions and `aws ses get-send-statistics`.

## Critical Patterns

- The notification Lambda needs SES permissions and a verified sender (`ALERT_EMAIL_FROM`)
- Alarm messages follow CloudWatch's JSON format; the Lambda parses and formats them
- The SNS topic allows EventBridge to publish via a resource policy

## Must NOT Do

- Test with real alarm thresholds in production without coordinating with the team
- Publish malformed JSON to the SNS topic (the Lambda expects CloudWatch alarm format)
- Forget to check SES sandbox restrictions when testing in a new region
