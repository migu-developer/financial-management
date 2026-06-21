/**
 * Domain port for emitting business metrics (EMF). Lets the presentation /
 * application layers record metrics without depending on the Powertools
 * implementation directly. `MetricsServiceImplementation` is the adapter.
 */
export abstract class MetricsService {
  /** Adds a Count metric (business event) to the current invocation. */
  abstract count(name: string, value?: number): void;

  /** Adds a Milliseconds metric (duration) to the current invocation. */
  abstract durationMs(name: string, value: number): void;

  /** Flushes stored metrics as an EMF log line. Call once per invocation. */
  abstract publish(): void;
}
