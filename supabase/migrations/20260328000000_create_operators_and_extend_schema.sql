-- ============================================================
-- Fase 1: Tabella operators + estensione saved_clients e contact_history
-- ============================================================

-- Tabella operatori
CREATE TABLE operators (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT UNIQUE,
    role TEXT DEFAULT 'operatore',
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_operators_active ON operators(active);

ALTER TABLE operators ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated read operators" ON operators FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert operators" ON operators FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update operators" ON operators FOR UPDATE TO authenticated USING (true);

-- Estensione saved_clients: settore, fatturato, presenza digitale, operatore
ALTER TABLE saved_clients
    ADD COLUMN IF NOT EXISTS sector TEXT,
    ADD COLUMN IF NOT EXISTS estimated_revenue TEXT,
    ADD COLUMN IF NOT EXISTS employee_count TEXT,
    ADD COLUMN IF NOT EXISTS has_website BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS digital_score INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS operator_id UUID REFERENCES operators(id),
    ADD COLUMN IF NOT EXISTS converted_value NUMERIC(12, 2),
    ADD COLUMN IF NOT EXISTS converted_at TIMESTAMPTZ;

CREATE INDEX idx_saved_clients_operator ON saved_clients(operator_id);
CREATE INDEX idx_saved_clients_sector ON saved_clients(sector);
CREATE INDEX idx_saved_clients_status ON saved_clients(status);

-- Estensione contact_history: operatore che ha effettuato il contatto
ALTER TABLE contact_history
    ADD COLUMN IF NOT EXISTS operator_id UUID REFERENCES operators(id);

CREATE INDEX idx_contact_history_operator ON contact_history(operator_id);
