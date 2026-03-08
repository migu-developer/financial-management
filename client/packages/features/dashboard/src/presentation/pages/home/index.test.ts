import { DashboardHomePage } from './index';

describe('DashboardHomePage', () => {
  it('exports a function', () => {
    expect(typeof DashboardHomePage).toBe('function');
  });

  it('has the expected name', () => {
    expect(DashboardHomePage.name).toBe('DashboardHomePage');
  });
});
