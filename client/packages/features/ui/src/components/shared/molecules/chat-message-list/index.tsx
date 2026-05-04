import React, { useEffect, useRef } from 'react';
import { ScrollView, View } from 'react-native';

import { ChatBubble } from '@features/ui/components/shared/atoms/chat-bubble';
import { space } from '@features/ui/utils/spacing';

export interface ChatMessage {
  id: string;
  message: string;
  timestamp: string;
  isUser: boolean;
}

export interface ChatMessageListProps {
  messages: ChatMessage[];
}

export function ChatMessageList({ messages }: ChatMessageListProps) {
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
      {messages.map((msg) => (
        <ChatBubble
          key={msg.id}
          message={msg.message}
          timestamp={msg.timestamp}
          isUser={msg.isUser}
        />
      ))}
      <View style={{ height: space.xs }} />
    </ScrollView>
  );
}
