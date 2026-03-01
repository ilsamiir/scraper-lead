-- Add city and province columns
ALTER TABLE leads ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS province TEXT;

-- Drop status column and its index
DROP INDEX IF EXISTS idx_leads_status;
ALTER TABLE leads DROP COLUMN IF EXISTS status;
