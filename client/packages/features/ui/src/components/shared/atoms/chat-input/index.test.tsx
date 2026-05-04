import { ChatInput } from '.';

describe('ChatInput', () => {
  it('exports a function component', () => {
    expect(typeof ChatInput).toBe('function');
  });

  it('has the expected name', () => {
    expect(ChatInput.name).toBe('ChatInput');
  });
});
