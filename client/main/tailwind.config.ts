import type { Config } from 'tailwindcss';
import { dirname } from 'node:path';

import { colors } from '@features/ui/src/utils/colors';
import {
  fontFamily,
  fontSizeV3,
  fontWeight,
} from '@features/ui/src/utils/typography';
import {
  spacing,
  borderRadius,
  boxShadow,
} from '@features/ui/src/utils/spacing';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const nativewindPreset = require('nativewind/preset');

function resolvePackageSrc(name: string): string {
  return `${dirname(require.resolve(`${name}/package.json`))}/src/**/*.{js,jsx,ts,tsx}`;
}

const config: Config = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    resolvePackageSrc('@features/landing'),
    resolvePackageSrc('@features/ui'),
  ],
  darkMode: 'class',
  presets: [nativewindPreset],
  theme: {
    extend: {
      colors,
      fontFamily,
      fontSize: fontSizeV3,
      fontWeight,
      spacing,
      borderRadius,
      boxShadow,
    },
  },
  plugins: [],
};

export default config;
