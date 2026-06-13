import { config, sqlScript } from 'src/lib/version-config';

export default config({
  description:
    'Create chat_sessions and chat_messages tables for the AI chat module, with RLS policies and human-in-the-loop task token support',
  scripts: [sqlScript('1_up_create_chat_tables', '1_down_create_chat_tables')],
});
