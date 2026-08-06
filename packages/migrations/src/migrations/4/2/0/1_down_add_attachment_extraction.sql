-- Reverses 4.2.0.
--
-- Dropping the column discards every stored extraction. That is acceptable
-- precisely because the data is a CACHE of what Textract read: the attachment
-- itself still exists under `chat-ready/` (kept a year by the bucket lifecycle
-- rule), so a rollback degrades the follow-up flow back to its previous
-- behaviour rather than losing anything unrecoverable.

DROP INDEX IF EXISTS financial_management.idx_chat_messages_session_extraction;

ALTER TABLE financial_management.chat_messages
  DROP CONSTRAINT IF EXISTS chk_chat_messages_extraction_needs_attachment;

ALTER TABLE financial_management.chat_messages
  DROP COLUMN IF EXISTS attachment_extraction;
