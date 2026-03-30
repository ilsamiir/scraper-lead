CREATE TABLE saved_clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_name TEXT NOT NULL,
    city TEXT,
    province TEXT,
    address TEXT,
    phone TEXT,
    website TEXT,
    google_maps_url TEXT,
    email TEXT,
    last_contact_method TEXT,
    last_contact_date TIMESTAMPTZ,
    follow_up_date DATE,
    status TEXT DEFAULT 'Da contattare',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for efficient querying by follow_up_date
CREATE INDEX idx_saved_clients_follow_up_date ON saved_clients(follow_up_date);

-- RLS Policies
ALTER TABLE saved_clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated internal read" ON saved_clients FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated internal insert" ON saved_clients FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated internal update" ON saved_clients FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow authenticated internal delete" ON saved_clients FOR DELETE TO authenticated USING (true);
