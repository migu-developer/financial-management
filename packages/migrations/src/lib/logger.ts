// Reason: We need to use console.log and console.error to log messages to the console.
/* eslint-disable no-console */
import chalk from 'chalk';

const log = console.log;
const error = console.error;

export const logger = {
  info: (...args: unknown[]) => log(chalk.blue('[INFO]'), ...args),

  success: (...args: unknown[]) => log(chalk.green('[OK]'), ...args),

  warn: (...args: unknown[]) => log(chalk.yellow('[WARN]'), ...args),

  error: (...args: unknown[]) => error(chalk.red('[ERROR]'), ...args),

  migration: (version: string, description: string) =>
    log(chalk.cyan(`  → ${version}`), chalk.gray(description)),

  divider: () => log(chalk.gray('─'.repeat(60))),
};
