import { AIChatDrawer } from '.';

describe('AIChatDrawer', () => {
  it('exports a function component', () => {
    expect(typeof AIChatDrawer).toBe('function');
  });

  it('has the expected name', () => {
    expect(AIChatDrawer.name).toBe('AIChatDrawer');
  });
});
