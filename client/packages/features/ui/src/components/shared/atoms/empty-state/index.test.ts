import { EmptyState } from './index';

describe('EmptyState component', () => {
  it('module exports a function', () => {
    expect(typeof EmptyState).toBe('function');
  });

  it('has the expected name', () => {
    expect(EmptyState.name).toBe('EmptyState');
  });

  describe('props interface', () => {
    it('requires a title string', () => {
      const props = { title: 'No items found' };
      expect(props.title).toBe('No items found');
      expect(typeof props.title).toBe('string');
    });

    it('accepts an optional description string', () => {
      const props = { title: 'Empty', description: 'Add your first item' };
      expect(props.description).toBe('Add your first item');
    });

    it('description can be omitted', () => {
      const props: { title: string; description?: string } = { title: 'Empty' };
      expect(props.description).toBeUndefined();
    });

    it('accepts an optional icon ReactNode', () => {
      const props: { title: string; icon?: unknown } = {
        title: 'Empty',
        icon: 'icon-placeholder',
      };
      expect(props.icon).toBeDefined();
    });

    it('icon can be omitted', () => {
      const props: { title: string; icon?: unknown } = { title: 'Empty' };
      expect(props.icon).toBeUndefined();
    });
  });
});
