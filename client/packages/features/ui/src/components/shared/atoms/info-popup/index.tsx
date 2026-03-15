import { rgba } from '@features/ui/utils/colors';
import React from 'react';
import { Modal, Text, TouchableOpacity, View } from 'react-native';
import { maxWidth } from '@features/ui/utils/spacing';

export interface InfoPopupProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  body: string;
  closeLabel: string;
}

export function InfoPopup({
  visible,
  onClose,
  title,
  body,
  closeLabel,
}: InfoPopupProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={{
          flex: 1,
          backgroundColor: rgba.black50,
          justifyContent: 'center',
          alignItems: 'center',
        }}
        activeOpacity={1}
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel={closeLabel}
      >
        {/* Stops tap from closing when pressing inside the card */}
        <TouchableOpacity
          activeOpacity={1}
          style={{ maxWidth: maxWidth.popup, width: '85%' }}
        >
          <View className="bg-white dark:bg-slate-800 rounded-2xl p-6">
            <Text className="text-slate-900 dark:text-white font-bold text-lg mb-3">
              {title}
            </Text>
            <Text className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed mb-5">
              {body}
            </Text>
            <TouchableOpacity
              onPress={onClose}
              className="bg-primary-500 rounded-xl py-3 items-center"
              accessibilityRole="button"
            >
              <Text className="text-white font-semibold text-sm">
                {closeLabel}
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}
