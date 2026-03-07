import { Card } from './index';

describe('Card atom', () => {
  it('exports a function', () => {
    expect(typeof Card).toBe('function');
  });

  it('has the expected name', () => {
    expect(Card.name).toBe('Card');
  });
});
