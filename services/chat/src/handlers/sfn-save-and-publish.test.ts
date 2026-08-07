// The handler module validates required env vars at import time, so set them
// before importing anything from it.
process.env['APPSYNC_HTTP_DNS'] = 'api.example.com';
process.env['AWS_REGION'] = 'us-east-1';
process.env['APPSYNC_CHAT_NAMESPACE'] = 'chat';

import {
  BRANCH_METRIC_BY_KIND,
  HIDDEN_FROM_CONTEXT_KINDS,
  isHiddenFromContext,
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

describe('isHiddenFromContext', () => {
  it('hides the branches that carry no expense information', () => {
    expect(isHiddenFromContext('error')).toBe(true);
    expect(isHiddenFromContext('unknown')).toBe(true);
  });

  it('KEEPS the clarification — it is the question the next message answers', () => {
    // Hiding it would break the multi-turn flow: the user replies "COP" to a
    // question the model would then no longer see.
    expect(isHiddenFromContext('clarification')).toBe(false);
  });

  it('keeps every other branch', () => {
    expect(isHiddenFromContext('query')).toBe(false);
    expect(isHiddenFromContext('created')).toBe(false);
    // A cancellation is a real decision worth remembering.
    expect(isHiddenFromContext('cancelled')).toBe(false);
  });

  it('keeps a reply with no branch (a plain assistant message)', () => {
    expect(isHiddenFromContext(undefined)).toBe(false);
  });

  it('covers exactly the two noise branches', () => {
    // A new branch must be considered explicitly rather than inherited.
    expect([...HIDDEN_FROM_CONTEXT_KINDS].sort()).toEqual(['error', 'unknown']);
  });
});
