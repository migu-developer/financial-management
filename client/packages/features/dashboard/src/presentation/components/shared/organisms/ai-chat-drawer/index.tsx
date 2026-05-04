import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  Alert,
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
import type { ChatMessage } from '@features/ui/components/shared/molecules/chat-message-list';
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

interface AIChatDrawerProps {
  visible: boolean;
  onClose: () => void;
}

function formatTimestamp(): string {
  const now = new Date();
  const hours = now.getHours().toString().padStart(2, '0');
  const minutes = now.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

export function AIChatDrawer({ visible, onClose }: AIChatDrawerProps) {
  const { t } = useTranslation('dashboard');
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const isPlatformWeb = useMemo(() => isWeb(), []);

  const drawerWidth = isPlatformWeb
    ? 380
    : Dimensions.get('window').width * 0.85;

  const slideAnim = useRef(new Animated.Value(drawerWidth)).current;

  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: 'welcome',
      message: t('aiChat.welcomeMessage'),
      timestamp: formatTimestamp(),
      isUser: false,
    },
  ]);

  const slideIn = useCallback(() => {
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [slideAnim]);

  const slideOut = useCallback(() => {
    Animated.timing(slideAnim, {
      toValue: drawerWidth,
      duration: 250,
      useNativeDriver: false,
    }).start(() => onClose());
  }, [slideAnim, drawerWidth, onClose]);

  React.useEffect(() => {
    if (visible) {
      slideIn();
    }
  }, [visible, slideIn]);

  const handleSend = useCallback(() => {
    const trimmed = inputText.trim();
    if (!trimmed) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      message: trimmed,
      timestamp: formatTimestamp(),
      isUser: true,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText('');

    setTimeout(() => {
      const botReply: ChatMessage = {
        id: `bot-${Date.now()}`,
        message: t('aiChat.botReply'),
        timestamp: formatTimestamp(),
        isUser: false,
      };
      setMessages((prev) => [...prev, botReply]);
    }, 800);
  }, [inputText, t]);

  const handleCamera = useCallback(() => {
    Alert.alert(t('aiChat.comingSoon'));
  }, [t]);

  const handleMic = useCallback(() => {
    Alert.alert(t('aiChat.comingSoon'));
  }, [t]);

  const handleClose = useCallback(() => {
    slideOut();
  }, [slideOut]);

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
        style={{
          flex: 1,
          backgroundColor: rgba.black50,
        }}
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
        </View>

        {/* Input */}
        <ChatInput
          value={inputText}
          onChangeText={setInputText}
          onSend={handleSend}
          onCamera={handleCamera}
          onMic={handleMic}
          placeholder={t('aiChat.placeholder')}
        />
      </Animated.View>
    </View>
  );
}
