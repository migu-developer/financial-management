import {
  FALLBACK_TTL_SECONDS,
  URL_REFRESH_MARGIN_MS,
  isUsable,
  nextRefreshAt,
  pendingAttachmentKeys,
  resolveAttachmentUrls,
  toSignedUrl,
  toUrlMap,
} from './attachment-urls';

const KEY_A = 'chat-ready/u1/a.jpg';
const KEY_B = 'chat-ready/u1/b.jpg';

const NOW = 1_700_000_000_000;
const HOUR = 60 * 60 * 1000;

/** An entry comfortably inside its lifetime. */
const fresh = (url: string) => toSignedUrl(url, 3600, NOW);

describe('toSignedUrl', () => {
  it('records the true deadline and renews ahead of it by the margin', () => {
    expect(toSignedUrl('https://signed/a', 3600, NOW)).toEqual({
      url: 'https://signed/a',
      expiresAt: NOW + HOUR,
      refreshAt: NOW + HOUR - URL_REFRESH_MARGIN_MS,
    });
  });

  it.each([undefined, null, 0, -1, NaN, Infinity, '3600'])(
    'falls back to a short ttl for %p',
    (bad) => {
      // Over-estimating the lifetime shows the user a broken image; under-
      // estimating costs one request. The fallback must err short.
      expect(toSignedUrl('u', bad, NOW).expiresAt).toBe(
        NOW + FALLBACK_TTL_SECONDS * 1000,
      );
    },
  );

  it.each([1, 60, FALLBACK_TTL_SECONDS, 600, 3600, 86400])(
    'keeps refreshAt strictly between now and expiry for a ttl of %p s',
    (ttl) => {
      // THE loop guard: a fixed margin wider than the ttl would make every
      // freshly minted url already stale, so the hook would re-mint forever.
      const entry = toSignedUrl('u', ttl, NOW);
      expect(entry.refreshAt).toBeGreaterThan(NOW);
      expect(entry.refreshAt).toBeLessThan(entry.expiresAt);
      expect(isUsable(entry, NOW)).toBe(true);
    },
  );

  it('gives up half the lifetime when the margin would swallow it whole', () => {
    expect(toSignedUrl('u', 60, NOW).refreshAt).toBe(NOW + 30_000);
  });
});

describe('isUsable', () => {
  it('accepts an entry well inside its lifetime', () => {
    expect(isUsable(fresh('https://signed/a'), NOW)).toBe(true);
  });

  it('rejects a missing entry', () => {
    expect(isUsable(undefined, NOW)).toBe(false);
  });

  it('rejects an entry already past its deadline', () => {
    expect(isUsable(toSignedUrl('x', 3600, NOW - 2 * HOUR), NOW)).toBe(false);
  });

  it('rejects an entry inside the refresh margin', () => {
    // Still technically valid, but handing it to an image races the expiry —
    // and the request may not even reach S3 before the signature dies.
    const minted = NOW - HOUR + URL_REFRESH_MARGIN_MS - 1;
    expect(isUsable(toSignedUrl('x', 3600, minted), NOW)).toBe(false);
  });
});

describe('pendingAttachmentKeys', () => {
  it('returns keys that are neither resolved nor in flight', () => {
    expect(pendingAttachmentKeys([KEY_A, KEY_B], {}, new Set(), NOW)).toEqual([
      KEY_A,
      KEY_B,
    ]);
  });

  it('skips keys already resolved and still valid', () => {
    expect(
      pendingAttachmentKeys(
        [KEY_A, KEY_B],
        { [KEY_A]: fresh('https://signed/a') },
        new Set(),
        NOW,
      ),
    ).toEqual([KEY_B]);
  });

  it('re-fetches a key whose url is at or past expiry', () => {
    // THE regression this module exists for: a stored key lives forever, a
    // signature does not, so an old conversation used to render empty squares.
    expect(
      pendingAttachmentKeys(
        [KEY_A],
        { [KEY_A]: toSignedUrl('https://signed/a', 3600, NOW - 2 * HOUR) },
        new Set(),
        NOW,
      ),
    ).toEqual([KEY_A]);
  });

  it('skips keys already in flight', () => {
    // Without this the effect would fire a second request for the same key on
    // any re-render that happened before the first one resolved.
    expect(
      pendingAttachmentKeys([KEY_A, KEY_B], {}, new Set([KEY_A]), NOW),
    ).toEqual([KEY_B]);
  });

  it('de-duplicates repeated keys', () => {
    // Two messages can reference the same object; it must be fetched once.
    expect(pendingAttachmentKeys([KEY_A, KEY_A], {}, new Set(), NOW)).toEqual([
      KEY_A,
    ]);
  });

  it('returns nothing when everything is accounted for', () => {
    expect(
      pendingAttachmentKeys(
        [KEY_A, KEY_B],
        { [KEY_A]: fresh('https://signed/a') },
        new Set([KEY_B]),
        NOW,
      ),
    ).toEqual([]);
  });
});

