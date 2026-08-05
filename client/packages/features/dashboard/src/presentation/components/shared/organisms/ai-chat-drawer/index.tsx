import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Animated,
  Dimensions,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useColorScheme } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from '@packages/i18n';
import { isWeb, preferenceStorage } from '@packages/utils';

import { ChatInput } from '@features/ui/components/shared/atoms/chat-input';
import { AttachmentPreview } from '@features/ui/components/shared/atoms/attachment-preview';
import { useChatAttachment } from '@features/dashboard/presentation/hooks/use-chat-attachment';
import { useAttachmentUrls } from '@features/dashboard/presentation/hooks/use-attachment-urls';
import { Skeleton } from '@features/ui/components/shared/atoms/skeleton';
import { TypingIndicator } from '@features/ui/components/shared/atoms/typing-indicator';
import { ChatMessageList } from '@features/ui/components/shared/molecules/chat-message-list';
import type { ChatMessage as UiChatMessage } from '@features/ui/components/shared/molecules/chat-message-list';
import { ChatPreviewActions } from '@features/ui/components/shared/molecules/chat-preview-actions';
import {
  generic,
  neutral,
  primary,
  rgba,
  surface,
  textTokens,
} from '@features/ui/utils/colors';
import {
  fontSizeScale,
  iconSize,
  radius,
  space,
  zIndex,
} from '@features/ui/utils/spacing';
import { fontWeight as fontWeightTokens } from '@features/ui/utils/typography';

import type { ChatEvent } from '@features/dashboard/domain/services/chat-event';
import type {
  ChatHistoryMessage,
  ChatSessionSummary,
} from '@features/dashboard/domain/repositories/chat-repository.port';
import { AppSyncEventsClient } from '@features/dashboard/infrastructure/realtime/appsync-events-client';
import { ChatSessionsPanel } from '@features/dashboard/presentation/components/shared/organisms/chat-sessions-panel';
import { useChatContext } from '@features/dashboard/presentation/providers/chat-provider';

export interface AIChatDrawerProps {
  visible: boolean;
  onClose: () => void;
}

interface InternalMessage extends UiChatMessage {
  /**
   * Normalized key of the photo sent with this message. Exchanged for a
   * presigned URL by `useAttachmentUrls` — the bucket is private, so the key
   * alone cannot be rendered.
   */
  attachmentS3Key?: string;
  taskToken?: string;
  /** True until a Confirm/Cancel decision is taken. */
  pending?: boolean;
  /** True after the user chose Confirm or Cancel. */
  resolved?: boolean;
}

type DrawerView = 'chat' | 'sessions';

function pad(value: number): string {
  return value.toString().padStart(2, '0');
}

