-- Restores the 4.2.0 shape of the index.

DROP INDEX IF EXISTS financial_management.idx_chat_messages_session_extraction;

CREATE INDEX idx_chat_messages_session_extraction
  ON financial_management.chat_messages (session_id, created_at DESC)
  WHERE attachment_extraction IS NOT NULL;
