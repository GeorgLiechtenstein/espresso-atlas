-- Add would_return boolean column (explicit user choice, separate from overall score)
ALTER TABLE venues ADD COLUMN IF NOT EXISTS would_return BOOLEAN;

-- Backfill from existing overall scores (overall >= 7 → would return)
UPDATE venues
SET would_return = (overall >= 7)
WHERE overall IS NOT NULL AND would_return IS NULL;
