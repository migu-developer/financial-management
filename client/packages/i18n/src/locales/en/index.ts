import { login } from './login';
import { landing } from './landing';

export const en = {
  login,
  landing,
} as const;

export type EnResources = typeof en;
