import {
  pendingAttachmentKeys,
  resolveAttachmentUrls,
} from './attachment-urls';

const KEY_A = 'chat-ready/u1/a.jpg';
const KEY_B = 'chat-ready/u1/b.jpg';

describe('pendingAttachmentKeys', () => {
  it('returns keys that are neither resolved nor in flight', () => {
    expect(pendingAttachmentKeys([KEY_A, KEY_B], {}, new Set())).toEqual([
      KEY_A,
      KEY_B,
    ]);
  });

  it('skips keys already resolved', () => {
    expect(
      pendingAttachmentKeys(
        [KEY_A, KEY_B],
        { [KEY_A]: 'https://signed/a' },
        new Set(),
      ),
    ).toEqual([KEY_B]);
  });

  it('skips keys already in flight', () => {
    // Without this the effect would fire a second request for the same key on
    // any re-render that happened before the first one resolved.
    expect(pendingAttachmentKeys([KEY_A, KEY_B], {}, new Set([KEY_A]))).toEqual(
      [KEY_B],
    );
  });

  it('de-duplicates repeated keys', () => {
    // Two messages can reference the same object; it must be fetched once.
    expect(pendingAttachmentKeys([KEY_A, KEY_A], {}, new Set())).toEqual([
      KEY_A,
    ]);
  });

  it('returns nothing when everything is accounted for', () => {
    expect(
      pendingAttachmentKeys(
        [KEY_A, KEY_B],
        { [KEY_A]: 'https://signed/a' },
        new Set([KEY_B]),
      ),
    ).toEqual([]);
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

  it('maps every key to its presigned url', async () => {
    const fetchUrl = jest.fn(async (key: string) => ({
      downloadUrl: `https://signed/${key}`,
    }));

    await expect(
      resolveAttachmentUrls([KEY_A, KEY_B], fetchUrl),
    ).resolves.toEqual({
      [KEY_A]: `https://signed/${KEY_A}`,
      [KEY_B]: `https://signed/${KEY_B}`,
    });
  });

  it('drops a failed key but keeps the others', async () => {
    const fetchUrl = jest
      .fn()
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce({ downloadUrl: `https://signed/${KEY_B}` });

    const result = await resolveAttachmentUrls([KEY_A, KEY_B], fetchUrl);

    // One 500 must not cost the sibling its thumbnail.
    expect(result).toEqual({ [KEY_B]: `https://signed/${KEY_B}` });
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
      .mockResolvedValueOnce({ downloadUrl: `https://signed/${KEY_B}` });
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
