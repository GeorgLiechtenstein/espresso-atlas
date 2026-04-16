-- =============================================================================
-- EspressoMap – Supabase Schema
-- =============================================================================
-- ORDER TO RUN:
--   1. Run this entire file once in the Supabase SQL Editor.
--   2. The script is idempotent (uses IF NOT EXISTS / OR REPLACE where possible).
--   3. After running, go to Storage → Create bucket "review-photos" (public=true)
--      OR the CREATE POLICY statements at the bottom will handle RLS once the
--      bucket exists (create it manually via the dashboard or via the Storage API).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- EXTENSIONS
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "pgcrypto";   -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pg_trgm";    -- trigram full-text search

-- ---------------------------------------------------------------------------
-- TABLES
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.venues (
  id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT          NOT NULL,
  city          TEXT          NOT NULL,
  country       TEXT          NOT NULL,
  lat           DECIMAL(10,7) NOT NULL,
  lng           DECIMAL(10,7) NOT NULL,
  avg_score     DECIMAL(3,2)  DEFAULT NULL,
  review_count  INTEGER       DEFAULT 0,
  created_at    TIMESTAMPTZ   DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.reviews (
  id          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id    UUID          NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  user_id     UUID          NOT NULL REFERENCES auth.users(id),
  optics      INTEGER       NOT NULL CHECK (optics  BETWEEN 1 AND 5),
  taste       INTEGER       NOT NULL CHECK (taste   BETWEEN 1 AND 5),
  verdict     INTEGER       NOT NULL CHECK (verdict BETWEEN 1 AND 5),
  avg_score   DECIMAL(3,2)  GENERATED ALWAYS AS (ROUND((optics + taste + verdict) / 3.0, 2)) STORED,
  comment     TEXT          CHECK (comment IS NULL OR char_length(comment) <= 300),
  photo_url   TEXT,
  price       DECIMAL(8,2),
  currency    TEXT          DEFAULT 'EUR',
  created_at  TIMESTAMPTZ   DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- INDEXES
-- ---------------------------------------------------------------------------

-- Geo queries
CREATE INDEX IF NOT EXISTS venues_lat_idx ON public.venues (lat);
CREATE INDEX IF NOT EXISTS venues_lng_idx ON public.venues (lng);
CREATE INDEX IF NOT EXISTS venues_lat_lng_idx ON public.venues (lat, lng);

-- Full-text / trigram search on venues
CREATE INDEX IF NOT EXISTS venues_name_trgm_idx    ON public.venues USING gin (name    gin_trgm_ops);
CREATE INDEX IF NOT EXISTS venues_city_trgm_idx    ON public.venues USING gin (city    gin_trgm_ops);
CREATE INDEX IF NOT EXISTS venues_country_trgm_idx ON public.venues USING gin (country gin_trgm_ops);

-- Reviews lookup
CREATE INDEX IF NOT EXISTS reviews_venue_id_idx    ON public.reviews (venue_id);
CREATE INDEX IF NOT EXISTS reviews_created_at_idx  ON public.reviews (created_at DESC);
CREATE INDEX IF NOT EXISTS reviews_user_id_idx     ON public.reviews (user_id);

-- ---------------------------------------------------------------------------
-- TRIGGER: keep venues.avg_score + venues.review_count in sync
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.update_venue_stats()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_id UUID;
BEGIN
  -- Determine which venue_id to update
  IF TG_OP = 'DELETE' THEN
    v_id := OLD.venue_id;
  ELSE
    v_id := NEW.venue_id;
  END IF;

  UPDATE public.venues
  SET
    avg_score    = (
      SELECT ROUND(AVG(avg_score)::NUMERIC, 2)
      FROM public.reviews
      WHERE venue_id = v_id
    ),
    review_count = (
      SELECT COUNT(*)
      FROM public.reviews
      WHERE venue_id = v_id
    )
  WHERE id = v_id;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_update_venue_stats ON public.reviews;

CREATE TRIGGER trg_update_venue_stats
AFTER INSERT OR UPDATE OR DELETE ON public.reviews
FOR EACH ROW EXECUTE FUNCTION public.update_venue_stats();

-- ---------------------------------------------------------------------------
-- ROW LEVEL SECURITY
-- ---------------------------------------------------------------------------

ALTER TABLE public.venues  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Venues: read = everyone, write = authenticated users
DROP POLICY IF EXISTS "venues_select_public"        ON public.venues;
DROP POLICY IF EXISTS "venues_insert_authenticated" ON public.venues;
DROP POLICY IF EXISTS "venues_update_authenticated" ON public.venues;

CREATE POLICY "venues_select_public"
  ON public.venues FOR SELECT
  USING (true);

CREATE POLICY "venues_insert_authenticated"
  ON public.venues FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "venues_update_authenticated"
  ON public.venues FOR UPDATE
  USING (auth.role() = 'authenticated');

-- Reviews: read = everyone, insert = own uid, update/delete = own row
DROP POLICY IF EXISTS "reviews_select_public"     ON public.reviews;
DROP POLICY IF EXISTS "reviews_insert_own"        ON public.reviews;
DROP POLICY IF EXISTS "reviews_update_own"        ON public.reviews;
DROP POLICY IF EXISTS "reviews_delete_own"        ON public.reviews;

CREATE POLICY "reviews_select_public"
  ON public.reviews FOR SELECT
  USING (true);

CREATE POLICY "reviews_insert_own"
  ON public.reviews FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "reviews_update_own"
  ON public.reviews FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "reviews_delete_own"
  ON public.reviews FOR DELETE
  USING (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- STORAGE BUCKET (run AFTER creating the bucket "review-photos" in dashboard)
-- ---------------------------------------------------------------------------

-- Public read for anyone
DROP POLICY IF EXISTS "review_photos_public_read"    ON storage.objects;
DROP POLICY IF EXISTS "review_photos_auth_insert"    ON storage.objects;
DROP POLICY IF EXISTS "review_photos_auth_delete"    ON storage.objects;

CREATE POLICY "review_photos_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'review-photos');

CREATE POLICY "review_photos_auth_insert"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'review-photos'
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "review_photos_auth_delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'review-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
