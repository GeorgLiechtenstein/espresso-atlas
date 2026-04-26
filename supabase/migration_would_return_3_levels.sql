-- Collapse would_return from 4 levels (1..4) to 3 levels (1..3).
--   1 = Jederzeit         / Anytime
--   2 = Geht so           / So-so
--   3 = Um Gottes Willen  / God forbid
--
-- Existing values:
--   old 1   -> 1 (Jederzeit stays)
--   old 2   -> 2 (Wenn's sein muss → Geht so)
--   old 3   -> 2 (Eher nicht       → Geht so)
--   old 4   -> 3 (Um Gottes Willen stays)
--
-- Run this once in the Supabase SQL editor.

ALTER TABLE venues DROP CONSTRAINT IF EXISTS venues_would_return_check;

UPDATE venues
SET would_return = CASE
  WHEN would_return IN (2, 3) THEN 2
  WHEN would_return = 4       THEN 3
  ELSE would_return
END
WHERE would_return IS NOT NULL;

ALTER TABLE venues
  ADD CONSTRAINT venues_would_return_check
  CHECK (would_return IS NULL OR would_return BETWEEN 1 AND 3);
