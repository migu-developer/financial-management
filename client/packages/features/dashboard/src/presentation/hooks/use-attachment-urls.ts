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

/**
 * Backoff for a renewal that FAILED. The deadline has already passed at that
 * point, so without these the timer would re-arm at the floor and hammer the
 * endpoint once a second for as long as the outage lasts.
 */
export const REFRESH_BACKOFF_BASE_MS = 5000;
/**
 * Capped well INSIDE `URL_REFRESH_MARGIN_MS` (five minutes). The backoff is
 * global, so one permanently broken key delays the renewal of its healthy
 * siblings too; a ceiling at or above the margin would let a healthy URL reach
 * its real expiry while waiting out someone else's outage.
 */
export const REFRESH_BACKOFF_MAX_MS = 60 * 1000;

export const refreshBackoffMs = (failures: number): number =>
  Math.min(
    REFRESH_BACKOFF_BASE_MS * 2 ** (failures - 1),
    REFRESH_BACKOFF_MAX_MS,
  );

/**
 * How long until the next renewal attempt, or `null` when there is nothing to
 * wait for and no timer should be armed.
 *
 * A failed round wins over the cached deadlines, and deliberately so: if the
 * FIRST round fails for every key nothing is cached at all, `due` is `null`,
 * and keying the timer purely off cached deadlines would mean the very first
 * failure — the common one, an offline app on open — is never retried.
 *
 * Extracted as a pure function because the effect that uses it is unreachable
 * from Jest here (the repo mocks `react-native` wholesale and ships no React
 * testing library), and this decision is the part that carries the risk.
 *
 * @param due epoch ms from `nextRefreshAt`, or `null` when nothing is cached.
 * @param failures consecutive failed renewal rounds.
 */
export const renewalDelayMs = (
  due: number | null,
  failures: number,
  now: number,
): number | null => {
  if (failures > 0) return refreshBackoffMs(failures);
  if (due === null) return null;
  // Floored, never zero: a due entry whose deadline already passed would
  // otherwise arm a 0 ms timer and spin.
  return Math.max(MIN_REFRESH_DELAY_MS, due - now);
};

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
  // Consecutive failed renewal rounds. Drives the backoff AND re-arms the
  // timer: a failed round changes nothing else, so without this state the
  // timer effect would never run again and the URL would expire in silence.
  const [failures, setFailures] = useState(0);

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
    // Captured BEFORE the request so a sign-out mid-flight invalidates it.
    const generation = attachmentUrlCache.generation();

    void resolveAttachmentUrls(
      pending,
      (key) => chatRepository.createAttachmentUrl(key),
      (key) => inFlightRef.current.delete(key),
      now,
    ).then((fresh) => {
      const got = Object.keys(fresh).length;
      // Written even when this mount is gone: the next one should still find
      // it. Refused outright if a sign-out happened while this was in flight,
      // and a refused write counts as not having landed.
      const stored = got > 0 && attachmentUrlCache.write(fresh, generation);
      if (cancelled) return;
      // The backoff clears ONLY when every pending key came back. A batch
      // where one key succeeds and another fails still leaves that other key
      // due, and treating it as a success would drop the delay back to the
      // one-second floor and re-request it every second for the whole outage.
      const complete = stored && got === pending.length;
      setFailures((f) => (complete ? 0 : f + 1));
      if (stored) setResolved((prev) => ({ ...prev, ...fresh }));
    });

    return () => {
      cancelled = true;
    };
  }, [chatRepository, keys, resolved, refreshTick]);

  // Renew AHEAD of the deadline. Without this the effect above only re-runs on
  // a render, and an idle conversation does not render — so the first sign of
  // expiry would be a broken image.
  //
  // `failures` is a dependency on purpose: a failed renewal leaves `resolved`
  // and `keys` untouched, so it is the only thing that can bring the timer
  // back after the deadline has already passed.
  useEffect(() => {
    const delay = renewalDelayMs(
      nextRefreshAt(keys, resolved),
      failures,
      Date.now(),
    );
    if (delay === null) return;

    const timer = setTimeout(() => setRefreshTick((n) => n + 1), delay);
    return () => clearTimeout(timer);
  }, [keys, resolved, failures]);

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
