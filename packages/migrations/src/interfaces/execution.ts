import type { PoolClient } from 'pg';

export type ExecutionFunction = (client: PoolClient) => Promise<void>;

export interface UpDownExecution {
  up: ExecutionFunction;
  down: ExecutionFunction;
}
