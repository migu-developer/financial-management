import { Metrics, MetricUnit } from '@aws-lambda-powertools/metrics';
import type { MetricsService } from '@services/shared/domain/services/metrics';

/**
 * EMF (Embedded Metric Format) wrapper for AWS Powertools Metrics.
 * Create one instance at module scope (outside the handler), `count()`
 * business events during the invocation, and `publish()` in a finally
 * block — Powertools flushes the metrics as a structured log line that
 * CloudWatch converts into real metrics, no API calls or IAM needed.
 *
 * Mirrors the LoggerServiceImplementation / TracerServiceImplementation
 * pattern: never use `new Metrics()` directly in services.
 */
export class MetricsServiceImplementation implements MetricsService {
  public readonly metrics: Metrics;

  constructor(serviceName: string, namespace = 'FinancialManagement') {
    this.metrics = new Metrics({
      namespace,
      serviceName,
    });
  }

  /** Adds a Count metric (business event) to the current invocation. */
  count(name: string, value = 1): void {
    this.metrics.addMetric(name, MetricUnit.Count, value);
  }

  /** Adds a Milliseconds metric (duration) to the current invocation. */
  durationMs(name: string, value: number): void {
    this.metrics.addMetric(name, MetricUnit.Milliseconds, value);
  }

  /** Flushes stored metrics as an EMF log line. Call once per invocation. */
  publish(): void {
    this.metrics.publishStoredMetrics();
  }
}
