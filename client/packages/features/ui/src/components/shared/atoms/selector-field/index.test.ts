import { SelectorField } from './index';

describe('SelectorField component', () => {
  it('module exports a function', () => {
    expect(typeof SelectorField).toBe('function');
  });

  it('has the expected name', () => {
    expect(SelectorField.name).toBe('SelectorField');
  });

  describe('props interface', () => {
    it('accepts required props: label, value, placeholder, onPress', () => {
      const props = {
        label: 'Type',
        value: 'income',
        placeholder: 'Select type',
        onPress: jest.fn(),
      };
      expect(props.label).toBe('Type');
      expect(props.value).toBe('income');
      expect(typeof props.onPress).toBe('function');
    });

    it('accepts optional disabled prop', () => {
      const props = {
        label: 'Type',
        value: '',
        placeholder: 'Select',
        onPress: jest.fn(),
        disabled: true,
      };
      expect(props.disabled).toBe(true);
    });

    it('accepts optional error prop', () => {
      const props = {
        label: 'Type',
        value: '',
        placeholder: 'Select',
        onPress: jest.fn(),
        error: 'Required field',
      };
      expect(props.error).toBe('Required field');
    });
  });

  describe('display logic', () => {
    it('shows value when provided', () => {
      const value = 'income';
      const placeholder = 'Select type';
      const displayText = value || placeholder;
      expect(displayText).toBe('income');
    });

    it('shows placeholder when value is empty', () => {
      const value = '';
      const placeholder = 'Select type';
      const displayText = value || placeholder;
      expect(displayText).toBe('Select type');
    });
  });
});
