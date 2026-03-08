import DashboardHomeScreen from '@/app/dashboard/home/index';

describe('app/dashboard/home/index', () => {
  it('exports a default function', () => {
    expect(typeof DashboardHomeScreen).toBe('function');
  });

  it('has the expected name', () => {
    expect(DashboardHomeScreen.name).toBe('DashboardHomeScreen');
  });
});
