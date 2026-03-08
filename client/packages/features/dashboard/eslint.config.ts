import path from 'path';
import { fileURLToPath } from 'url';

import { getBaseConfig } from '@packages/config/eslint';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export default getBaseConfig(__dirname);
