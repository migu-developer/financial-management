import { config, seedScript } from 'src/lib/version-config';

export default config({
  description:
    'Seed initial catalog data (currencies, expense types, providers, documents)',
  scripts: [seedScript('1_up_seed_data', '1_down_seed_data')],
});
