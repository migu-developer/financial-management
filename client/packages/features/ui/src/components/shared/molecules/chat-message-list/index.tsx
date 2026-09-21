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
  /**
   * Label for the ACTION of expanding a photo (web only). Separate from the
   * description above: one string for both made the expanded image announce
   * itself as "Expand…" instead of describing the photo.
   */
  imageExpandAccessibilityLabel: string;
  /** Accessible label for dismissing the expanded image. Required for the same reason. */
  imageCloseAccessibilityLabel: string;
  /**
   * Called with the id of a message whose image failed to load.
   *
   * The id, not the URL: this package knows nothing about S3 keys or signatures,
   * and should not. The consumer owns the mapping from message to attachment and
   * decides whether the failure is recoverable.
   */
  onImageError?: (messageId: string) => void;
}

export function ChatMessageList({
  messages,
  imageAccessibilityLabel,
  imageExpandAccessibilityLabel,
  imageCloseAccessibilityLabel,
  onImageError,
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
            ? {
                imageUri: msg.imageUri,
                imageAccessibilityLabel,
                imageExpandAccessibilityLabel,
                imageCloseAccessibilityLabel,
                ...(onImageError && {
                  onImageError: () => onImageError(msg.id),
                }),
              }
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
