import { Tracer } from '@aws-lambda-powertools/tracer';

const tracer = new Tracer({ serviceName: 'trace-decorator' });

type AsyncMethod = (...args: never[]) => Promise<unknown>;

export function trace(segmentName: string) {
  return function <Fn extends AsyncMethod>(
    target: Fn,
    _context: ClassMethodDecoratorContext,
  ): Fn {
    async function wrapper(
      this: unknown,
      ...args: unknown[]
    ): Promise<unknown> {
      const segment = tracer.getSegment();
      if (!segment) {
        return target.apply(this, args as never[]);
      }
      const subsegment = segment.addNewSubsegment(segmentName);
      tracer.setSegment(subsegment);
      try {
        const result = await target.apply(this, args as never[]);
        subsegment.close();
        tracer.setSegment(segment);
        return result;
      } catch (error) {
        subsegment.addError(error as Error);
        subsegment.close();
        tracer.setSegment(segment);
        throw error;
      }
    }
    return wrapper as unknown as Fn;
  };
}
