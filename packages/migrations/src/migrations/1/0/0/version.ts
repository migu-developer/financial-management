import { config, sqlScript } from 'src/lib/version-config';

export default config({
  description: 'Create base schema, tables, functions, triggers and indexes',
  scripts: [sqlScript('1_up_create_base_tables', '1_down_drop_base_tables')],
});
