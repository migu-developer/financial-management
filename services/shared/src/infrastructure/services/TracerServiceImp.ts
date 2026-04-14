import { Tracer } from '@aws-lambda-powertools/tracer';

/**
 * Singleton Tracer wrapper for AWS X-Ray via Powertools.
 * Each service creates one instance at module scope (outside handler)
 * so X-Ray reuses the segment across warm invocations.
 */
export class TracerServiceImplementation {
  public readonly tracer: Tracer;

  constructor(serviceName?: string) {
    this.tracer = new Tracer({
      serviceName: serviceName ?? process.env['PROJECT_PREFIX'] ?? 'app',
    });
  }

  annotateColdStart(): void {
    this.tracer.annotateColdStart();
  }

  putAnnotation(key: string, value: string | number | boolean): void {
    this.tracer.putAnnotation(key, value);
  }

  putMetadata(key: string, value: unknown): void {
    this.tracer.putMetadata(key, value);
  }

  /**
   * Wraps an async function in a subsegment for tracing.
   * Use for DB queries, S3 calls, external API calls, etc.
   */
  async trace<T>(name: string, fn: () => Promise<T>): Promise<T> {
    const subsegment = this.tracer.getSegment()?.addNewSubsegment(name);
    try {
      const result = await fn();
      subsegment?.close();
      return result;
    } catch (error) {
      if (subsegment) {
        subsegment.addError(error as Error);
        subsegment.close();
      }
      throw error;
    }
  }
}
