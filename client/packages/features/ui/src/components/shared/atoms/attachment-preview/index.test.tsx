import { AttachmentPreview } from '.';

describe('AttachmentPreview', () => {
  it('exports a function component', () => {
    expect(typeof AttachmentPreview).toBe('function');
  });

  it('has the expected name', () => {
    expect(AttachmentPreview.name).toBe('AttachmentPreview');
  });
});
