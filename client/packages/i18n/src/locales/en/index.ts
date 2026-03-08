import { dashboard } from './dashboard';
import { login } from './login';
import { landing } from './landing';
import { ui } from './ui';

export const en = {
  dashboard,
  login,
  landing,
  ui,
} as const;

export type EnResources = typeof en;
