import { DashboardTemplate } from './index';

describe('DashboardTemplate', () => {
  it('exports a function', () => {
    expect(typeof DashboardTemplate).toBe('function');
  });

  it('has the expected name', () => {
    expect(DashboardTemplate.name).toBe('DashboardTemplate');
  });
});
