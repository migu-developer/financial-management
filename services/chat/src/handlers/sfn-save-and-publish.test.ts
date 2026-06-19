// The handler module validates required env vars at import time, so set them
// before importing anything from it.
process.env['APPSYNC_HTTP_DNS'] = 'api.example.com';
process.env['AWS_REGION'] = 'us-east-1';
process.env['APPSYNC_CHAT_NAMESPACE'] = 'chat';

import {
  BRANCH_METRIC_BY_KIND,
  type SaveAndPublishEventKind,
} from './sfn-save-and-publish';

describe('BRANCH_METRIC_BY_KIND', () => {
  it('maps every non-error workflow branch to its dedicated metric', () => {
    const expected: Record<
      Exclude<SaveAndPublishEventKind, 'error'>,
      string
    > = {
      query: 'ChatQueryAnswerSent',
      created: 'ChatExpenseConfirmationSent',
      cancelled: 'ChatExpenseCancelled',
      clarification: 'ChatClarificationSent',
      unknown: 'ChatUnknownIntent',
    };
    expect(BRANCH_METRIC_BY_KIND).toEqual(expected);
  });

  it('does not define a per-branch metric for the error branch', () => {
    // 'error' is handled separately (ChatWorkflowError), never via this map.
    expect(
      (BRANCH_METRIC_BY_KIND as Record<string, string>)['error'],
    ).toBeUndefined();
  });
});
