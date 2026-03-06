import { login } from './login';
import { landing } from './landing';
import { ui } from './ui';

export const en = {
  login,
  landing,
  ui,
} as const;

export type EnResources = typeof en;
