-- Allow 'superseded' as a chat_messages.task_token_status.
-- When the user iterates on an expense preview (sends a new message while a
-- preview is still pending), the previous preview's paused Step Functions
-- execution is released and its message is marked 'superseded' so the client
-- shows only the latest preview and no stale execution times out.

ALTER TABLE financial_management.chat_messages
  DROP CONSTRAINT chk_chat_messages_task_token_status;

ALTER TABLE financial_management.chat_messages
  ADD CONSTRAINT chk_chat_messages_task_token_status
  CHECK (
    task_token_status IS NULL
    OR task_token_status IN ('pending', 'confirmed', 'cancelled', 'expired', 'superseded')
  );
