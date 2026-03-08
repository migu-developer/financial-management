import { DashboardHomePage, DashboardTemplate } from './index';

describe('@features/dashboard index exports', () => {
  it('exports DashboardHomePage', () => {
    expect(typeof DashboardHomePage).toBe('function');
  });

  it('exports DashboardTemplate', () => {
    expect(typeof DashboardTemplate).toBe('function');
  });
});
