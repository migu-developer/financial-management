import React from 'react';

import { NotFoundTemplate } from '@features/landing/presentation/components/templates/not-found-template';

interface NotFoundPageProps {
  onGoHomePress?: () => void;
}

export function NotFoundPage({ onGoHomePress }: NotFoundPageProps) {
  return <NotFoundTemplate onGoHomePress={onGoHomePress} />;
}
