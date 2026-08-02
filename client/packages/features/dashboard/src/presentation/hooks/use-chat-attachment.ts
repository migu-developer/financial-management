import { useCallback, useEffect, useRef, useState } from 'react';

import { pickImageFile } from '@packages/utils';
import {
  IDLE_ATTACHMENT,
  applyAttachmentEvent,
  isAttachmentBusy,
  prepareAttachmentUpload,
  type AttachmentMessages,
  type ChatAttachmentState,
} from '@features/dashboard/application/chat-attachment';
import type {
  AttachmentEvent,
  ChatEvent,
} from '@features/dashboard/domain/services/chat-event';
import type { ChatRepositoryPort } from '@features/dashboard/domain/repositories/chat-repository.port';

/**
 * How long to wait for `attachment_ready` before giving up.
 *
 * Normalization takes a couple of seconds at worst, so a minute means something
 * broke — a lost WebSocket frame, or a workflow that never published. Without
 * this the Send button would stay disabled forever with no explanation.
 */
export const ATTACHMENT_READY_TIMEOUT_MS = 60_000;

export interface UseChatAttachmentOptions {
  chatRepository: ChatRepositoryPort;
  /** Localized copy — nothing below the drawer imports i18n. */
  messages: AttachmentMessages;
}

export interface UseChatAttachmentResult {
  attachment: ChatAttachmentState;
  /** Opens the file chooser and runs the whole prepare → upload → wait flow. */
  pickAttachment: () => Promise<void>;
  clearAttachment: () => void;
  /**
   * Feed every realtime event here BEFORE the drawer's active-session filter:
   * attachment events carry no `sessionId` and would otherwise be dropped.
   *
   * Typed as a PREDICATE so the caller's remaining `ChatEvent` narrows to the
   * session-scoped variants — that is what lets the drawer keep reading
   * `event.sessionId` without a cast.
   */
  handleAttachmentEvent: (event: ChatEvent) => event is AttachmentEvent;
  /** True while the attachment is not yet sendable — gates the Send button. */
  isBusy: boolean;
}

/**
 * Wires the attachment lifecycle into React (WEB).
 *
 * Deliberately thin: the transitions and the upload orchestration live in
 * `application/chat-attachment.ts` where they are testable without a renderer.
 * What stays here is what genuinely needs React — state, the refs the realtime
 * handler reads without being re-created, timers, and object-URL cleanup.
 */
export function useChatAttachment({
  chatRepository,
  messages,
}: UseChatAttachmentOptions): UseChatAttachmentResult {
  const [attachment, setAttachment] =
    useState<ChatAttachmentState>(IDLE_ATTACHMENT);

  // Mirrors `attachment.uploadKey` so the realtime handler can correlate
  // without being re-created on every state change — it is registered once
  // alongside the WebSocket subscription.
  const uploadKeyRef = useRef<string | undefined>(undefined);
  const previewUriRef = useRef<string | undefined>(undefined);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );

  const releasePreview = useCallback(() => {
    if (previewUriRef.current) {
      URL.revokeObjectURL(previewUriRef.current);
      previewUriRef.current = undefined;
    }
  }, []);

  const clearTimer = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = undefined;
    }
  }, []);

  const clearAttachment = useCallback(() => {
    clearTimer();
    releasePreview();
    uploadKeyRef.current = undefined;
    setAttachment(IDLE_ATTACHMENT);
  }, [clearTimer, releasePreview]);

  // Never leak the object URL or a pending timer when the drawer unmounts.
  useEffect(
    () => () => {
      clearTimer();
      releasePreview();
    },
    [clearTimer, releasePreview],
  );

  const pickAttachment = useCallback(async () => {
    const file = await pickImageFile();
    if (!file) return;

    clearTimer();
    releasePreview();
    uploadKeyRef.current = undefined;

    const previewUri = URL.createObjectURL(file);
    previewUriRef.current = previewUri;

    const base: ChatAttachmentState = {
      status: 'preparing',
      previewUri,
      fileName: file.name,
    };
    setAttachment(base);

    const next = await prepareAttachmentUpload(
      {
        repository: chatRepository,
        messages,
        onUnexpectedError: (message, error) => console.warn(message, error),
      },
      file,
      base,
    );

    // The user may have removed or replaced the attachment while the upload was
    // in flight; committing a stale result would resurrect it.
    if (previewUriRef.current !== previewUri) return;

    setAttachment(next);

    if (next.status === 'processing' && next.uploadKey) {
      const { uploadKey } = next;
      uploadKeyRef.current = uploadKey;
      timeoutRef.current = setTimeout(() => {
        if (uploadKeyRef.current !== uploadKey) return;
        uploadKeyRef.current = undefined;
        setAttachment((prev) => ({
          ...prev,
          status: 'error',
          errorMessage: messages.timedOut,
        }));
      }, ATTACHMENT_READY_TIMEOUT_MS);
    }
  }, [chatRepository, clearTimer, messages, releasePreview]);

  const handleAttachmentEvent = useCallback(
    (event: ChatEvent): event is AttachmentEvent => {
      if (
        event.type !== 'attachment_ready' &&
        event.type !== 'attachment_rejected'
      ) {
        return false;
      }

      setAttachment((prev) => {
        const next = applyAttachmentEvent(prev, uploadKeyRef.current, event);
        return next ?? prev;
      });

      if (event.uploadKey === uploadKeyRef.current) {
        clearTimer();
        if (event.type === 'attachment_rejected') {
          uploadKeyRef.current = undefined;
        }
      }

      return true;
    },
    [clearTimer],
  );

  return {
    attachment,
    pickAttachment,
    clearAttachment,
    handleAttachmentEvent,
    isBusy: isAttachmentBusy(attachment.status),
  };
}
