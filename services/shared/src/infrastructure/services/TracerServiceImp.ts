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

  captureAWSv3Client<T>(client: T): T {
    return this.tracer.captureAWSv3Client(client);
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

  /**
   * Wraps a call to an external service in a `remote` subsegment so the X-Ray
   * service map renders `name` as a readable downstream node (e.g.
   * "AppSyncEvents") instead of the raw DNS host the native `fetch` produces.
   *
   * On success, attaches the given annotations / metadata before closing the
   * subsegment; on error, records the error and rethrows. Falls back to running
   * `fn` directly when there is no active segment (e.g. unit tests).
   */
  async traceRemote<T>(
    name: string,
    fn: () => Promise<T>,
    opts?: {
      annotations?: Record<string, string | number | boolean>;
      metadata?: Record<string, unknown>;
    },
  ): Promise<T> {
    const subsegment = this.tracer.getSegment()?.addNewSubsegment(name);
    if (!subsegment) {
      return fn();
    }

    // Marking the subsegment `remote` makes the service map treat it as a
    // downstream node named `name` rather than an in-process subsegment.
    (subsegment as unknown as { namespace?: string }).namespace = 'remote';

    try {
      const result = await fn();
      if (opts?.annotations) {
        for (const [key, value] of Object.entries(opts.annotations)) {
          subsegment.addAnnotation(key, value);
        }
      }
      if (opts?.metadata) {
        subsegment.addMetadata('appsync', opts.metadata);
      }
      subsegment.close();
      return result;
    } catch (error) {
      subsegment.addError(error as Error);
      subsegment.close();
      throw error;
    }
  }
}
