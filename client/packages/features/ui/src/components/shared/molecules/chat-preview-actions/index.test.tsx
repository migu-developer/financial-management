import { ChatPreviewActions } from '.';

describe('ChatPreviewActions', () => {
  it('exports a function component', () => {
    expect(typeof ChatPreviewActions).toBe('function');
  });

  it('has the expected name', () => {
    expect(ChatPreviewActions.name).toBe('ChatPreviewActions');
  });
});
