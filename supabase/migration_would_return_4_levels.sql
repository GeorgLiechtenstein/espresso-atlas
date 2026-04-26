-- Convert would_return from BOOLEAN to SMALLINT (1..4)
--   1 = Jederzeit         / Anytime
--   2 = Wenn's sein muss  / If I must
--   3 = Eher nicht        / Rather not
--   4 = Um Gottes Willen  / God forbid
--
-- Existing values are mapped conservatively:
--   TRUE  -> 2 (a yes, but not enthusiastic)
--   FALSE -> 3 (a no, but not extreme)
-- Adjust per-venue afterwards as desired.

ALTER TABLE venues
  ALTER COLUMN would_return TYPE SMALLINT
  USING (CASE
    WHEN would_return IS TRUE  THEN 2
    WHEN would_return IS FALSE THEN 3
    ELSE NULL
  END);

ALTER TABLE venues
  ADD CONSTRAINT venues_would_return_check
  CHECK (would_return IS NULL OR would_return BETWEEN 1 AND 4);
