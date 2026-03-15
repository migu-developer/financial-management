import { SignOutUseCase } from './sign-out.use-case';
import type { DashboardRepository } from '@features/dashboard/domain/repositories/dashboard-repository.port';

const mockRepository: DashboardRepository = {
  signOut: jest.fn(),
};

describe('SignOutUseCase', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls repository.signOut()', async () => {
    const useCase = new SignOutUseCase(mockRepository);
    await useCase.execute();
    expect(mockRepository.signOut).toHaveBeenCalledTimes(1);
  });

  it('propagates repository errors', async () => {
    const error = new Error('Sign-out failed');
    (mockRepository.signOut as jest.Mock).mockRejectedValueOnce(error);
    const useCase = new SignOutUseCase(mockRepository);
    await expect(useCase.execute()).rejects.toThrow('Sign-out failed');
  });
});
