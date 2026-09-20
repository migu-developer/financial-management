import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  type SignedAttachmentUrl,
  nextRefreshAt,
  pendingAttachmentKeys,
  resolveAttachmentUrls,
  toUrlMap,
} from '@features/dashboard/application/attachment-urls';
import { attachmentUrlCache } from '@features/dashboard/application/attachment-url-cache';
import type { ChatRepositoryPort } from '@features/dashboard/domain/repositories/chat-repository.port';

/** Floor for the renewal timer, so a failing refresh cannot spin. */
const MIN_REFRESH_DELAY_MS = 1000;

export interface AttachmentUrls {
  /** `s3Key → presigned GET`, containing only URLs that are currently valid. */
  urls: Record<string, string>;
  /**
   * Report that the renderer could not load the URL for this key, so it gets
   * re-minted. Safe to call repeatedly: the cache's retry budget stops a key
   * whose object is genuinely gone from looping.
   */
  reportBroken: (s3Key: string) => void;
}

/**
 * Resolves normalized attachment keys into presigned URLs the UI can render,
 * and KEEPS them resolvable for as long as the conversation is on screen.
 *
 * Deliberately thin: the selection and fetching rules live in
 * `application/attachment-urls.ts` and `application/attachment-url-cache.ts`,
 * where they are covered without a React renderer. What stays here is what
 * genuinely needs React — the resolved map, the in-flight set, the effect that
 * drives them, and the timer that renews a URL before it dies.
 *
 * The earlier version cached a bare URL for the lifetime of the drawer. That is
 * the bug this replaces: a presigned GET lasts an hour, a drawer left open
 * lasts as long as the user wants, and the message keeps its key forever — so
 * an old conversation eventually rendered empty squares with nothing in the UI
 * able to notice or recover.
 *
 * @param keys MUST be referentially stable across renders that do not change
 *   its contents (memoize it), otherwise the effect re-runs every render.
 */
export const useAttachmentUrls = (
  chatRepository: ChatRepositoryPort,
  keys: readonly string[],
): AttachmentUrls => {
  const [resolved, setResolved] = useState<Record<string, SignedAttachmentUrl>>(
    {},
  );
  const inFlightRef = useRef<Set<string>>(new Set());
  // Bumped to force the effect to re-run after an invalidation, without making
  // the broken key look like a content change to `keys`.
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    const now = Date.now();
    // Adopt from the shared cache first: reopening a conversation inside the
    // signature's lifetime should cost zero requests. Compared by URL, not by
    // presence — another mount may have already renewed a key this one still
    // holds stale, and that renewal has to win.
    const cached = attachmentUrlCache.read(keys, now);
    const adoptable = Object.entries(cached).filter(
      ([key, entry]) => resolved[key]?.url !== entry.url,
    );
    if (adoptable.length > 0) {
      setResolved((prev) => ({ ...prev, ...Object.fromEntries(adoptable) }));
      return;
    }

    const pending = pendingAttachmentKeys(
      keys,
      { ...resolved, ...cached },
      inFlightRef.current,
      now,
    );
    if (pending.length === 0) return;

    pending.forEach((key) => inFlightRef.current.add(key));
    let cancelled = false;

    void resolveAttachmentUrls(
      pending,
      (key) => chatRepository.createAttachmentUrl(key),
      (key) => inFlightRef.current.delete(key),
      now,
    ).then((fresh) => {
      if (Object.keys(fresh).length === 0) return;
      // Written even when this mount is gone: the next one should still find it.
      attachmentUrlCache.write(fresh);
      if (cancelled) return;
      setResolved((prev) => ({ ...prev, ...fresh }));
    });

    return () => {
      cancelled = true;
    };
  }, [chatRepository, keys, resolved, refreshTick]);

  // Renew AHEAD of the deadline. Without this the effect above only re-runs on
  // a render, and an idle conversation does not render — so the first sign of
  // expiry would be a broken image.
  useEffect(() => {
    const due = nextRefreshAt(keys, resolved);
    if (due === null) return;

    // Floored, never zero: if a refresh fails the entry stays due, and a 0 ms
    // timer would turn that into a tight retry loop against the endpoint.
    const delay = Math.max(MIN_REFRESH_DELAY_MS, due - Date.now());
    const timer = setTimeout(() => setRefreshTick((n) => n + 1), delay);
    return () => clearTimeout(timer);
  }, [keys, resolved]);

  const reportBroken = useCallback((s3Key: string) => {
    if (!attachmentUrlCache.invalidate(s3Key)) return;
    setResolved((prev) => {
      if (!(s3Key in prev)) return prev;
      const next = { ...prev };
      delete next[s3Key];
      return next;
    });
    setRefreshTick((n) => n + 1);
  }, []);

  const urls = useMemo(() => toUrlMap(resolved), [resolved]);

  return { urls, reportBroken };
};
