import { Modal } from './index';
import type { ModalProps } from './index';

describe('Modal component', () => {
  it('module exports a function', () => {
    expect(typeof Modal).toBe('function');
  });

  it('has the expected name', () => {
    expect(Modal.name).toBe('Modal');
  });

  describe('ModalProps interface', () => {
    it('satisfies required shape: visible, onClose, title, children', () => {
      const props: ModalProps = {
        visible: true,
        onClose: () => {},
        title: 'Test Modal',
        children: null,
      };
      expect(props.visible).toBe(true);
      expect(typeof props.onClose).toBe('function');
      expect(props.title).toBe('Test Modal');
    });

    it('visible can be false to hide the modal', () => {
      const props: ModalProps = {
        visible: false,
        onClose: () => {},
        title: 'Hidden',
        children: null,
      };
      expect(props.visible).toBe(false);
    });

    it('accepts optional closeAccessibilityLabel', () => {
      const props: ModalProps = {
        visible: true,
        onClose: () => {},
        title: 'Accessible Modal',
        children: null,
        closeAccessibilityLabel: 'Close dialog',
      };
      expect(props.closeAccessibilityLabel).toBe('Close dialog');
    });

    it('closeAccessibilityLabel can be omitted', () => {
      const props: ModalProps = {
        visible: true,
        onClose: () => {},
        title: 'Modal',
        children: null,
      };
      expect(props.closeAccessibilityLabel).toBeUndefined();
    });
  });

  describe('onClose callback', () => {
    it('is invokable without arguments', () => {
      let called = false;
      const props: ModalProps = {
        visible: true,
        onClose: () => {
          called = true;
        },
        title: 'T',
        children: null,
      };
      props.onClose();
      expect(called).toBe(true);
    });
  });
});
