-- Align the extraction index with the ONLY query that reads it.
--
-- 4.2.0 created it as `(session_id, created_at DESC) WHERE attachment_extraction
-- IS NOT NULL`, but `findLatestUnusedExtraction` also filters
-- `expense_id IS NULL` and orders by `created_at DESC, id DESC`. So Postgres had
-- to recheck `expense_id` from the heap and could not satisfy the tiebreaker
-- from the index.
--
-- A separate migration rather than an edit to 4.2.0 because that version is
-- already applied to both databases; rewriting applied SQL would leave their
-- checksums disagreeing with the file.
--
-- Adding `expense_id IS NULL` to the PREDICATE also shrinks the index over time:
-- once a receipt has produced an expense it is retired from replay, so the row
-- drops out of the index entirely.

DROP INDEX IF EXISTS financial_management.idx_chat_messages_session_extraction;

CREATE INDEX idx_chat_messages_session_extraction
  ON financial_management.chat_messages (session_id, created_at DESC, id DESC)
  WHERE attachment_extraction IS NOT NULL AND expense_id IS NULL;
