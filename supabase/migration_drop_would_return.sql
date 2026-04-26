-- 'Wiederkommen?' is now derived on the client from avg_score
-- (>=7 Jederzeit, >=4 Geht so, <4 Meiden), so the stored column
-- is no longer needed.

ALTER TABLE venues DROP CONSTRAINT IF EXISTS venues_would_return_check;
ALTER TABLE venues DROP COLUMN IF EXISTS would_return;
