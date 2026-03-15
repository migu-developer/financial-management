import { DashboardWebLayout } from './index';

describe('DashboardWebLayout', () => {
  it('exports a function', () => {
    expect(typeof DashboardWebLayout).toBe('function');
  });

  it('has the expected name', () => {
    expect(DashboardWebLayout.name).toBe('DashboardWebLayout');
  });
});
