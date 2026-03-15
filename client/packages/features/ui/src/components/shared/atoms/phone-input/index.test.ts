import { PhoneInput } from './index';
import type { PhoneInputProps } from './index';

describe('PhoneInput', () => {
  it('exports a function', () => {
    expect(typeof PhoneInput).toBe('function');
  });

  it('has the expected name', () => {
    expect(PhoneInput.name).toBe('PhoneInput');
  });

  it('exports PhoneInputProps type', () => {
    const props: PhoneInputProps = {
      value: '',
      onChange: () => {},
    };
    expect(props.value).toBe('');
  });
});
