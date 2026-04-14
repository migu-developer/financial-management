import path from 'path';
import { fileURLToPath } from 'url';

import { getNodeConfig } from '@packages/config/eslint';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default [{ ignores: ['node_modules/'] }, ...getNodeConfig(__dirname)];
