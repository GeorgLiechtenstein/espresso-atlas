-- ============================================================
-- Migration: Change rating scale from 1–5 to 1–10
-- Run this in the Supabase SQL editor
-- ============================================================

-- Drop old 1–5 check constraints (try both original and renamed column names)
ALTER TABLE venues DROP CONSTRAINT IF EXISTS venues_optics_check;
ALTER TABLE venues DROP CONSTRAINT IF EXISTS venues_taste_check;
ALTER TABLE venues DROP CONSTRAINT IF EXISTS venues_verdict_check;
ALTER TABLE venues DROP CONSTRAINT IF EXISTS venues_crema_check;
ALTER TABLE venues DROP CONSTRAINT IF EXISTS venues_body_check;
ALTER TABLE venues DROP CONSTRAINT IF EXISTS venues_balance_check;
ALTER TABLE venues DROP CONSTRAINT IF EXISTS venues_overall_check;

-- Add new 1–10 check constraints
ALTER TABLE venues ADD CONSTRAINT venues_body_check    CHECK (body    BETWEEN 1 AND 10);
ALTER TABLE venues ADD CONSTRAINT venues_balance_check CHECK (balance BETWEEN 1 AND 10);
ALTER TABLE venues ADD CONSTRAINT venues_crema_check   CHECK (crema   BETWEEN 1 AND 10);
ALTER TABLE venues ADD CONSTRAINT venues_overall_check CHECK (overall BETWEEN 1 AND 10);

-- Done. Ratings now accept values 1–10.
