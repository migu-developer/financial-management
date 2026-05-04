import { ChatMessageList } from '.';

describe('ChatMessageList', () => {
  it('exports a function component', () => {
    expect(typeof ChatMessageList).toBe('function');
  });

  it('has the expected name', () => {
    expect(ChatMessageList.name).toBe('ChatMessageList');
  });
});
