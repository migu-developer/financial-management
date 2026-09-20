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
    cache.write(
      { [KEY_A]: toSignedUrl('https://signed/a', 3600, NOW) },
      cache.generation(),
    );

    expect(cache.read([KEY_A], NOW)).toEqual({
      [KEY_A]: toSignedUrl('https://signed/a', 3600, NOW),
    });
  });

  it('hides an expired entry instead of returning it', () => {
    // The whole point: an expired url must look exactly like a cache miss, so
    // it can never reach an <Image> and render as a blank square.
    const cache = createAttachmentUrlCache();
    cache.write(
      {
        [KEY_A]: toSignedUrl(
          'https://signed/a',
          3600,
          NOW - 2 * 60 * 60 * 1000,
        ),
      },
      cache.generation(),
    );

    expect(cache.read([KEY_A], NOW)).toEqual({});
  });

  it('returns nothing for keys it has never seen', () => {
    const cache = createAttachmentUrlCache();
    expect(cache.read([KEY_A, KEY_B], NOW)).toEqual({});
  });

  it('survives across readers, which is what makes reopening a chat free', () => {
    const cache = createAttachmentUrlCache();
    cache.write(
      { [KEY_A]: toSignedUrl('https://signed/a', 3600, NOW) },
      cache.generation(),
    );

    // Two separate reads stand in for two mounts of the drawer.
    expect(cache.read([KEY_A], NOW)).not.toEqual({});
    expect(cache.read([KEY_A], NOW)).not.toEqual({});
  });

  it('drops an invalidated entry and allows one retry', () => {
    const cache = createAttachmentUrlCache();
    cache.write(
      { [KEY_A]: toSignedUrl('https://signed/a', 3600, NOW) },
      cache.generation(),
    );

    expect(cache.invalidate(KEY_A)).toBe(true);
    expect(cache.read([KEY_A], NOW)).toEqual({});
  });

  it('refuses to retry once the budget is spent', () => {
    // A 403 (stale signature) and a 404 (object gone) are indistinguishable
    // from inside an <Image>. Without a budget the second turns into a loop.
    const cache = createAttachmentUrlCache();
    cache.write(
      { [KEY_A]: toSignedUrl('https://signed/a', 3600, NOW) },
      cache.generation(),
    );

    for (let i = 0; i < MAX_REFRESH_RETRIES; i += 1) {
      expect(cache.invalidate(KEY_A)).toBe(true);
    }
    expect(cache.invalidate(KEY_A)).toBe(false);
  });

  it('does NOT restore the retry budget when a re-mint succeeds', () => {
    // Presigning proves nothing about the object: the server validates the key
    // and calls getSignedUrl, which signs a DELETED object just as happily. So
    // 404 -> invalidate -> successful re-mint -> 404 would reset the budget on
    // every lap and loop forever. Only a new sign-in gives the budget back.
    const cache = createAttachmentUrlCache();
    cache.write(
      { [KEY_A]: toSignedUrl('https://signed/a', 3600, NOW) },
      cache.generation(),
    );

    expect(cache.invalidate(KEY_A)).toBe(true);
    cache.write(
      { [KEY_A]: toSignedUrl('https://signed/a2', 3600, NOW) },
      cache.generation(),
    );

    expect(cache.invalidate(KEY_A)).toBe(false);
  });

  it('gives the budget back on clear, so a new sign-in starts fresh', () => {
    const cache = createAttachmentUrlCache();
    cache.invalidate(KEY_A);
    expect(cache.invalidate(KEY_A)).toBe(false);

    cache.clear();

    expect(cache.invalidate(KEY_A)).toBe(true);
  });

  describe('generation guard', () => {
    it('stores a write whose generation still matches', () => {
      const cache = createAttachmentUrlCache();
      const gen = cache.generation();

      expect(
        cache.write(
          { [KEY_A]: toSignedUrl('https://signed/a', 3600, NOW) },
          gen,
        ),
      ).toBe(true);
      expect(cache.read([KEY_A], NOW)).not.toEqual({});
    });

    it('drops a write from a request that started before sign-out', () => {
      // The security hole this closes: a request in flight when the user signs
      // out resolves afterwards and puts the previous account's bearer URL back
      // into a cache the next account on the device reads from.
      const cache = createAttachmentUrlCache();
      const gen = cache.generation();

      cache.clear();

      expect(
        cache.write(
          { [KEY_A]: toSignedUrl('https://signed/a', 3600, NOW) },
          gen,
        ),
      ).toBe(false);
      expect(cache.read([KEY_A], NOW)).toEqual({});
    });

    it('advances the generation on every clear', () => {
      const cache = createAttachmentUrlCache();
      const first = cache.generation();
      cache.clear();
      const second = cache.generation();
      cache.clear();

      expect(second).not.toBe(first);
      expect(cache.generation()).not.toBe(second);
    });
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
    cache.write(
      { [KEY_A]: toSignedUrl('https://signed/a', 3600, NOW) },
      cache.generation(),
    );
    cache.invalidate(KEY_A);

    cache.clear();

    expect(cache.read([KEY_A], NOW)).toEqual({});
    expect(cache.invalidate(KEY_A)).toBe(true);
  });
});
