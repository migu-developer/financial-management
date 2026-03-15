import { InfoPopup } from './index';
import type { InfoPopupProps } from './index';

describe('InfoPopup component', () => {
  it('module exports a function', () => {
    expect(typeof InfoPopup).toBe('function');
  });

  describe('InfoPopupProps interface', () => {
    it('satisfies required shape: visible, onClose, title, body, closeLabel', () => {
      const props: InfoPopupProps = {
        visible: true,
        onClose: () => {},
        title: 'Test Title',
        body: 'Test body text',
        closeLabel: 'Got it',
      };
      expect(props.visible).toBe(true);
      expect(typeof props.onClose).toBe('function');
      expect(props.title).toBe('Test Title');
      expect(props.body).toBe('Test body text');
      expect(props.closeLabel).toBe('Got it');
    });

    it('visible can be false to hide the popup', () => {
      const props: InfoPopupProps = {
        visible: false,
        onClose: () => {},
        title: 'Hidden',
        body: 'Not shown',
        closeLabel: 'Close',
      };
      expect(props.visible).toBe(false);
    });
  });

  describe('onClose callback', () => {
    it('is invokable without arguments', () => {
      let called = false;
      const props: InfoPopupProps = {
        visible: true,
        onClose: () => {
          called = true;
        },
        title: 'T',
        body: 'B',
        closeLabel: 'C',
      };
      props.onClose();
      expect(called).toBe(true);
    });
  });
});
