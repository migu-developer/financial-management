-- ══════════════════════════════════════════════════════════════════════
-- Chat sessions: groups messages for a single user conversation
-- ══════════════════════════════════════════════════════════════════════

CREATE TABLE financial_management.chat_sessions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES financial_management.users(id) ON DELETE CASCADE,
  started_at      timestamptz NOT NULL DEFAULT now(),
  last_message_at timestamptz NOT NULL DEFAULT now(),
  metadata        jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  created_by      varchar(255),
  modified_by     varchar(255)
);

-- ══════════════════════════════════════════════════════════════════════
-- Chat messages: individual messages within a session
--
-- task_token / task_token_status support the human-in-the-loop pattern:
-- when the Step Function generates an expense preview, it stores the
-- task token in the assistant message so the client can send it back
-- on /chat/confirm to resume the workflow.
-- ══════════════════════════════════════════════════════════════════════

CREATE TABLE financial_management.chat_messages (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id         uuid NOT NULL REFERENCES financial_management.chat_sessions(id) ON DELETE CASCADE,
  role               varchar(20) NOT NULL,
  content            text NOT NULL,
  attachment_s3_key  text,
  attachment_type    varchar(10),
  expense_id         uuid REFERENCES financial_management.expenses(id) ON DELETE SET NULL,
  task_token         text,
  task_token_status  varchar(20),
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  created_by         varchar(255),
  modified_by        varchar(255),
  CONSTRAINT chk_chat_messages_role
    CHECK (role IN ('user', 'assistant', 'system')),
  CONSTRAINT chk_chat_messages_attachment_type
    CHECK (attachment_type IS NULL OR attachment_type IN ('image', 'audio')),
  CONSTRAINT chk_chat_messages_task_token_status
    CHECK (task_token_status IS NULL OR task_token_status IN ('pending', 'confirmed', 'cancelled', 'expired'))
);

-- ══════════════════════════════════════════════════════════════════════
-- Índices
-- ══════════════════════════════════════════════════════════════════════

-- Sessions by user, most recent activity first
CREATE INDEX idx_chat_sessions_user_last_message
  ON financial_management.chat_sessions (user_id, last_message_at DESC);

-- Messages by session in chronological order
CREATE INDEX idx_chat_messages_session_created
  ON financial_management.chat_messages (session_id, created_at);

-- Lookup pending task tokens (partial index — only rows awaiting human confirmation)
CREATE INDEX idx_chat_messages_pending_task_token
  ON financial_management.chat_messages (task_token)
  WHERE task_token IS NOT NULL AND task_token_status = 'pending';

-- ══════════════════════════════════════════════════════════════════════
-- Triggers: auto-update updated_at + audit logging
-- (fn_set_updated_at and fn_audit_log defined in migration 2.0.0)
-- ══════════════════════════════════════════════════════════════════════

CREATE TRIGGER trg_chat_sessions_updated_at
  BEFORE UPDATE ON financial_management.chat_sessions
  FOR EACH ROW EXECUTE FUNCTION financial_management.fn_set_updated_at();

CREATE TRIGGER trg_chat_messages_updated_at
  BEFORE UPDATE ON financial_management.chat_messages
  FOR EACH ROW EXECUTE FUNCTION financial_management.fn_set_updated_at();

CREATE TRIGGER trg_chat_sessions_audit
  AFTER INSERT OR UPDATE OR DELETE ON financial_management.chat_sessions
  FOR EACH ROW EXECUTE FUNCTION financial_management.fn_audit_log();

CREATE TRIGGER trg_chat_messages_audit
  AFTER INSERT OR UPDATE OR DELETE ON financial_management.chat_messages
  FOR EACH ROW EXECUTE FUNCTION financial_management.fn_audit_log();

-- ══════════════════════════════════════════════════════════════════════
-- Row Level Security
-- ══════════════════════════════════════════════════════════════════════

ALTER TABLE financial_management.chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_management.chat_messages ENABLE ROW LEVEL SECURITY;

-- ══════════════════════════════════════════════════════════════════════
-- Grants: readonly_lambda_role (direct pg access, no JWT)
-- ══════════════════════════════════════════════════════════════════════

GRANT SELECT ON financial_management.chat_sessions TO readonly_lambda_role;
GRANT SELECT ON financial_management.chat_messages TO readonly_lambda_role;

-- ══════════════════════════════════════════════════════════════════════
-- RLS policies: readonly_lambda_role
-- ══════════════════════════════════════════════════════════════════════

CREATE POLICY readonly_select ON financial_management.chat_sessions
  FOR SELECT TO readonly_lambda_role USING (true);

CREATE POLICY readonly_select ON financial_management.chat_messages
  FOR SELECT TO readonly_lambda_role USING (true);

-- ══════════════════════════════════════════════════════════════════════
-- RLS policies: authenticated role (Supabase PostgREST / API access)
-- Each user can only see and manage their own chat sessions and messages.
-- ══════════════════════════════════════════════════════════════════════

-- chat_sessions: scoped to the owning user
CREATE POLICY authenticated_select ON financial_management.chat_sessions
  FOR SELECT TO authenticated
  USING (
    user_id = (SELECT id FROM financial_management.users WHERE uid = auth.uid())
  );

CREATE POLICY authenticated_insert ON financial_management.chat_sessions
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = (SELECT id FROM financial_management.users WHERE uid = auth.uid())
  );

CREATE POLICY authenticated_update ON financial_management.chat_sessions
  FOR UPDATE TO authenticated
  USING (
    user_id = (SELECT id FROM financial_management.users WHERE uid = auth.uid())
  );

CREATE POLICY authenticated_delete ON financial_management.chat_sessions
  FOR DELETE TO authenticated
  USING (
    user_id = (SELECT id FROM financial_management.users WHERE uid = auth.uid())
  );

-- chat_messages: scoped through the parent session's owner
CREATE POLICY authenticated_select ON financial_management.chat_messages
  FOR SELECT TO authenticated
  USING (
    session_id IN (
      SELECT id FROM financial_management.chat_sessions
      WHERE user_id = (SELECT id FROM financial_management.users WHERE uid = auth.uid())
    )
  );

CREATE POLICY authenticated_insert ON financial_management.chat_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    session_id IN (
      SELECT id FROM financial_management.chat_sessions
      WHERE user_id = (SELECT id FROM financial_management.users WHERE uid = auth.uid())
    )
  );

CREATE POLICY authenticated_update ON financial_management.chat_messages
  FOR UPDATE TO authenticated
  USING (
    session_id IN (
      SELECT id FROM financial_management.chat_sessions
      WHERE user_id = (SELECT id FROM financial_management.users WHERE uid = auth.uid())
    )
  );

CREATE POLICY authenticated_delete ON financial_management.chat_messages
  FOR DELETE TO authenticated
  USING (
    session_id IN (
      SELECT id FROM financial_management.chat_sessions
      WHERE user_id = (SELECT id FROM financial_management.users WHERE uid = auth.uid())
    )
  );
