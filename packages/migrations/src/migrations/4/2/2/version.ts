import { config, sqlScript } from 'src/lib/version-config';

export default config({
  description:
    'Add chat_messages.hidden_from_context to keep error/unknown replies out of the LLM transcript, and widen the extraction index so the corrected lookup can see already-used rows',
  scripts: [
    sqlScript(
      '1_up_context_filter_and_index',
      '1_down_context_filter_and_index',
    ),
  ],
});
