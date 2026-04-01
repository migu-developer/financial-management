import { sqlScript, tsScript, seedScript, config } from './version-config';

describe('version-config helpers', () => {
  describe('sqlScript', () => {
    it('returns a sql ScriptEntry', () => {
      const entry = sqlScript('1_up_create', '1_down_drop');
      expect(entry).toEqual({
        type: 'sql',
        up: '1_up_create',
        down: '1_down_drop',
      });
    });
  });

  describe('tsScript', () => {
    it('returns a ts ScriptEntry', () => {
      const entry = tsScript('1_migrate_data');
      expect(entry).toEqual({ type: 'ts', path: '1_migrate_data' });
    });
  });

  describe('seedScript', () => {
    it('returns a seed ScriptEntry', () => {
      const entry = seedScript('1_up_seed', '1_down_seed');
      expect(entry).toEqual({
        type: 'seed',
        up: '1_up_seed',
        down: '1_down_seed',
      });
    });
  });

  describe('config', () => {
    it('returns the VersionConfig object as-is', () => {
      const result = config({
        description: 'Create tables',
        scripts: [sqlScript('up', 'down')],
      });
      expect(result.description).toBe('Create tables');
      expect(result.scripts).toHaveLength(1);
      expect(result.scripts[0]!.type).toBe('sql');
    });
  });
});
