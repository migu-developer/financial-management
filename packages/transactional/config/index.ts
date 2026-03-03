import 'dotenv/config';

export const config: Record<string, string> = {
  ...((process.env || {}) as Record<string, string>),
};
