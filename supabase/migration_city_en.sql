-- Bilingual city storage. The `city` column keeps its current value
-- (whatever the user saved — usually German); `city_en` carries the
-- English variant for venues that were saved or re-saved with the new
-- autocomplete (which now fetches both languages from Nominatim).
--
-- Existing rows: city_en is left NULL on purpose. The frontend falls
-- back to `city` when the EN column is empty, so legacy entries keep
-- showing whatever was originally captured. Re-saving a venue
-- repopulates both columns.

ALTER TABLE venues ADD COLUMN IF NOT EXISTS city_en TEXT;
