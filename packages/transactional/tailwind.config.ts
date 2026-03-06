/**
 * Tailwind config for React Email.
 * Shape compatible with @react-email/components <Tailwind config={...} />
 *
 * Colors imported from @features/ui — single source of truth for the design system.
 */

import { colors } from '@features/ui/src/utils/colors';
import {
  fontFamily,
  fontSize,
  fontWeight,
} from '@features/ui/src/utils/typography';
import {
  spacing,
  borderRadius,
  boxShadow,
} from '@features/ui/src/utils/spacing';

const config = {
  theme: {
    screens: {
      sm: '480px',
      md: '768px',
      lg: '976px',
      xl: '1440px',
    },
    extend: {
      colors,
      fontFamily,
      fontSize,
      fontWeight,
      spacing,
      borderRadius,
      boxShadow,
    },
  },
};

export default config;
