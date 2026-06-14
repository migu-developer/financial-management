import { config, sqlScript } from 'src/lib/version-config';

export default config({
  description:
    "Allow 'superseded' as a chat_messages.task_token_status so iterated expense previews supersede the previous one",
  scripts: [
    sqlScript('1_up_add_superseded_status', '1_down_add_superseded_status'),
  ],
});
