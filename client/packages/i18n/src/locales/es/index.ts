import { login } from './login';
import { landing } from './landing';
import { ui } from './ui';

export const es = {
  login,
  landing,
  ui,
} as const;

export type EsResources = typeof es;
