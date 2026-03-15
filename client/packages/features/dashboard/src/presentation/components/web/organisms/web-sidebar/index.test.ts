import { WebSidebar } from './index';

describe('WebSidebar', () => {
  it('exports a function', () => {
    expect(typeof WebSidebar).toBe('function');
  });

  it('has the expected name', () => {
    expect(WebSidebar.name).toBe('WebSidebar');
  });
});
