-- Delete policy for the venues table. Only authenticated users can
-- delete rows; anon reads keep working via the existing SELECT policy.
-- Run once in the Supabase SQL editor (Project → SQL → New query).

CREATE POLICY "Authenticated users can delete venues"
  ON public.venues
  FOR DELETE
  TO authenticated
  USING (true);
