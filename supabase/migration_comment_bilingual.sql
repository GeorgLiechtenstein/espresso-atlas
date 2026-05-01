-- Bilingual comments: store the original alongside an automatic
-- translation. The legacy single `comment` column stays as a safety
-- fallback for any rows the user hasn't re-saved yet.

ALTER TABLE venues ADD COLUMN IF NOT EXISTS comment_de TEXT;
ALTER TABLE venues ADD COLUMN IF NOT EXISTS comment_en TEXT;

-- Existing comments are assumed to be in German (primary author lang).
-- Re-saving a venue triggers a fresh translation pair, so this seed is
-- temporary. Don't overwrite a value that's already in comment_de.
UPDATE venues
SET comment_de = comment
WHERE comment IS NOT NULL
  AND comment_de IS NULL
  AND comment_en IS NULL;
