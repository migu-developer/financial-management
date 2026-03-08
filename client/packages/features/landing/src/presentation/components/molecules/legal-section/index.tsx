import React from 'react';
import { Text, View } from 'react-native';

interface LegalSectionProps {
  title: string;
  paragraphs: string[];
}

export function LegalSection({ title, paragraphs }: LegalSectionProps) {
  return (
    <View className="mb-8">
      <Text className="text-white font-bold text-xl mb-3">{title}</Text>
      {paragraphs.map((paragraph, i) => (
        <Text key={i} className="text-slate-300 text-base mb-2">
          {paragraph}
        </Text>
      ))}
    </View>
  );
}
