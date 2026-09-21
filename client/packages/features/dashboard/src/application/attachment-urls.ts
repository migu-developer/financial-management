/**
 * Attachment thumbnail resolution, kept free of React so it can be tested
 * without a renderer (the repo mocks `react-native` wholesale and ships no
 * testing library). `presentation/hooks/use-attachment-urls.ts` is the thin
 * wrapper that owns the state and the effect.
 *
 * The attachments bucket is private, so a stored key is not renderable on its
 * own — it has to be exchanged for a short-lived presigned GET.
 *
 * A presigned GET EXPIRES. The message keeps the key forever, so the photo must
 * stay viewable forever; that only holds if the URL is treated as a cache entry
 * with a deadline instead of a value. Everything in this module exists to make
 * the deadline explicit: what is still usable, what has to be re-minted, and
 * when the next one falls due.
 */

/** A presigned GET, the moment it dies, and the moment to replace it. */
export interface SignedAttachmentUrl {
  url: string;
  /** Epoch ms. After this S3 refuses the signature with a 403. */
  expiresAt: number;
  /**
   * Epoch ms at which this entry stops being handed out. ALWAYS strictly before
   * `expiresAt` and strictly after the moment it was minted — see
   * `toSignedUrl`, which is the only thing allowed to compute it.
   */
  refreshAt: number;
}

/** Minimal shape needed from the repository; keeps this module port-agnostic. */
export type AttachmentUrlFetcher = (
  s3Key: string,
) => Promise<{ downloadUrl: string; expiresIn: number }>;

/**
 * How long before the true deadline a URL is replaced.
 *
 * Without a margin the refresh races the expiry: a URL handed to an `<Image>`
 * one second before the deadline is already dead by the time the request
 * reaches S3. It also absorbs clock skew between device and AWS, which is the
 * other way a "still valid" URL comes back 403.
 */
export const URL_REFRESH_MARGIN_MS = 5 * 60 * 1000;

/**
 * Used when the server omits `expiresIn` or sends something nonsensical.
 *
 * Deliberately SHORT: under-estimating the lifetime costs one extra request,
 * over-estimating costs the user a broken image — the exact bug this module
 * exists to prevent.
 */
export const FALLBACK_TTL_SECONDS = 300;

/**
 * Builds a cache entry from what the server returned.
 *
 * The margin is CLAMPED to half the lifetime. A fixed margin larger than the
 * TTL would place `refreshAt` at or before the mint time, so the entry would be
 * stale the instant it was stored — and the hook would re-mint it, store
 * another stale entry, and loop. Short TTLs therefore give up half their life
 * instead of all of it.
 */
export const toSignedUrl = (
  url: string,
  expiresIn: unknown,
  now: number,
): SignedAttachmentUrl => {
  const seconds =
    typeof expiresIn === 'number' && Number.isFinite(expiresIn) && expiresIn > 0
      ? expiresIn
      : FALLBACK_TTL_SECONDS;
  const lifetime = seconds * 1000;
  const usableFor = Math.max(lifetime - URL_REFRESH_MARGIN_MS, lifetime / 2);

  return { url, expiresAt: now + lifetime, refreshAt: now + usableFor };
};

/** True while the URL can still be handed to an image without racing expiry. */
export const isUsable = (
  entry: SignedAttachmentUrl | undefined,
  now: number,
): entry is SignedAttachmentUrl => entry !== undefined && entry.refreshAt > now;

/**
 * Keys that still need fetching: never resolved OR resolved but due for
 * replacement, not already in flight, and de-duplicated (two messages can
 * reference the same object).
 */
export const pendingAttachmentKeys = (
  keys: readonly string[],
  resolved: Readonly<Record<string, SignedAttachmentUrl>>,
  inFlight: ReadonlySet<string>,
  now: number,
): string[] => [
  ...new Set(
    keys.filter((key) => !isUsable(resolved[key], now) && !inFlight.has(key)),
  ),
];

/**
 * Epoch ms at which the earliest cached URL falls due, or `null` when nothing
 * is cached.
 *
 * Lets the caller arm ONE timer for the whole conversation instead of one per
 * image, and renew ahead of the break rather than after the user has already
 * seen a blank square.
 */
export const nextRefreshAt = (
  keys: readonly string[],
  resolved: Readonly<Record<string, SignedAttachmentUrl>>,
): number | null => {
  const due = keys
    .map((key) => resolved[key]?.refreshAt)
    .filter((at): at is number => at !== undefined);

  return due.length === 0 ? null : Math.min(...due);
};

/**
 * Exchanges each key for a presigned URL, in parallel.
 *
 * A failed exchange is DROPPED rather than thrown: the photo is supplementary
 * to the message text, so one bad response should leave that bubble looking the
 * way it did before this feature existed instead of breaking the conversation —
 * and must not take its siblings' thumbnails down with it.
 *
 * @param onSettled invoked for every key once its request finishes, success or
 *   failure, so the caller can clear its in-flight bookkeeping.
 * @param now injected so the deadlines are computed against the same clock the
 *   caller uses, and so tests do not have to mock time globally.
 */
export const resolveAttachmentUrls = async (
  keys: readonly string[],
  fetchUrl: AttachmentUrlFetcher,
  onSettled?: (s3Key: string) => void,
  now: number = Date.now(),
): Promise<Record<string, SignedAttachmentUrl>> => {
  const settled = await Promise.all(
    keys.map(async (key) => {
      try {
        const { downloadUrl, expiresIn } = await fetchUrl(key);
        return [key, toSignedUrl(downloadUrl, expiresIn, now)] as const;
      } catch (err) {
        console.warn('Failed to resolve attachment url', err);
        return null;
      } finally {
        onSettled?.(key);
      }
    }),
  );

  return Object.fromEntries(
    settled.filter(
      (entry): entry is readonly [string, SignedAttachmentUrl] =>
        entry !== null,
    ),
  );
};

/** Plain `key → url` view, which is all the UI needs. */
export const toUrlMap = (
  resolved: Readonly<Record<string, SignedAttachmentUrl>>,
): Record<string, string> =>
  Object.fromEntries(
    Object.entries(resolved).map(([key, entry]) => [key, entry.url]),
  );
