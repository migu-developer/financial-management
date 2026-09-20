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
  write(entries: Readonly<Record<string, SignedAttachmentUrl>>): void;
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
 * One re-mint per key.
 *
 * Enough to recover from the only failure the client can actually fix (an
 * expired signature), and not enough to hammer the endpoint for a key whose
 * object was deleted.
 */
export const MAX_REFRESH_RETRIES = 1;

export const createAttachmentUrlCache = (): AttachmentUrlCache => {
  const entries = new Map<string, SignedAttachmentUrl>();
  const retries = new Map<string, number>();

  return {
    read(keys, now) {
      const hits: Record<string, SignedAttachmentUrl> = {};
      for (const key of keys) {
        const entry = entries.get(key);
        if (isUsable(entry, now)) hits[key] = entry;
      }
      return hits;
    },

    write(written) {
      for (const [key, entry] of Object.entries(written)) {
        entries.set(key, entry);
        // A successful mint means the key is healthy again; anything that broke
        // before was transient, so the budget should not carry over.
        retries.delete(key);
      }
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
    },
  };
};

/** The instance the chat UI uses. Exported so sign-out can clear it. */
export const attachmentUrlCache = createAttachmentUrlCache();
