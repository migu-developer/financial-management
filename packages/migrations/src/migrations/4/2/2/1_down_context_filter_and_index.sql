-- Reverses 4.2.2, restoring the 4.2.1 index predicate.

DROP INDEX IF EXISTS financial_management.idx_chat_messages_session_extraction;

CREATE INDEX idx_chat_messages_session_extraction
  ON financial_management.chat_messages (session_id, created_at DESC, id DESC)
  WHERE attachment_extraction IS NOT NULL AND expense_id IS NULL;

ALTER TABLE financial_management.chat_messages
  DROP COLUMN IF EXISTS hidden_from_context;
