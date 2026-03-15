import { AuthDashboardRepository } from './auth-dashboard-repository';

describe('AuthDashboardRepository', () => {
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
});
