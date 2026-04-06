import React, { useCallback, useMemo } from 'react';
import {
  Modal as RNModal,
  Pressable,
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import { rgba } from '@features/ui/utils/colors';
import { maxWidth, space } from '@features/ui/utils/spacing';
import { isIOS } from '@packages/utils';

export interface ModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  closeAccessibilityLabel?: string;
  loading?: boolean;
}

export function Modal({
  visible,
  onClose,
  title,
  children,
  closeAccessibilityLabel,
  loading = false,
}: ModalProps) {
  const { width: screenWidth } = useWindowDimensions();
  const modalWidth = Math.min(screenWidth - space.lg * 2, maxWidth.sm);
  const platformIsIOS = useMemo(() => isIOS(), []);

  const handleClose = useCallback(() => {
    if (!loading) onClose();
  }, [loading, onClose]);

  return (
    <RNModal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <Pressable
        style={{
          flex: 1,
          backgroundColor: rgba.black50,
          justifyContent: 'center',
          alignItems: 'center',
          padding: space.lg,
        }}
        onPress={handleClose}
      >
        <KeyboardAvoidingView
          behavior={platformIsIOS ? 'padding' : 'height'}
          style={{ width: modalWidth }}
        >
          <Pressable onPress={(e) => e.stopPropagation()}>
            <View className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-100 dark:border-slate-700">
              <View className="flex-row items-center justify-between mb-4">
                <Text className="text-lg font-semibold text-slate-900 dark:text-white flex-1 mr-2">
                  {title}
                </Text>
                {!loading && (
                  <TouchableOpacity
                    onPress={handleClose}
                    accessibilityRole="button"
                    accessibilityLabel={closeAccessibilityLabel}
                  >
                    <Text className="text-2xl text-slate-400 dark:text-slate-500">
                      &times;
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
              <ScrollView showsVerticalScrollIndicator={false}>
                {children}
              </ScrollView>
            </View>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </RNModal>
  );
}
