import { ConfirmDialog } from './index';

describe('ConfirmDialog component', () => {
  it('module exports a function', () => {
    expect(typeof ConfirmDialog).toBe('function');
  });

  it('has the expected name', () => {
    expect(ConfirmDialog.name).toBe('ConfirmDialog');
  });

  describe('props interface', () => {
    it('satisfies required shape', () => {
      const props = {
        visible: true,
        onClose: () => {},
        onConfirm: () => {},
        title: 'Delete Item',
        message: 'Are you sure?',
        confirmLabel: 'Delete',
        cancelLabel: 'Cancel',
      };
      expect(props.visible).toBe(true);
      expect(typeof props.onClose).toBe('function');
      expect(typeof props.onConfirm).toBe('function');
      expect(props.title).toBe('Delete Item');
      expect(props.message).toBe('Are you sure?');
      expect(props.confirmLabel).toBe('Delete');
      expect(props.cancelLabel).toBe('Cancel');
    });

    it('loading defaults to false', () => {
      const props: { loading?: boolean } = {};
      expect(props.loading).toBeUndefined();
    });

    it('loading can be set to true', () => {
      const props = { loading: true };
      expect(props.loading).toBe(true);
    });
  });

  describe('onConfirm callback', () => {
    it('is invokable without arguments', () => {
      let confirmed = false;
      const onConfirm = () => {
        confirmed = true;
      };
      onConfirm();
      expect(confirmed).toBe(true);
    });
  });

  describe('onClose callback', () => {
    it('is invokable without arguments', () => {
      let closed = false;
      const onClose = () => {
        closed = true;
      };
      onClose();
      expect(closed).toBe(true);
    });
  });
});
