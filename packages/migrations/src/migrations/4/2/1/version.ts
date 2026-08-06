import { config, sqlScript } from 'src/lib/version-config';

export default config({
  description:
    'Align idx_chat_messages_session_extraction with findLatestUnusedExtraction: add expense_id IS NULL to the partial predicate and id DESC to the keys',
  scripts: [
    sqlScript('1_up_align_extraction_index', '1_down_align_extraction_index'),
  ],
});
