import { config } from './index';

describe('config', () => {
  it('exports NODE_ENV', () => {
    expect(config).toHaveProperty('NODE_ENV');
    expect(typeof config.NODE_ENV).toBe('string');
  });

  it('exports ASSETS_URL as string', () => {
    expect(config).toHaveProperty('ASSETS_URL');
    expect(typeof config.ASSETS_URL).toBe('string');
  });

  it('exports APPLICATION_URL as string', () => {
    expect(config).toHaveProperty('APPLICATION_URL');
    expect(typeof config.APPLICATION_URL).toBe('string');
  });

  it('has expected keys only', () => {
    expect(Object.keys(config).sort()).toEqual(
      ['APPLICATION_URL', 'ASSETS_URL', 'NODE_ENV'].sort(),
    );
  });
});
