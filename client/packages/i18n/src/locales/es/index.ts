import { login } from './login';
import { landing } from './landing';

export const es = {
  login,
  landing,
} as const;

export type EsResources = typeof es;
