-- ============================================================
-- Migration: Merge reviews into venues (1 rating per venue)
-- Run this in the Supabase SQL editor
-- ============================================================

-- 1. Remove old review-stats trigger & function
DROP TRIGGER IF EXISTS update_venue_stats_trigger ON reviews;
DROP TRIGGER IF EXISTS trg_update_venue_stats ON reviews;
DROP FUNCTION IF EXISTS update_venue_stats() CASCADE;

-- 2. Add rating + metadata columns to venues
ALTER TABLE venues
  DROP COLUMN IF EXISTS review_count,
  ADD COLUMN IF NOT EXISTS optics    SMALLINT CHECK (optics  BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS crema     SMALLINT CHECK (crema   BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS taste     SMALLINT CHECK (taste   BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS verdict   SMALLINT CHECK (verdict BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS comment   TEXT     CHECK (char_length(comment) <= 500),
  ADD COLUMN IF NOT EXISTS price     DECIMAL(6,2),
  ADD COLUMN IF NOT EXISTS currency  TEXT     DEFAULT 'EUR',
  ADD COLUMN IF NOT EXISTS roastery  TEXT,
  ADD COLUMN IF NOT EXISTS photo_url TEXT,
  ADD COLUMN IF NOT EXISTS rated_at  TIMESTAMPTZ;

-- 3. Trigger: auto-compute avg_score from sub-scores on INSERT/UPDATE
CREATE OR REPLACE FUNCTION compute_venue_avg_score()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.optics  IS NOT NULL AND NEW.crema   IS NOT NULL
     AND NEW.taste IS NOT NULL AND NEW.verdict IS NOT NULL THEN
    NEW.avg_score = ROUND((NEW.optics + NEW.crema + NEW.taste + NEW.verdict) / 4.0, 2);
  ELSE
    NEW.avg_score = NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS compute_venue_avg_score_trigger ON venues;
CREATE TRIGGER compute_venue_avg_score_trigger
  BEFORE INSERT OR UPDATE ON venues
  FOR EACH ROW EXECUTE FUNCTION compute_venue_avg_score();

-- 4. Update RLS: allow authenticated user to update venues
DROP POLICY IF EXISTS "Auth users can update venues" ON venues;
CREATE POLICY "Auth users can update venues"
  ON venues FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 5. Drop reviews table (data is now in venues)
DROP TABLE IF EXISTS reviews CASCADE;

-- Done. avg_score is now auto-computed from optics + crema + taste + verdict.
