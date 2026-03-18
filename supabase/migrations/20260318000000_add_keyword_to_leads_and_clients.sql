-- Add keyword column to leads table
ALTER TABLE leads ADD COLUMN IF NOT EXISTS keyword TEXT;

-- Add keyword column to saved_clients table
ALTER TABLE saved_clients ADD COLUMN IF NOT EXISTS keyword TEXT;

-- Update existing leads if search_keyword exists (backfill)
UPDATE leads SET keyword = search_keyword WHERE keyword IS NULL AND search_keyword IS NOT NULL;
