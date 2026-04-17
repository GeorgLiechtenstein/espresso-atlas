-- ============================================================
-- Migration: Rename rating columns + add ceramic_cup
-- Run this in the Supabase SQL editor
-- ============================================================

-- 1. Rename sub-score columns to new names
ALTER TABLE venues RENAME COLUMN optics  TO body;
ALTER TABLE venues RENAME COLUMN taste   TO balance;
ALTER TABLE venues RENAME COLUMN verdict TO overall;

-- 2. Add ceramic_cup boolean (optional, does NOT affect score)
ALTER TABLE venues ADD COLUMN IF NOT EXISTS ceramic_cup BOOLEAN;

-- 3. Replace avg_score trigger function to use new column names
CREATE OR REPLACE FUNCTION compute_venue_avg_score()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.body    IS NOT NULL AND NEW.balance IS NOT NULL
     AND NEW.crema IS NOT NULL AND NEW.overall IS NOT NULL THEN
    NEW.avg_score = ROUND((NEW.body + NEW.balance + NEW.crema + NEW.overall) / 4.0, 2);
  ELSE
    NEW.avg_score = NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
-- Note: trigger compute_venue_avg_score_trigger already exists on venues,
-- so only the function body needs to be replaced (CREATE OR REPLACE covers this).

-- Done. Columns renamed: optics→body, taste→balance, verdict→overall. ceramic_cup added.
