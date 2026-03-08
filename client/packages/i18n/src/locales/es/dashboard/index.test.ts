import { dashboard } from './index';
import type { DashboardTranslation } from './index';

describe('es/dashboard namespace', () => {
  it('exports dashboard as an object', () => {
    expect(dashboard).toBeDefined();
    expect(typeof dashboard).toBe('object');
  });

  it('has required top-level keys', () => {
    expect(dashboard).toHaveProperty('home');
  });

  it('home has required keys', () => {
    expect(dashboard.home).toHaveProperty('title');
    expect(dashboard.home).toHaveProperty('underDevelopment');
    expect(dashboard.home).toHaveProperty('description');
  });

  it('satisfies the DashboardTranslation type', () => {
    const _typeCheck: DashboardTranslation = dashboard;
    expect(_typeCheck).toBe(dashboard);
  });
});
