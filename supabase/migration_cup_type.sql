-- Replace the boolean ceramic_cup with a richer cup_type text column.
-- Allowed values: 'ceramic', 'glass', 'paper' (plus null for unset).
--
-- Existing data:
--   ceramic_cup = true  -> cup_type = 'ceramic'
--   ceramic_cup = false -> cup_type = NULL  (we never recorded what kind
--                          was used, so leave it open for re-rating)

ALTER TABLE venues ADD COLUMN IF NOT EXISTS cup_type TEXT;

UPDATE venues
SET cup_type = CASE
  WHEN ceramic_cup IS TRUE THEN 'ceramic'
  ELSE NULL
END
WHERE cup_type IS NULL;

ALTER TABLE venues
  ADD CONSTRAINT venues_cup_type_check
  CHECK (cup_type IS NULL OR cup_type IN ('ceramic', 'glass', 'paper'));

ALTER TABLE venues DROP COLUMN IF EXISTS ceramic_cup;
