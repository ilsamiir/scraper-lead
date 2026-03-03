CREATE TABLE contact_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES saved_clients(id) ON DELETE CASCADE,
    contact_method TEXT NOT NULL,
    contact_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for efficient fetching of history logs per client
CREATE INDEX idx_contact_history_client_id ON contact_history(client_id);
CREATE INDEX idx_contact_history_date ON contact_history(contact_date DESC);

-- RLS Policies
ALTER TABLE contact_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated internal read" ON contact_history FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated internal insert" ON contact_history FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated internal update" ON contact_history FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow authenticated internal delete" ON contact_history FOR DELETE TO authenticated USING (true);
