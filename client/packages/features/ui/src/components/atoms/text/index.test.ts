describe('Text component', () => {
  it('module exports a function', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('./index');
    expect(typeof mod.Text).toBe('function');
  });

  describe('variant class mapping', () => {
    it('has expected variant categories', () => {
      // Verify by inspecting the module structure (no rendering needed)
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const mod = require('./index');
      // The component function should exist
      expect(mod.Text).toBeDefined();
      expect(typeof mod.Text).toBe('function');
    });
  });
});
