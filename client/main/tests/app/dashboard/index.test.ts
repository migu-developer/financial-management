import DashboardIndex from '@/app/dashboard/index';

describe('app/dashboard/index', () => {
  it('exports a default function', () => {
    expect(typeof DashboardIndex).toBe('function');
  });

  it('has the expected name', () => {
    expect(DashboardIndex.name).toBe('DashboardIndex');
  });
});