function formatTimestamp(): string {
  const now = new Date();
  return `${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

function formatTimestampFromIso(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return formatTimestamp();
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function AIChatDrawer({ visible, onClose }: AIChatDrawerProps) {
  const {
    userId,
    chatRepository,
    appSyncRealtimeDns,
    appSyncNamespace,
    getAuthToken,
  } = useChatContext();
  const { t } = useTranslation('dashboard');
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const isPlatformWeb = useMemo(() => isWeb(), []);

  // Attachment copy is resolved here so the hook and the atom stay free of i18n.
  const attachmentMessages = useMemo(
    () => ({
      unsupported: t('aiChat.attachUnsupported'),
      uploadFailed: t('aiChat.attachUploadFailed'),
      timedOut: t('aiChat.attachTimedOut'),
    }),
    [t],
  );
  const {
    attachment,
    pickAttachment,
    clearAttachment,
    handleAttachmentEvent,
    isBusy: attachmentBusy,
  } = useChatAttachment({ chatRepository, messages: attachmentMessages });

  const attachmentStatusLabel = useMemo(() => {
    switch (attachment.status) {
      case 'preparing':
        return t('aiChat.attachPreparing');
      case 'uploading':
        return t('aiChat.attachUploading');
      case 'processing':
        return t('aiChat.attachProcessing');
      case 'ready':
        return t('aiChat.attachReady');
      default:
        return '';
    }
  }, [attachment.status, t]);

  const drawerWidth = isPlatformWeb
    ? 380
    : Dimensions.get('window').width * 0.85;
  const slideAnim = useRef(new Animated.Value(drawerWidth)).current;

  const buildWelcome = useCallback(
    (): InternalMessage => ({
      id: 'welcome',
      message: t('aiChat.welcomeMessage'),
      timestamp: formatTimestamp(),
      isUser: false,
    }),
    [t],
  );

  const [inputText, setInputText] = useState('');
  const [sessionId, setSessionId] = useState<string | undefined>(undefined);
  // Mirror of `sessionId` for the realtime callback: the AppSync subscription
  // closure is created once and does NOT re-run when the session changes, so
  // it reads the active session from this ref to filter out events that belong
  // to other sessions still processing in the background.
  const sessionIdRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    sessionIdRef.current = sessionId;
  }, [sessionId]);
  const [view, setView] = useState<DrawerView>('chat');
  const [sessions, setSessions] = useState<ChatSessionSummary[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [isWaitingForAssistant, setIsWaitingForAssistant] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [messages, setMessages] = useState<InternalMessage[]>(() => [
    {
      id: 'welcome',
      message: t('aiChat.welcomeMessage'),
      timestamp: formatTimestamp(),
      isUser: false,
    },
  ]);

  // ── Attachment thumbnails ─────────────────────────────────
  // Memoized so `useAttachmentUrls` only re-runs when the message list actually
  // changes, not on every unrelated re-render.
  const attachmentKeys = useMemo(
    () =>
      messages
        .map((m) => m.attachmentS3Key)
        .filter((key): key is string => key !== undefined),
    [messages],
  );
  const attachmentUrls = useAttachmentUrls(chatRepository, attachmentKeys);

  // A message keeps its own key; the URL arrives asynchronously, so until it
  // does the bubble simply renders without an image.
  const messagesWithImages = useMemo(
    (): InternalMessage[] =>
      messages.map((m) => {
        const uri = m.attachmentS3Key
          ? attachmentUrls[m.attachmentS3Key]
          : undefined;
        return uri === undefined ? m : { ...m, imageUri: uri };
      }),
    [messages, attachmentUrls],
  );

  // ── Map persisted history → UI messages ───────────────────
  const mapHistory = useCallback(
    (history: ChatHistoryMessage[]): InternalMessage[] =>
      history.map((m) => ({
        id: m.id,
        message: m.content,
        timestamp: formatTimestampFromIso(m.createdAt),
        isUser: m.role === 'user',
        // Only images are renderable; an audio note gets no thumbnail.
        ...(m.attachmentS3Key && m.attachmentType === 'image'
          ? { attachmentS3Key: m.attachmentS3Key }
          : {}),
        // Restore a still-pending preview so its Confirm/Cancel reappears.
        ...(m.role !== 'user' && m.taskToken && m.taskTokenStatus === 'pending'
          ? { taskToken: m.taskToken, pending: true }
          : {}),
      })),
    [],
  );

  const loadSessionMessages = useCallback(
    async (id: string) => {
      setRestoring(true);
      setErrorBanner(null);
      try {
        const history = await chatRepository.getSessionMessages(id);
        setMessages(history.length ? mapHistory(history) : [buildWelcome()]);
      } catch (err) {
        console.warn('Failed to load session messages', err);
        setErrorBanner(t('aiChat.error'));
      } finally {
        setRestoring(false);
      }
    },
    [chatRepository, mapHistory, buildWelcome, t],
  );

  // ── Restore the last session when the drawer opens ────────
  useEffect(() => {
    if (!visible) return undefined;
    let cancelled = false;
    void (async () => {
      try {
        const stored = await preferenceStorage.getLastChatSession(userId);
        if (cancelled || !stored) return;
        // Lock the realtime filter onto the restored session synchronously.
        sessionIdRef.current = stored;
        setSessionId(stored);
        await loadSessionMessages(stored);
      } catch (err) {
        console.warn('Failed to restore chat session', err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [visible, userId, loadSessionMessages]);

  // ── Animation ─────────────────────────────────────────────
  useEffect(() => {
    if (visible) {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: false,
      }).start();
    }
  }, [visible, slideAnim]);

  const handleClose = useCallback(() => {
    Animated.timing(slideAnim, {
      toValue: drawerWidth,
      duration: 250,
      useNativeDriver: false,
    }).start(() => onClose());
  }, [slideAnim, drawerWidth, onClose]);

  // After the realtime socket transparently reconnects, backfill the active
  // session from the DB (AppSync Events doesn't replay messages delivered
  // while we were offline) and clear any transient error banner. Silent — no
  // restore skeleton — so it doesn't disrupt an ongoing conversation.
  const handleRealtimeReconnect = useCallback(() => {
    setErrorBanner(null);
    const id = sessionIdRef.current;
    if (!id) return;
    chatRepository
      .getSessionMessages(id)
      .then((history) => {
        // The user may have switched sessions while this was in flight —
        // only apply the backfill if it still matches the active session.
        if (sessionIdRef.current !== id) return;
        if (!history.length) return;
        const mapped = mapHistory(history);
        setMessages(mapped);
        const last = mapped[mapped.length - 1];
        if (last && !last.isUser) setIsWaitingForAssistant(false);
      })
      .catch((err) => console.warn('Failed to backfill on reconnect', err));
  }, [chatRepository, mapHistory]);

  // ── Real-time subscription ────────────────────────────────
  useEffect(() => {
    if (!visible) return undefined;

    const client = new AppSyncEventsClient({
      realtimeDns: appSyncRealtimeDns,
      namespace: appSyncNamespace,
      channelPath: `${userId}/responses`,
      getToken: getAuthToken,
      onError: (err) => {
        console.warn('AppSync events error', err);
        setErrorBanner(t('aiChat.error'));
      },
      onReconnect: handleRealtimeReconnect,
    });

    const onEvent = (event: ChatEvent) => {
      // Attachment events come FIRST: they are emitted before any chat message
      // exists, so they carry no `sessionId` and the filter below would drop
      // them outright.
      if (handleAttachmentEvent(event)) return;

      // The channel (`${userId}/responses`) carries events for ALL of the
      // user's sessions, so render an event only when it belongs to the
      // session the drawer is currently showing. `sessionIdRef` is kept in
      // sync SYNCHRONOUSLY on every session change (send ack, select, new
      // chat, restore) — never lagging a render — so the active conversation's
      // own replies always match, while a background session's events (or any
      // event while no conversation is active) are dropped. This keeps strict
      // session isolation without swallowing the active session's replies.
      if (event.sessionId !== sessionIdRef.current) {
        return;
      }
      setIsWaitingForAssistant(false);
      setMessages((prev) => {
        // A new preview means the user iterated on the previous one: clear
        // older pending flags so only the latest Confirm/Cancel shows.
        const base =
          event.type === 'preview_pending'
            ? prev.map((m) => (m.pending ? { ...m, pending: false } : m))
            : prev;
        return [
          ...base,
          {
            id: event.messageId,
            message: event.content,
            timestamp: formatTimestamp(),
            isUser: false,
            ...(event.type === 'preview_pending' && {
              taskToken: event.taskToken,
              pending: true,
            }),
          },
        ];
      });
    };

    client.subscribe(onEvent).catch((err) => {
      console.warn('AppSync subscribe failed', err);
      setErrorBanner(t('aiChat.error'));
    });

    return () => {
      client.close();
    };
  }, [
    visible,
    appSyncRealtimeDns,
    appSyncNamespace,
    userId,
    getAuthToken,
    handleRealtimeReconnect,
    handleAttachmentEvent,
    t,
  ]);

  // ── Send message ──────────────────────────────────────────
  const handleSend = useCallback(async () => {
    const trimmed = inputText.trim();
    const readyKey =
      attachment.status === 'ready' ? attachment.readyKey : undefined;

    // A photo on its own is a valid message; text alone still is too.
    if (!trimmed && !readyKey) return;

    setErrorBanner(null);
    const userMessage: InternalMessage = {
      id: `user-${Date.now()}`,
      // Give the bubble something to show when the user sent only a photo.
      message: trimmed || t('aiChat.attachReady'),
      timestamp: formatTimestamp(),
      isUser: true,
      ...(readyKey !== undefined && { attachmentS3Key: readyKey }),
    };
    // Sending iterates on any pending preview — drop stale Confirm/Cancel.
    setMessages((prev) => [
      ...prev.map((m) => (m.pending ? { ...m, pending: false } : m)),
      userMessage,
    ]);
    setInputText('');
    clearAttachment();
    setIsWaitingForAssistant(true);

    try {
      const ack = await chatRepository.sendMessage({
        ...(sessionId !== undefined && { sessionId }),
        content: trimmed,
        ...(readyKey !== undefined && {
          attachmentS3Key: readyKey,
          attachmentType: 'image' as const,
        }),
      });
      if (!sessionId) {
        // Set the ref synchronously (before the state re-render) so the
        // assistant's reply for this brand-new session passes the onEvent
        // filter instead of being dropped in the gap before `sessionId` lands.
        sessionIdRef.current = ack.sessionId;
        setSessionId(ack.sessionId);
        void preferenceStorage.setLastChatSession(userId, ack.sessionId);
      }
    } catch (err) {
      console.warn('Failed to send chat message', err);
      setErrorBanner(t('aiChat.error'));
      setIsWaitingForAssistant(false);
    }
  }, [
    inputText,
    attachment.status,
    attachment.readyKey,
    clearAttachment,
    sessionId,
    chatRepository,
    userId,
    t,
  ]);

  // ── Session management ────────────────────────────────────
  const handleNewChat = useCallback(() => {
    // Clear the realtime lock synchronously: an empty/new chat owns no
    // session, so any in-flight background event must NOT render here.
    sessionIdRef.current = undefined;
    setSessionId(undefined);
    setMessages([buildWelcome()]);
    setErrorBanner(null);
    setIsWaitingForAssistant(false);
    setView('chat');
    void preferenceStorage.clearLastChatSession(userId);
  }, [buildWelcome, userId]);

  const openSessions = useCallback(async () => {
    setView('sessions');
    setSessionsLoading(true);
    setErrorBanner(null);
    try {
      setSessions(await chatRepository.listSessions());
    } catch (err) {
      console.warn('Failed to list sessions', err);
      setErrorBanner(t('aiChat.error'));
    } finally {
      setSessionsLoading(false);
    }
  }, [chatRepository, t]);

  const handleSelectSession = useCallback(
    async (id: string) => {
      // Lock the realtime filter onto the selected session synchronously.
      sessionIdRef.current = id;
      setSessionId(id);
      setView('chat');
      setIsWaitingForAssistant(false);
      void preferenceStorage.setLastChatSession(userId, id);
      await loadSessionMessages(id);
    },
    [userId, loadSessionMessages],
  );

  // ── Human-in-the-Loop confirm / cancel ────────────────────
  const handlePreviewDecision = useCallback(
    async (messageId: string, taskToken: string, confirmed: boolean) => {
      // Optimistically mark as resolved so the buttons can't be tapped twice.
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId ? { ...m, pending: false, resolved: true } : m,
        ),
      );
      try {
        await chatRepository.confirmExpense({ taskToken, confirmed });
        setIsWaitingForAssistant(true);
      } catch (err) {
        console.warn('Failed to confirm expense', err);
        setErrorBanner(t('aiChat.error'));
        // Roll the message back to pending so the user can retry.
        setMessages((prev) =>
          prev.map((m) =>
            m.id === messageId ? { ...m, pending: true, resolved: false } : m,
          ),
        );
      }
    },
    [chatRepository, t],
  );

  if (!visible) return null;

  const backgroundColor = isDark
    ? surface.dark.background
    : surface.light.background;
  const headerBg = isDark ? surface.dark.card : surface.light.card;
  const borderColor = isDark ? surface.dark.border : surface.light.border;
  const titleColor = isDark
    ? textTokens.dark.primary
    : textTokens.light.primary;
  const closeIconColor = isDark ? neutral[400] : neutral[500];
  const errorColor = isDark
    ? textTokens.dark.primary
    : textTokens.light.primary;

  // Only the latest pending preview keeps its Confirm/Cancel actions.
  const pendingPreviews = messages.filter((m) => m.pending && m.taskToken);
  const latestPreview = pendingPreviews[pendingPreviews.length - 1];
  const isSessionsView = view === 'sessions';

  return (
    <View
      style={{
        position: 'absolute',
        top: space.zero,
        left: space.zero,
        right: space.zero,
        bottom: space.zero,
        zIndex: zIndex.big,
        flexDirection: 'row',
      }}
    >
      {/* Backdrop */}
      <TouchableOpacity
        activeOpacity={1}
        onPress={handleClose}
        style={{ flex: 1, backgroundColor: rgba.black50 }}
        accessibilityRole="button"
        accessibilityLabel="Close drawer"
      />

      <Animated.View
        style={{
          width: drawerWidth,
          backgroundColor,
          transform: [{ translateX: slideAnim }],
          shadowColor: generic.black,
          shadowOffset: { width: -space.s2, height: space.zero },
          shadowOpacity: 0.25,
          shadowRadius: space.xs,
          elevation: space.md,
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: space.md,
            paddingVertical: space.sm,
            backgroundColor: headerBg,
            borderBottomWidth: 1,
            borderBottomColor: borderColor,
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: space.xs,
            }}
          >
            {isSessionsView ? (
              <TouchableOpacity
                onPress={() => setView('chat')}
                accessibilityRole="button"
                accessibilityLabel={t('aiChat.backLabel')}
                style={{ padding: space.s4 }}
              >
                <MaterialCommunityIcons
                  name="arrow-left"
                  size={iconSize.lg}
                  color={primary[600]}
                />
              </TouchableOpacity>
            ) : (
              <MaterialCommunityIcons
                name="robot-outline"
                size={iconSize.lg}
                color={primary[600]}
              />
            )}
            <Text
              style={{
                fontSize: fontSizeScale.lg,
                fontWeight: fontWeightTokens.semibold,
                color: titleColor,
              }}
            >
              {isSessionsView ? t('aiChat.sessionsTitle') : t('aiChat.title')}
            </Text>
          </View>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: space.xs,
            }}
          >
            {!isSessionsView && (
              <>
                <TouchableOpacity
                  onPress={handleNewChat}
                  accessibilityRole="button"
                  accessibilityLabel={t('aiChat.newChatLabel')}
                  style={{ padding: space.s4 }}
                >
                  <MaterialCommunityIcons
                    name="plus"
                    size={iconSize.lg}
                    color={closeIconColor}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => void openSessions()}
                  accessibilityRole="button"
                  accessibilityLabel={t('aiChat.sessionsLabel')}
                  style={{ padding: space.s4 }}
                >
                  <MaterialCommunityIcons
                    name="history"
                    size={iconSize.lg}
                    color={closeIconColor}
                  />
                </TouchableOpacity>
              </>
            )}
            <TouchableOpacity
              onPress={handleClose}
              accessibilityRole="button"
              accessibilityLabel="Close"
              style={{ padding: space.s4 }}
            >
              <MaterialCommunityIcons
                name="close"
                size={iconSize.lg}
                color={closeIconColor}
              />
            </TouchableOpacity>
          </View>
        </View>

        {isSessionsView ? (
          <ChatSessionsPanel
            sessions={sessions}
            loading={sessionsLoading}
            isDark={isDark}
            activeSessionId={sessionId}
            onSelect={(id) => void handleSelectSession(id)}
            onNewChat={handleNewChat}
            labels={{
              newChat: t('aiChat.newChat'),
              newChatLabel: t('aiChat.newChatLabel'),
              noSessions: t('aiChat.noSessions'),
              untitled: t('aiChat.untitledSession'),
            }}
          />
        ) : (
          <>
            {/* Messages */}
            <View style={{ flex: 1 }}>
              {restoring ? (
                <View style={{ padding: space.md, gap: space.sm }}>
                  {[0, 1, 2, 3, 4].map((i) => (
                    <Skeleton
                      key={i}
                      width={i % 2 === 0 ? '70%' : '55%'}
                      height={36}
                      borderRadius={radius.lg}
                    />
                  ))}
                </View>
              ) : (
                <ChatMessageList
                  messages={messagesWithImages}
                  imageAccessibilityLabel={t('aiChat.attachmentImageLabel')}
                />
              )}

              {/* HITL actions: only for the latest pending preview */}
              {!restoring && latestPreview && (
                <ChatPreviewActions
                  key={`actions-${latestPreview.id}`}
                  confirmLabel={t('aiChat.confirm')}
                  cancelLabel={t('aiChat.cancel')}
                  onConfirm={() =>
                    void handlePreviewDecision(
                      latestPreview.id,
                      latestPreview.taskToken!,
                      true,
                    )
                  }
                  onCancel={() =>
                    void handlePreviewDecision(
                      latestPreview.id,
                      latestPreview.taskToken!,
                      false,
                    )
                  }
                />
              )}

              {isWaitingForAssistant && !restoring && (
                <TypingIndicator accessibilityLabel={t('aiChat.typingLabel')} />
              )}

              {errorBanner !== null && (
                <Text
                  style={{
                    color: errorColor,
                    fontSize: fontSizeScale.xs,
                    marginHorizontal: space.md,
                    marginVertical: space.xs,
                  }}
                >
                  {errorBanner}
                </Text>
              )}
            </View>

            {/* Attachments are WEB-only for now: the picker and the image
                optimizer both rely on browser APIs. Mic stays hidden until the
                voice-note phase adds a Transcribe branch. */}
            <ChatInput
              value={inputText}
              onChangeText={setInputText}
              onSend={() => void handleSend()}
              onCamera={() => void pickAttachment()}
              onMic={() => undefined}
              placeholder={t('aiChat.placeholder')}
              cameraLabel={t('aiChat.attachLabel')}
              micLabel={t('aiChat.micLabel', { defaultValue: 'Microphone' })}
              sendLabel={t('aiChat.send')}
              showCamera={isPlatformWeb}
              showMic={false}
              canSend={
                !attachmentBusy &&
                (Boolean(inputText.trim()) || attachment.status === 'ready')
              }
              {...(attachment.status !== 'idle' && {
                attachmentSlot: (
                  <AttachmentPreview
                    status={attachment.status}
                    {...(attachment.previewUri !== undefined && {
                      previewUri: attachment.previewUri,
                    })}
                    {...(attachment.fileName !== undefined && {
                      fileName: attachment.fileName,
                    })}
                    {...(attachment.errorMessage !== undefined && {
                      errorMessage: attachment.errorMessage,
                    })}
                    statusLabel={attachmentStatusLabel}
                    onRemove={clearAttachment}
                    removeLabel={t('aiChat.attachRemoveLabel')}
                  />
                ),
              })}
            />
          </>
        )}
      </Animated.View>
    </View>
  );
}
