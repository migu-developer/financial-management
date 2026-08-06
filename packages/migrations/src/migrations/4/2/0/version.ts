import { config, sqlScript } from 'src/lib/version-config';

export default config({
  description:
    'Add chat_messages.attachment_extraction so receipt data read by Textract survives the execution and a follow-up turn can complete the expense without re-reading the image',
  scripts: [
    sqlScript(
      '1_up_add_attachment_extraction',
      '1_down_add_attachment_extraction',
    ),
  ],
});
