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
import { isWeb } from '@packages/utils';

import { ChatInput } from '@features/ui/components/shared/atoms/chat-input';
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
  space,
  zIndex,
} from '@features/ui/utils/spacing';
import { fontWeight as fontWeightTokens } from '@features/ui/utils/typography';

import type { ChatEvent } from '@features/dashboard/domain/services/chat-event';
import { AppSyncEventsClient } from '@features/dashboard/infrastructure/realtime/appsync-events-client';
import { useChatContext } from '@features/dashboard/presentation/providers/chat-provider';

export interface AIChatDrawerProps {
  visible: boolean;
  onClose: () => void;
}

interface InternalMessage extends UiChatMessage {
  taskToken?: string;
  /** True until a Confirm/Cancel decision is taken. */
  pending?: boolean;
  /** True after the user chose Confirm or Cancel. */
  resolved?: boolean;
}

function formatTimestamp(): string {
  const now = new Date();
  const hours = now.getHours().toString().padStart(2, '0');
  const minutes = now.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
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

  const drawerWidth = isPlatformWeb
    ? 380
    : Dimensions.get('window').width * 0.85;
  const slideAnim = useRef(new Animated.Value(drawerWidth)).current;

  const [inputText, setInputText] = useState('');
  const [sessionId, setSessionId] = useState<string | undefined>(undefined);
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
    });

    const onEvent = (event: ChatEvent) => {
      setIsWaitingForAssistant(false);
      setMessages((prev) => [
        ...prev,
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
      ]);
    };

    client.subscribe(onEvent).catch((err) => {
      console.warn('AppSync subscribe failed', err);
      setErrorBanner(t('aiChat.error'));
    });

    return () => {
      client.close();
    };
  }, [visible, appSyncRealtimeDns, appSyncNamespace, userId, getAuthToken, t]);

  // ── Send message ──────────────────────────────────────────
  const handleSend = useCallback(async () => {
    const trimmed = inputText.trim();
    if (!trimmed) return;

    setErrorBanner(null);
    const userMessage: InternalMessage = {
      id: `user-${Date.now()}`,
      message: trimmed,
      timestamp: formatTimestamp(),
      isUser: true,
    };
    setMessages((prev) => [...prev, userMessage]);
    setInputText('');
    setIsWaitingForAssistant(true);

    try {
      const ack = await chatRepository.sendMessage({
        ...(sessionId !== undefined && { sessionId }),
        content: trimmed,
      });
      if (!sessionId) setSessionId(ack.sessionId);
    } catch (err) {
      console.warn('Failed to send chat message', err);
      setErrorBanner(t('aiChat.error'));
      setIsWaitingForAssistant(false);
    }
  }, [inputText, sessionId, chatRepository, t]);

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
  const mutedColor = isDark ? textTokens.dark.muted : textTokens.light.muted;
  const errorColor = isDark
    ? textTokens.dark.primary
    : textTokens.light.primary;

  // Append preview action rows immediately after their parent message.
  // Tracks pending messages so we render the confirm/cancel buttons inline.
  const pendingPreviews = messages.filter((m) => m.pending && m.taskToken);

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
            <MaterialCommunityIcons
              name="robot-outline"
              size={iconSize.lg}
              color={primary[600]}
            />
            <Text
              style={{
                fontSize: fontSizeScale.lg,
                fontWeight: fontWeightTokens.semibold,
                color: titleColor,
              }}
            >
              {t('aiChat.title')}
            </Text>
          </View>
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

        {/* Messages */}
        <View style={{ flex: 1 }}>
          <ChatMessageList messages={messages} />

          {/* HITL action rows, one per pending preview message */}
          {pendingPreviews.map((p) => (
            <ChatPreviewActions
              key={`actions-${p.id}`}
              confirmLabel={t('aiChat.confirm')}
              cancelLabel={t('aiChat.cancel')}
              onConfirm={() =>
                void handlePreviewDecision(p.id, p.taskToken!, true)
              }
              onCancel={() =>
                void handlePreviewDecision(p.id, p.taskToken!, false)
              }
            />
          ))}

          {isWaitingForAssistant && (
            <Text
              style={{
                color: mutedColor,
                fontSize: fontSizeScale.xs,
                marginHorizontal: space.md,
                marginVertical: space.xs,
              }}
            >
              {t('aiChat.processing')}
            </Text>
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

        {/* Input — camera + mic are placeholders until Phase 2 (multimedia). */}
        <ChatInput
          value={inputText}
          onChangeText={setInputText}
          onSend={() => void handleSend()}
          onCamera={() => undefined}
          onMic={() => undefined}
          placeholder={t('aiChat.placeholder')}
          cameraLabel={t('aiChat.cameraLabel', { defaultValue: 'Camera' })}
          micLabel={t('aiChat.micLabel', { defaultValue: 'Microphone' })}
          sendLabel={t('aiChat.send')}
        />
      </Animated.View>
    </View>
  );
}
