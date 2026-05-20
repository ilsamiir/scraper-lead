CREATE TABLE email_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES saved_clients(id) ON DELETE CASCADE,
    recipient_email TEXT NOT NULL,
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    provider_message_id TEXT,
    status TEXT NOT NULL CHECK (status IN ('sent', 'failed')),
    source TEXT NOT NULL CHECK (source IN ('manual', 'cron')),
    sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_email_history_client_id ON email_history(client_id);
CREATE INDEX idx_email_history_sent_at ON email_history(sent_at DESC);

ALTER TABLE email_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated internal read email history"
ON email_history FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated internal insert email history"
ON email_history FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated internal update email history"
ON email_history FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Allow authenticated internal delete email history"
ON email_history FOR DELETE TO authenticated USING (true);