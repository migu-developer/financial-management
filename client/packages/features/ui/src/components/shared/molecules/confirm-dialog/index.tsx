import React from 'react';
import { Text, View } from 'react-native';
import { Modal } from '@features/ui/components/shared/atoms/modal';
import { Button } from '@features/ui/components/shared/atoms/button';

interface ConfirmDialogProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  loading?: boolean;
}

export function ConfirmDialog({
  visible,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel,
  cancelLabel,
  loading = false,
}: ConfirmDialogProps) {
  return (
    <Modal visible={visible} onClose={onClose} title={title} loading={loading}>
      <Text className="text-neutral-600 dark:text-neutral-300 mb-6">
        {message}
      </Text>
      <View className="flex-row gap-3 justify-end">
        <Button
          label={cancelLabel}
          variant="ghost"
          size="sm"
          onPress={onClose}
          disabled={loading}
        />
        <Button
          label={confirmLabel}
          variant="primary"
          size="sm"
          onPress={onConfirm}
          loading={loading}
        />
      </View>
    </Modal>
  );
}
