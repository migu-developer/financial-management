import React, { useEffect, useRef } from 'react';
import { ScrollView, View } from 'react-native';

import { ChatBubble } from '@features/ui/components/shared/atoms/chat-bubble';
import type { ChatBubbleAttachment } from '@features/ui/components/shared/atoms/chat-bubble';
import { space } from '@features/ui/utils/spacing';

export interface ChatMessage {
  id: string;
  message: string;
  timestamp: string;
  isUser: boolean;
  /** Attached photo to render above the text, when the message carries one. */
  imageUri?: string;
}

export interface ChatMessageListProps {
  messages: ChatMessage[];
  /**
   * Accessible description applied to every attachment image.
   *
   * REQUIRED, not optional: any message may carry an image, and TypeScript
   * cannot express "required only if some array item has `imageUri`". Demanding
   * it here is what lets the bubble guarantee no image is ever announced to a
   * screen reader without a description. Passed in rather than hardcoded so the
   * copy stays in the consumer's i18n namespace.
   */
  imageAccessibilityLabel: string;
}

export function ChatMessageList({
  messages,
  imageAccessibilityLabel,
}: ChatMessageListProps) {
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (scrollViewRef.current && messages.length > 0) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length]);

  return (
    <ScrollView
      ref={scrollViewRef}
      style={{ flex: 1 }}
      contentContainerStyle={{
        paddingVertical: space.sm,
      }}
    >
      {messages.map((msg) => {
        // Built as the union rather than spread inline: a conditional spread
        // does not narrow, so TypeScript could not prove the image and its
        // label always travel together.
        const attachment: ChatBubbleAttachment =
          msg.imageUri !== undefined
            ? { imageUri: msg.imageUri, imageAccessibilityLabel }
            : {};

        return (
          <ChatBubble
            key={msg.id}
            message={msg.message}
            timestamp={msg.timestamp}
            isUser={msg.isUser}
            {...attachment}
          />
        );
      })}
      <View style={{ height: space.xs }} />
    </ScrollView>
  );
}
