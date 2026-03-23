import { config, sqlScript } from 'src/lib/version-config';

export default config({
  description: 'Add composite indexes for expenses query performance',
  scripts: [
    sqlScript('1_up_add_composite_indexes', '1_down_drop_composite_indexes'),
  ],
});
