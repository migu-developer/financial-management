import { FloatingActionButton } from '.';

describe('FloatingActionButton', () => {
  it('exports a function component', () => {
    expect(typeof FloatingActionButton).toBe('function');
  });

  it('has the expected name', () => {
    expect(FloatingActionButton.name).toBe('FloatingActionButton');
  });
});
