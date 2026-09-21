import {
  type SignedAttachmentUrl,
  isUsable,
} from '@features/dashboard/application/attachment-urls';

/**
 * Process-wide cache of presigned attachment URLs, shared by every mount of the
 * chat drawer.
 *
 * Two reasons it lives ABOVE the component rather than in its state:
 *
 *   1. Cost and latency. Closing the drawer and reopening it, or switching
 *      between two sessions, otherwise re-mints every URL from scratch — one
 *      Lambda invocation per photo per open. A key's signature is still good
 *      for the best part of an hour; reusing it is free.
 *   2. Correctness. The retry budget below has to outlive the component, or a
 *      remount would reset it and an object that is genuinely gone would be
 *      re-fetched on a loop.
 *
 * An entry is only ever READ through `isUsable`, so an expired one can never
 * escape to the UI — it is treated exactly like a cache miss.
 */
export interface AttachmentUrlCache {
  /** Cached entries for `keys` that are still safely inside their lifetime. */
  read(
    keys: readonly string[],
    now: number,
  ): Record<string, SignedAttachmentUrl>;
  /**
   * Token identifying the current sign-in. Capture it BEFORE starting a fetch
   * and hand it back to `write`, so a response that lands after a sign-out is
   * dropped instead of stored.
   */
  generation(): number;
  /**
   * Stores freshly minted entries.
   *
   * @param generation the value `generation()` returned when the request that
   *   produced these entries STARTED. A mismatch means `clear()` ran in
   *   between, so the write is discarded.
   * @returns whether the entries were stored.
   */
  write(
    entries: Readonly<Record<string, SignedAttachmentUrl>>,
    generation: number,
  ): boolean;
  /**
   * Drops the entry for a key whose URL the renderer could not load, so the
   * next pass re-mints it.
   *
   * @returns `true` when a retry is still allowed. `false` means the budget is
   *   spent and the caller MUST stop: a 403 is a stale signature and re-minting
   *   fixes it, but a 404 is an object that no longer exists, and those two are
   *   indistinguishable from inside an `<Image>`. Without a budget the second
   *   case turns into an unbounded request loop.
   */
  invalidate(s3Key: string): boolean;
  /** Forgets everything. Call on sign-out so no signed URL outlives a session. */
  clear(): void;
}

/**
 * Error-driven re-mints allowed per key, per sign-in.
 *
 * Enough to recover from the only failure the client can actually fix (an
 * expired signature). Deliberately NOT restored when a re-mint succeeds:
 * presigning does not prove the object exists — the server validates the key
 * and calls `getSignedUrl`, which happily signs a deleted object — so a
 * successful mint followed by another 404 would reset the budget and loop
 * forever. Only `clear()` (a new sign-in) gives a key its budget back.
 */
export const MAX_REFRESH_RETRIES = 1;

export const createAttachmentUrlCache = (): AttachmentUrlCache => {
  const entries = new Map<string, SignedAttachmentUrl>();
  const retries = new Map<string, number>();
  let generation = 0;

  return {
    read(keys, now) {
      const hits: Record<string, SignedAttachmentUrl> = {};
      for (const key of keys) {
        const entry = entries.get(key);
        if (isUsable(entry, now)) hits[key] = entry;
      }
      return hits;
    },

    generation() {
      return generation;
    },

    write(written, writtenGeneration) {
      // A request started before sign-out can resolve after it. Writing it
      // would put a bearer URL for the previous account back into a cache the
      // next account reads from.
      if (writtenGeneration !== generation) return false;
      for (const [key, entry] of Object.entries(written)) {
        entries.set(key, entry);
      }
      return true;
    },

    invalidate(s3Key) {
      const spent = retries.get(s3Key) ?? 0;
      entries.delete(s3Key);
      if (spent >= MAX_REFRESH_RETRIES) return false;
      retries.set(s3Key, spent + 1);
      return true;
    },

    clear() {
      entries.clear();
      retries.clear();
      generation += 1;
    },
  };
};

/** The instance the chat UI uses. Exported so sign-out can clear it. */
export const attachmentUrlCache = createAttachmentUrlCache();

/**
 * Drops every cached URL and retry budget, and invalidates any request still
 * in flight.
 *
 * Part of the package's public API because the dashboard's own sign-out
 * adapter is not the only path that ends a session — a failed scheduled token
 * refresh drops it straight to null — and a presigned GET is a bearer
 * credential that outlives the session that minted it.
 */
export const clearAttachmentUrlCache = (): void => attachmentUrlCache.clear();
