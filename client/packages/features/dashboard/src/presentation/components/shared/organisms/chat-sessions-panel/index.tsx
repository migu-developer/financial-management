import React from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { Skeleton } from '@features/ui/components/shared/atoms/skeleton';
import {
  neutral,
  primary,
  surface,
  textTokens,
} from '@features/ui/utils/colors';
import {
  fontSizeScale,
  iconSize,
  radius,
  space,
} from '@features/ui/utils/spacing';
import { fontWeight } from '@features/ui/utils/typography';

import type { ChatSessionSummary } from '@features/dashboard/domain/repositories/chat-repository.port';

export interface ChatSessionsPanelProps {
  sessions: ChatSessionSummary[];
  loading: boolean;
  isDark: boolean;
  activeSessionId?: string | undefined;
  onSelect: (sessionId: string) => void;
  onNewChat: () => void;
  labels: {
    newChat: string;
    newChatLabel: string;
    noSessions: string;
    untitled: string;
  };
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString();
  } catch {
    return '';
  }
}

/**
 * Sessions sidebar panel (ChatGPT-style): a "New chat" action on top and a
 * tappable list of the user's past conversations, newest first.
 */
export function ChatSessionsPanel({
  sessions,
  loading,
  isDark,
  activeSessionId,
  onSelect,
  onNewChat,
  labels,
}: ChatSessionsPanelProps) {
  const titleColor = isDark
    ? textTokens.dark.primary
    : textTokens.light.primary;
  const mutedColor = isDark ? textTokens.dark.muted : textTokens.light.muted;
  const itemBorder = isDark ? surface.dark.border : surface.light.border;
  const activeBg = isDark ? surface.dark.card : neutral[100];

  return (
    <View style={{ flex: 1 }}>
      <TouchableOpacity
        onPress={onNewChat}
        accessibilityRole="button"
        accessibilityLabel={labels.newChatLabel}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: space.xs,
          margin: space.md,
          paddingVertical: space.sm,
          paddingHorizontal: space.md,
          borderRadius: radius.lg,
          backgroundColor: primary[600],
        }}
      >
        <MaterialCommunityIcons
          name="plus"
          size={iconSize.md}
          color={surface.light.background}
        />
        <Text
          style={{
            color: surface.light.background,
            fontSize: fontSizeScale.sm,
            fontWeight: fontWeight.semibold,
          }}
        >
          {labels.newChat}
        </Text>
      </TouchableOpacity>

      {loading ? (
        <View style={{ paddingHorizontal: space.md, gap: space.sm }}>
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} height={48} borderRadius={radius.md} />
          ))}
        </View>
      ) : sessions.length === 0 ? (
        <View
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            padding: space.lg,
          }}
        >
          <Text
            style={{ color: mutedColor, fontSize: fontSizeScale.sm }}
            accessibilityRole="text"
          >
            {labels.noSessions}
          </Text>
        </View>
      ) : (
        <ScrollView style={{ flex: 1 }}>
          {sessions.map((session) => {
            const isActive = session.id === activeSessionId;
            return (
              <TouchableOpacity
                key={session.id}
                onPress={() => onSelect(session.id)}
                accessibilityRole="button"
                style={{
                  paddingVertical: space.sm,
                  paddingHorizontal: space.md,
                  marginHorizontal: space.sm,
                  borderRadius: radius.md,
                  borderBottomWidth: 1,
                  borderBottomColor: itemBorder,
                  ...(isActive && { backgroundColor: activeBg }),
                }}
              >
                <Text
                  numberOfLines={1}
                  style={{
                    color: titleColor,
                    fontSize: fontSizeScale.sm,
                    fontWeight: fontWeight.medium,
                  }}
                >
                  {session.preview ?? labels.untitled}
                </Text>
                <Text
                  style={{
                    color: mutedColor,
                    fontSize: fontSizeScale['2xs'],
                    marginTop: space.s4,
                  }}
                >
                  {formatDate(session.lastMessageAt)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}
