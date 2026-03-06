import { ui } from './index';
import type { UiTranslation } from './index';

describe('en/ui namespace', () => {
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

  it('themeToggle messages are distinct', () => {
    expect(ui.themeToggle.switchToLight).not.toBe(ui.themeToggle.switchToDark);
  });

  it('satisfies the UiTranslation type', () => {
    const _typeCheck: UiTranslation = ui;
    expect(_typeCheck).toBe(ui);
  });
});
