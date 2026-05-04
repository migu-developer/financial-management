import { ChatBubble } from '.';

describe('ChatBubble', () => {
  it('exports a function component', () => {
    expect(typeof ChatBubble).toBe('function');
  });

  it('has the expected name', () => {
    expect(ChatBubble.name).toBe('ChatBubble');
  });
});
