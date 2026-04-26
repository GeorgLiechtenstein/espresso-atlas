-- Convert balance from 1..10 (higher = better balanced) to a -5..+5
-- spectrum where 0 means perfectly balanced, negative is acidic,
-- positive is bitter.
--
-- Existing values (no direction info) are mapped to a "slightly to too
-- bitter" default — bitterness is the more common espresso fault, and the
-- user can re-rate per venue afterwards.
--
-- avg_score formula stays out of 10: balance contributes (10 - 2*|balance|).
--
-- Run this once in the Supabase SQL editor.

-- 1. Drop the old 1..10 CHECK on balance.
ALTER TABLE venues DROP CONSTRAINT IF EXISTS venues_balance_check;

-- 2. Re-map existing values:
--      old 9..10 -> 0 (balanced)
--      old 7..8  -> 1
--      old 5..6  -> 2
--      old 3..4  -> 3
--      old 1..2  -> 5 (extreme — adjust per venue)
UPDATE venues
SET balance = CASE
  WHEN balance >= 9 THEN 0
  WHEN balance >= 7 THEN 1
  WHEN balance >= 5 THEN 2
  WHEN balance >= 3 THEN 3
  ELSE 5
END
WHERE balance IS NOT NULL;

-- 3. Add the new CHECK.
ALTER TABLE venues
  ADD CONSTRAINT venues_balance_check
  CHECK (balance IS NULL OR balance BETWEEN -5 AND 5);

-- 4. Replace avg_score trigger to convert balance back to a 0..10 score.
CREATE OR REPLACE FUNCTION compute_venue_avg_score()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.body IS NOT NULL AND NEW.balance IS NOT NULL AND NEW.crema IS NOT NULL THEN
    NEW.avg_score = ROUND(
      (NEW.body + (10 - 2 * ABS(NEW.balance)) + NEW.crema) / 3.0,
      1
    );
  ELSE
    NEW.avg_score = NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Recompute avg_score for existing rows.
UPDATE venues
SET avg_score = ROUND((body + (10 - 2 * ABS(balance)) + crema) / 3.0, 1)
WHERE body IS NOT NULL AND balance IS NOT NULL AND crema IS NOT NULL;
