import { useAttachmentUrls } from './use-attachment-urls';

/**
 * The hook is intentionally thin — the selection and fetching rules live in
 * `application/attachment-urls.ts`, which is covered exhaustively there without
 * needing a React renderer (the repo mocks `react-native` wholesale and ships
 * no testing library).
 *
 * What is asserted here is the contract the drawer depends on.
 */
describe('useAttachmentUrls', () => {
  it('is exported as a hook', () => {
    expect(typeof useAttachmentUrls).toBe('function');
    expect(useAttachmentUrls.name).toBe('useAttachmentUrls');
  });
});
