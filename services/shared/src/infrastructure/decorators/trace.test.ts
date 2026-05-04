import { trace } from '@services/shared/infrastructure/decorators/trace';

/**
 * In a non-Lambda environment (local dev, CI), Powertools Tracer
 * auto-disables and `getSegment()` returns `undefined`.
 * These tests verify the decorator behaves correctly in that scenario:
 * methods execute normally, return values are forwarded, and errors
 * are re-thrown without swallowing them.
 */

class FakeRepository {
  @trace('Fake:findAll')
  findAll(): Promise<string[]> {
    return Promise.resolve(['a', 'b', 'c']);
  }

  @trace('Fake:findById')
  findById(id: string): Promise<string | null> {
    return Promise.resolve(id === 'missing' ? null : `item-${id}`);
  }

  @trace('Fake:failing')
  findFailing(): Promise<never> {
    return Promise.reject(new Error('something went wrong'));
  }
}

describe('trace decorator', () => {
  let repo: FakeRepository;

  beforeEach(() => {
    repo = new FakeRepository();
  });

  it('should execute the method and return its result', async () => {
    const result = await repo.findAll();
    expect(result).toEqual(['a', 'b', 'c']);
  });

  it('should forward arguments correctly', async () => {
    const result = await repo.findById('42');
    expect(result).toBe('item-42');
  });

  it('should return null when the method returns null', async () => {
    const result = await repo.findById('missing');
    expect(result).toBeNull();
  });

  it('should re-throw errors from the decorated method', async () => {
    await expect(repo.findFailing()).rejects.toThrow('something went wrong');
  });
});
