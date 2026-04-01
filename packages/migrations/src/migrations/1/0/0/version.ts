import { config, tsScript } from 'src/lib/version-config';

export default config({
  description: 'Create read-only role and user for Lambda access',
  scripts: [tsScript('readonly-role.migration')],
});
