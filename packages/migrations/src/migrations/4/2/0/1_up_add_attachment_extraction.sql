-- Persist what Textract read from a receipt, on the user message that carried
-- the image.
--
-- WHY THIS EXISTS: reading a receipt is the one irreversible-ish step in the
-- chat flow. The raw upload is deleted after 7 days by a lifecycle rule, an
-- AnalyzeExpense call costs money, and Textract is rate limited (1 TPS for
-- AnalyzeExpense in us-east-2). Before this column the extraction lived only in
-- the Step Functions execution state, so it died with the execution: when a
-- receipt was missing a field, the assistant asked for it and then had nothing
-- left to combine the answer with. The user's reply started a fresh workflow
-- that saw only "COP" and could not complete the expense.
--
-- Storing it makes the extraction conversation CONTEXT: the next turn merges the
-- answer with the fields already read, and the image is never analyzed twice.
--
-- Shape (all keys optional — Textract returns what it can find):
--   { "merchant": "INVERVARI SAS", "total": 251000,
--     "currency": "COP", "date": "2026-08-02", "confidence": 97.7 }
--
-- jsonb (not columns) because this mirrors a third-party response we do not
-- control: Textract adds field types over time, and audio transcripts land here
-- next with a different shape. Nothing queries inside it — it is read by key for
-- one message — so no GIN index is warranted.

ALTER TABLE financial_management.chat_messages
  ADD COLUMN attachment_extraction jsonb;

COMMENT ON COLUMN financial_management.chat_messages.attachment_extraction IS
  'Structured data extracted from attachment_s3_key (Textract for images). Kept so a follow-up turn can complete the expense without re-reading the attachment.';

-- Only a message that HAS an attachment can carry its extraction. Guards
-- against a code path attaching extracted data to a plain text message, which
-- would then be replayed as receipt context for an unrelated expense.
ALTER TABLE financial_management.chat_messages
  ADD CONSTRAINT chk_chat_messages_extraction_needs_attachment
  CHECK (attachment_extraction IS NULL OR attachment_s3_key IS NOT NULL);

-- Finding the extraction to reuse is "latest message in THIS session that has
-- one". Partial index so it stays small: almost every row is NULL here.
CREATE INDEX idx_chat_messages_session_extraction
  ON financial_management.chat_messages (session_id, created_at DESC)
  WHERE attachment_extraction IS NOT NULL;
