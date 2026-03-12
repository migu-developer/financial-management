import { TextInputBase } from './index';
import type { TextInputBaseProps } from './index';

describe('TextInputBase', () => {
  it('exports TextInputBase as a function', () => {
    expect(TextInputBase).toBeDefined();
    expect(typeof TextInputBase).toBe('object'); // forwardRef returns an object
  });

  it('has a displayName', () => {
    expect(TextInputBase.displayName).toBe('TextInputBase');
  });

  it('exports TextInputBaseProps type', () => {
    const props: TextInputBaseProps = {
      value: 'test',
      onChangeText: () => {},
      error: false,
    };
    expect(props.value).toBe('test');
  });
});
