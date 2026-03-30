-- ENUM for background scraping status
CREATE TYPE enrichment_status AS ENUM ('pending', 'processing', 'completed', 'failed', 'not_applicable');

-- Core LEADS table
CREATE TABLE leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    search_keyword TEXT NOT NULL,
    search_location TEXT NOT NULL,
    business_name TEXT NOT NULL,
    address TEXT,
    phone TEXT,
    website TEXT,
    google_maps_url TEXT,
    email TEXT,
    status enrichment_status DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Optional deduplication configuration
    UNIQUE(business_name, address)
);

-- Index for efficient querying and pagination
CREATE INDEX idx_leads_created_at ON leads(created_at DESC);
CREATE INDEX idx_leads_status ON leads(status);

-- RLS Policies
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated internal read" ON leads FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated internal insert" ON leads FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated internal update" ON leads FOR UPDATE TO authenticated USING (true);
