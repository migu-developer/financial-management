import React from 'react';
import { View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { generic, primary } from '@features/ui/utils/colors';
import { useTranslation } from '@packages/i18n';

export interface QrCodeProps {
  value: string;
  size?: number;
  backgroundColor?: string;
  foregroundColor?: string;
}

export function QrCode({
  value,
  size = 200,
  backgroundColor = generic.white,
  foregroundColor = primary[900],
}: QrCodeProps) {
  const { t } = useTranslation('login');

  return (
    <View
      className="items-center justify-center p-3 rounded-xl bg-white"
      accessibilityRole="image"
      accessibilityLabel={t('qrCode.accessibilityLabel')}
    >
      <QRCode
        value={value}
        size={size}
        color={foregroundColor}
        backgroundColor={backgroundColor}
      />
    </View>
  );
}
