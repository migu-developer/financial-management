import { login } from './login';

export const es = {
  login,
} as const;

export type EsResources = typeof es;
