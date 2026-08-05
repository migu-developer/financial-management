import { useEffect, useRef, useState } from 'react';

import {
  pendingAttachmentKeys,
  resolveAttachmentUrls,
} from '@features/dashboard/application/attachment-urls';
import type { ChatRepositoryPort } from '@features/dashboard/domain/repositories/chat-repository.port';

/**
 * Resolves normalized attachment keys into presigned URLs the UI can render.
 *
 * Deliberately thin: the selection and fetching rules live in
 * `application/attachment-urls.ts` where they are covered without a React
 * renderer. What stays here is what genuinely needs React — the resolved map,
 * the in-flight set, and the effect that drives them.
 *
 * URLs are cached for the lifetime of the drawer: a key never changes meaning,
 * and a signed URL outlives any realistic time spent in one conversation.
 *
 * @param keys MUST be referentially stable across renders that do not change
 *   its contents (memoize it), otherwise the effect re-runs every render.
 */
export const useAttachmentUrls = (
  chatRepository: ChatRepositoryPort,
  keys: readonly string[],
): Record<string, string> => {
  const [urls, setUrls] = useState<Record<string, string>>({});
  const inFlightRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const pending = pendingAttachmentKeys(keys, urls, inFlightRef.current);
    if (pending.length === 0) return;

    pending.forEach((key) => inFlightRef.current.add(key));
    let cancelled = false;

    void resolveAttachmentUrls(
      pending,
      (key) => chatRepository.createAttachmentUrl(key),
      (key) => inFlightRef.current.delete(key),
    ).then((resolved) => {
      if (cancelled || Object.keys(resolved).length === 0) return;
      setUrls((prev) => ({ ...prev, ...resolved }));
    });

    return () => {
      cancelled = true;
    };
  }, [chatRepository, keys, urls]);

  return urls;
};
