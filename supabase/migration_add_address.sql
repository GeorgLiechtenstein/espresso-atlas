-- Add address column to venues
ALTER TABLE venues ADD COLUMN IF NOT EXISTS address TEXT;