describe('nextRefreshAt', () => {
  it('returns null when nothing is cached', () => {
    expect(nextRefreshAt([KEY_A], {})).toBeNull();
  });

  it('returns the earliest deadline, minus the margin', () => {
    // One timer for the whole conversation, armed by whichever url dies first.
    expect(
      nextRefreshAt([KEY_A, KEY_B], {
        [KEY_A]: toSignedUrl('a', 7200, NOW),
        [KEY_B]: toSignedUrl('b', 3600, NOW),
      }),
    ).toBe(NOW + HOUR - URL_REFRESH_MARGIN_MS);
  });

  it('ignores keys with no cached entry', () => {
    expect(nextRefreshAt([KEY_A, KEY_B], { [KEY_A]: fresh('a') })).toBe(
      NOW + HOUR - URL_REFRESH_MARGIN_MS,
    );
  });
});

describe('resolveAttachmentUrls', () => {
  let warn: jest.SpyInstance;

  beforeEach(() => {
    warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    warn.mockRestore();
  });

  it('maps every key to its presigned url and deadline', async () => {
    const fetchUrl = jest.fn(async (key: string) => ({
      downloadUrl: `https://signed/${key}`,
      expiresIn: 3600,
    }));

    await expect(
      resolveAttachmentUrls([KEY_A, KEY_B], fetchUrl, undefined, NOW),
    ).resolves.toEqual({
      [KEY_A]: toSignedUrl(`https://signed/${KEY_A}`, 3600, NOW),
      [KEY_B]: toSignedUrl(`https://signed/${KEY_B}`, 3600, NOW),
    });
  });

  it('drops a failed key but keeps the others', async () => {
    const fetchUrl = jest
      .fn()
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce({
        downloadUrl: `https://signed/${KEY_B}`,
        expiresIn: 3600,
      });

    const result = await resolveAttachmentUrls(
      [KEY_A, KEY_B],
      fetchUrl,
      undefined,
      NOW,
    );

    // One 500 must not cost the sibling its thumbnail.
    expect(result).toEqual({
      [KEY_B]: toSignedUrl(`https://signed/${KEY_B}`, 3600, NOW),
    });
    expect(warn).toHaveBeenCalled();
  });

  it('never rejects, even when every key fails', async () => {
    const fetchUrl = jest.fn().mockRejectedValue(new Error('boom'));

    // The chat must keep working when thumbnails cannot be resolved at all.
    await expect(
      resolveAttachmentUrls([KEY_A, KEY_B], fetchUrl),
    ).resolves.toEqual({});
  });

  it('reports every key as settled, successes and failures alike', async () => {
    const fetchUrl = jest
      .fn()
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce({
        downloadUrl: `https://signed/${KEY_B}`,
        expiresIn: 3600,
      });
    const onSettled = jest.fn();

    await resolveAttachmentUrls([KEY_A, KEY_B], fetchUrl, onSettled);

    // A failure that never settles would leave the key stuck in flight, so it
    // could never be retried.
    expect(onSettled).toHaveBeenCalledTimes(2);
    expect(onSettled).toHaveBeenCalledWith(KEY_A);
    expect(onSettled).toHaveBeenCalledWith(KEY_B);
  });

  it('resolves to an empty map for no keys', async () => {
    const fetchUrl = jest.fn();

    await expect(resolveAttachmentUrls([], fetchUrl)).resolves.toEqual({});
    expect(fetchUrl).not.toHaveBeenCalled();
  });
});

describe('toUrlMap', () => {
  it('flattens entries to the plain map the ui renders from', () => {
    expect(toUrlMap({ [KEY_A]: fresh('https://signed/a') })).toEqual({
      [KEY_A]: 'https://signed/a',
    });
  });
});
