import { ui } from './index';
import type { UiTranslation } from './index';

describe('es/ui namespace', () => {
  it('exports ui as an object', () => {
    expect(ui).toBeDefined();
    expect(typeof ui).toBe('object');
  });

  it('has themeToggle section', () => {
    expect(ui).toHaveProperty('themeToggle');
  });

  it('themeToggle has switchToLight and switchToDark', () => {
    expect(typeof ui.themeToggle.switchToLight).toBe('string');
    expect(typeof ui.themeToggle.switchToDark).toBe('string');
    expect(ui.themeToggle.switchToLight.length).toBeGreaterThan(0);
    expect(ui.themeToggle.switchToDark.length).toBeGreaterThan(0);
  });

  it('messages are in Spanish (contain Spanish characters or words)', () => {
    const combined = ui.themeToggle.switchToLight + ui.themeToggle.switchToDark;
    // Spanish translations should differ from English
    expect(combined).not.toContain('Switch to');
  });

  it('satisfies the UiTranslation type', () => {
    const _typeCheck: UiTranslation = ui;
    expect(_typeCheck).toBe(ui);
  });

  it('has hidePassword and showPassword', () => {
    expect(typeof ui.hidePassword).toBe('string');
    expect(typeof ui.showPassword).toBe('string');
    expect(ui.hidePassword.length).toBeGreaterThan(0);
    expect(ui.showPassword.length).toBeGreaterThan(0);
  });
});
