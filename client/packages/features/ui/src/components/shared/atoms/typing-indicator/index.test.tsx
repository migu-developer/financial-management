import { TypingIndicator } from '.';

describe('TypingIndicator', () => {
  it('exports a function component', () => {
    expect(typeof TypingIndicator).toBe('function');
  });

  it('has the expected name', () => {
    expect(TypingIndicator.name).toBe('TypingIndicator');
  });
});
