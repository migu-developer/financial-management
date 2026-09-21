import { attachmentUrlCache } from '@features/dashboard/application/attachment-url-cache';
import { toSignedUrl } from '@features/dashboard/application/attachment-urls';
import { AuthDashboardRepository } from './auth-dashboard-repository';

const NOW = 1_700_000_000_000;
const KEY = 'chat-ready/u1/a.jpg';

describe('AuthDashboardRepository', () => {
  afterEach(() => {
    attachmentUrlCache.clear();
  });

  it('calls the injected signOut function on signOut()', async () => {
    const signOutFn = jest.fn().mockResolvedValue(undefined);
    const repo = new AuthDashboardRepository(signOutFn);
    await repo.signOut();
    expect(signOutFn).toHaveBeenCalledTimes(1);
  });

  it('propagates errors from the injected signOut function', async () => {
    const error = new Error('Network error');
    const signOutFn = jest.fn().mockRejectedValue(error);
    const repo = new AuthDashboardRepository(signOutFn);
    await expect(repo.signOut()).rejects.toThrow('Network error');
  });

  it('clears cached attachment urls on signOut()', async () => {
    // A presigned GET needs no token: leaving one cached would let the next
    // account on the device read the previous one's receipt.
    attachmentUrlCache.write(
      { [KEY]: toSignedUrl('https://signed/a', 3600, NOW) },
      attachmentUrlCache.generation(),
    );
    const repo = new AuthDashboardRepository(
      jest.fn().mockResolvedValue(undefined),
    );

    await repo.signOut();

    expect(attachmentUrlCache.read([KEY], NOW)).toEqual({});
  });

  it('clears them even when the sign-out itself fails', async () => {
    attachmentUrlCache.write(
      { [KEY]: toSignedUrl('https://signed/a', 3600, NOW) },
      attachmentUrlCache.generation(),
    );
    const repo = new AuthDashboardRepository(
      jest.fn().mockRejectedValue(new Error('Network error')),
    );

    await expect(repo.signOut()).rejects.toThrow('Network error');

    expect(attachmentUrlCache.read([KEY], NOW)).toEqual({});
  });
});
