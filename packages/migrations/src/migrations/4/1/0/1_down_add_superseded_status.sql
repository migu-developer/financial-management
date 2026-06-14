-- Revert the 'superseded' status. Normalize existing rows to 'cancelled'
-- first so the tightened CHECK constraint can be re-applied.

UPDATE financial_management.chat_messages
  SET task_token_status = 'cancelled'
  WHERE task_token_status = 'superseded';

ALTER TABLE financial_management.chat_messages
  DROP CONSTRAINT chk_chat_messages_task_token_status;

ALTER TABLE financial_management.chat_messages
  ADD CONSTRAINT chk_chat_messages_task_token_status
  CHECK (
    task_token_status IS NULL
    OR task_token_status IN ('pending', 'confirmed', 'cancelled', 'expired')
  );
