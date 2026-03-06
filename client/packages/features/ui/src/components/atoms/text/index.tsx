import React from 'react';
import { Text as RNText } from 'react-native';
import type { TextProps } from 'react-native';

type Variant =
  | 'display'
  | 'h1'
  | 'h2'
  | 'h3'
  | 'h4'
  | 'body'
  | 'body-sm'
  | 'caption'
  | 'label';

interface TextComponentProps extends TextProps {
  variant?: Variant;
}

const variantClasses: Record<Variant, string> = {
  display: 'text-5xl font-extrabold leading-tight tracking-tight',
  h1: 'text-4xl font-bold leading-tight tracking-tight',
  h2: 'text-3xl font-bold leading-snug',
  h3: 'text-2xl font-semibold leading-snug',
  h4: 'text-xl font-semibold',
  body: 'text-base leading-relaxed',
  'body-sm': 'text-sm leading-relaxed',
  caption: 'text-xs',
  label: 'text-sm font-medium',
};

export function Text({
  variant = 'body',
  className = '',
  children,
  ...props
}: TextComponentProps) {
  return (
    <RNText className={`${variantClasses[variant]} ${className}`} {...props}>
      {children}
    </RNText>
  );
}
