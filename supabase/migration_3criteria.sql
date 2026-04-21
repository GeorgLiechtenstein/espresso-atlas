-- Remove overall column, recalculate avg_score from 3 criteria
ALTER TABLE venues DROP COLUMN IF EXISTS overall;

CREATE OR REPLACE FUNCTION compute_venue_avg_score()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.body IS NOT NULL AND NEW.balance IS NOT NULL AND NEW.crema IS NOT NULL THEN
    NEW.avg_score = ROUND((NEW.body + NEW.balance + NEW.crema) / 3.0, 1);
  ELSE
    NEW.avg_score = NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recalculate existing rows
UPDATE venues
SET avg_score = ROUND((body + balance + crema) / 3.0, 1)
WHERE body IS NOT NULL AND balance IS NOT NULL AND crema IS NOT NULL;
