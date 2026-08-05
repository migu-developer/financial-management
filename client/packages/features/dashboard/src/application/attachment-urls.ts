/**
 * Attachment thumbnail resolution, kept free of React so it can be tested
 * without a renderer (the repo mocks `react-native` wholesale and ships no
 * testing library). `presentation/hooks/use-attachment-urls.ts` is the thin
 * wrapper that owns the state and the effect.
 *
 * The attachments bucket is private, so a stored key is not renderable on its
 * own — it has to be exchanged for a short-lived presigned GET.
 */

/** Minimal shape needed from the repository; keeps this module port-agnostic. */
export type AttachmentUrlFetcher = (
  s3Key: string,
) => Promise<{ downloadUrl: string }>;

/**
 * Keys that still need fetching: not already resolved, not already in flight,
 * and de-duplicated (two messages can reference the same object).
 */
export const pendingAttachmentKeys = (
  keys: readonly string[],
  resolved: Readonly<Record<string, string>>,
  inFlight: ReadonlySet<string>,
): string[] => [
  ...new Set(keys.filter((key) => !(key in resolved) && !inFlight.has(key))),
];

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
 */
export const resolveAttachmentUrls = async (
  keys: readonly string[],
  fetchUrl: AttachmentUrlFetcher,
  onSettled?: (s3Key: string) => void,
): Promise<Record<string, string>> => {
  const settled = await Promise.all(
    keys.map(async (key) => {
      try {
        const { downloadUrl } = await fetchUrl(key);
        return [key, downloadUrl] as const;
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
      (entry): entry is readonly [string, string] => entry !== null,
    ),
  );
};
