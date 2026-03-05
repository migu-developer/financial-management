import { login } from './login';

export const en = {
  login,
} as const;

export type EnResources = typeof en;
