import { dashboard } from './dashboard';
import { login } from './login';
import { landing } from './landing';
import { ui } from './ui';

export const es = {
  dashboard,
  login,
  landing,
  ui,
} as const;

export type EsResources = typeof es;
