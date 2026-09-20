import {
  MAX_REFRESH_RETRIES,
  createAttachmentUrlCache,
} from './attachment-url-cache';
import { toSignedUrl } from './attachment-urls';

const KEY_A = 'chat-ready/u1/a.jpg';
const KEY_B = 'chat-ready/u1/b.jpg';

const NOW = 1_700_000_000_000;

describe('attachmentUrlCache', () => {
  it('returns an entry that is still inside its lifetime', () => {
    const cache = createAttachmentUrlCache();
    cache.write({
      [KEY_A]: toSignedUrl('https://signed/a', 3600, NOW),
    });

    expect(cache.read([KEY_A], NOW)).toEqual({
      [KEY_A]: toSignedUrl('https://signed/a', 3600, NOW),
    });
  });

  it('hides an expired entry instead of returning it', () => {
    // The whole point: an expired url must look exactly like a cache miss, so
    // it can never reach an <Image> and render as a blank square.
    const cache = createAttachmentUrlCache();
    cache.write({
      [KEY_A]: toSignedUrl('https://signed/a', 3600, NOW - 2 * 60 * 60 * 1000),
    });

    expect(cache.read([KEY_A], NOW)).toEqual({});
  });

  it('returns nothing for keys it has never seen', () => {
    const cache = createAttachmentUrlCache();
    expect(cache.read([KEY_A, KEY_B], NOW)).toEqual({});
  });

  it('survives across readers, which is what makes reopening a chat free', () => {
    const cache = createAttachmentUrlCache();
    cache.write({
      [KEY_A]: toSignedUrl('https://signed/a', 3600, NOW),
    });

    // Two separate reads stand in for two mounts of the drawer.
    expect(cache.read([KEY_A], NOW)).not.toEqual({});
    expect(cache.read([KEY_A], NOW)).not.toEqual({});
  });

  it('drops an invalidated entry and allows one retry', () => {
    const cache = createAttachmentUrlCache();
    cache.write({
      [KEY_A]: toSignedUrl('https://signed/a', 3600, NOW),
    });

    expect(cache.invalidate(KEY_A)).toBe(true);
    expect(cache.read([KEY_A], NOW)).toEqual({});
  });

  it('refuses to retry once the budget is spent', () => {
    // A 403 (stale signature) and a 404 (object gone) are indistinguishable
    // from inside an <Image>. Without a budget the second turns into a loop.
    const cache = createAttachmentUrlCache();
    cache.write({
      [KEY_A]: toSignedUrl('https://signed/a', 3600, NOW),
    });

    for (let i = 0; i < MAX_REFRESH_RETRIES; i += 1) {
      expect(cache.invalidate(KEY_A)).toBe(true);
    }
    expect(cache.invalidate(KEY_A)).toBe(false);
  });

  it('restores the retry budget after a successful mint', () => {
    // Otherwise a key that broke once at 9am could never recover at 5pm.
    const cache = createAttachmentUrlCache();
    cache.write({
      [KEY_A]: toSignedUrl('https://signed/a', 3600, NOW),
    });
    cache.invalidate(KEY_A);

    cache.write({
      [KEY_A]: toSignedUrl('https://signed/a2', 3600, NOW),
    });

    expect(cache.invalidate(KEY_A)).toBe(true);
  });

  it('keeps each key its own budget', () => {
    const cache = createAttachmentUrlCache();
    cache.invalidate(KEY_A);

    expect(cache.invalidate(KEY_A)).toBe(false);
    expect(cache.invalidate(KEY_B)).toBe(true);
  });

  it('forgets everything on clear', () => {
    // Signed urls are bearer credentials; none may outlive a sign-out.
    const cache = createAttachmentUrlCache();
    cache.write({
      [KEY_A]: toSignedUrl('https://signed/a', 3600, NOW),
    });
    cache.invalidate(KEY_A);

    cache.clear();

    expect(cache.read([KEY_A], NOW)).toEqual({});
    expect(cache.invalidate(KEY_A)).toBe(true);
  });
});
