import {
  ATTACHMENT_READY_TIMEOUT_MS,
  useChatAttachment,
} from './use-chat-attachment';

/**
 * The hook is intentionally thin — every transition it performs lives in
 * `application/chat-attachment.ts`, which is covered exhaustively there
 * without needing a React renderer (the repo mocks `react-native` wholesale
 * and ships no testing library).
 *
 * What is asserted here is the contract the drawer depends on.
 */
describe('useChatAttachment', () => {
  it('is exported as a hook', () => {
    expect(typeof useChatAttachment).toBe('function');
    expect(useChatAttachment.name).toBe('useChatAttachment');
  });

  it('waits a full minute before giving up on the server', () => {
    // Normalization is seconds at worst; a minute means a lost event. Without
    // any bound the Send button would stay disabled forever with no
    // explanation, which is the failure mode this constant exists to prevent.
    expect(ATTACHMENT_READY_TIMEOUT_MS).toBe(60_000);
  });
});
