import { SelectableOption } from './index';
import type { SelectableOptionProps } from './index';

describe('SelectableOption', () => {
  it('exports SelectableOption as a function', () => {
    expect(SelectableOption).toBeDefined();
    expect(typeof SelectableOption).toBe('function');
  });

  it('exports SelectableOptionProps type', () => {
    const props: SelectableOptionProps = {
      selected: false,
      selectedIcon: 'checkbox-marked',
      unselectedIcon: 'checkbox-blank-outline',
      onPress: () => {},
      children: null,
    };
    expect(props.selected).toBe(false);
    expect(props.selectedIcon).toBe('checkbox-marked');
    expect(props.unselectedIcon).toBe('checkbox-blank-outline');
  });
});
