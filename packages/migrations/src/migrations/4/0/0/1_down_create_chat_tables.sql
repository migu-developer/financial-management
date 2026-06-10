-- Drop chat_messages first (depends on chat_sessions via FK).
-- Triggers, indexes, RLS policies and grants are dropped automatically
-- when the table is dropped.
DROP TABLE IF EXISTS financial_management.chat_messages;
DROP TABLE IF EXISTS financial_management.chat_sessions;
