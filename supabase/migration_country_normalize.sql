-- Normalize country names: store the German canonical form in `country`
-- and keep the English version in a new `country_en` column. This collapses
-- duplicates like 'United Kingdom' / 'Vereinigtes Königreich' that
-- previously existed as separate filter entries.
--
-- Run once in the Supabase SQL editor.

ALTER TABLE venues ADD COLUMN IF NOT EXISTS country_en TEXT;

-- Known countries: any DE-or-EN spelling collapses to the canonical pair.
UPDATE venues SET country = 'Deutschland',              country_en = 'Germany'        WHERE country IN ('Deutschland', 'Germany');
UPDATE venues SET country = 'Italien',                  country_en = 'Italy'          WHERE country IN ('Italien', 'Italy');
UPDATE venues SET country = 'Schweiz',                  country_en = 'Switzerland'    WHERE country IN ('Schweiz', 'Switzerland');
UPDATE venues SET country = 'Frankreich',               country_en = 'France'         WHERE country IN ('Frankreich', 'France');
UPDATE venues SET country = 'Österreich',               country_en = 'Austria'        WHERE country IN ('Österreich', 'Austria');
UPDATE venues SET country = 'Spanien',                  country_en = 'Spain'          WHERE country IN ('Spanien', 'Spain');
UPDATE venues SET country = 'Portugal',                 country_en = 'Portugal'       WHERE country = 'Portugal';
UPDATE venues SET country = 'Niederlande',              country_en = 'Netherlands'    WHERE country IN ('Niederlande', 'Netherlands');
UPDATE venues SET country = 'Belgien',                  country_en = 'Belgium'        WHERE country IN ('Belgien', 'Belgium');
UPDATE venues SET country = 'Türkei',                   country_en = 'Turkey'         WHERE country IN ('Türkei', 'Turkey');
UPDATE venues SET country = 'Vereinigtes Königreich',   country_en = 'United Kingdom' WHERE country IN ('Vereinigtes Königreich', 'United Kingdom');
UPDATE venues SET country = 'Irland',                   country_en = 'Ireland'        WHERE country IN ('Irland', 'Ireland');
UPDATE venues SET country = 'Tschechien',               country_en = 'Czechia'        WHERE country IN ('Tschechien', 'Czechia', 'Czech Republic');
UPDATE venues SET country = 'Polen',                    country_en = 'Poland'         WHERE country IN ('Polen', 'Poland');
UPDATE venues SET country = 'Griechenland',             country_en = 'Greece'         WHERE country IN ('Griechenland', 'Greece');
UPDATE venues SET country = 'Schweden',                 country_en = 'Sweden'         WHERE country IN ('Schweden', 'Sweden');
UPDATE venues SET country = 'Norwegen',                 country_en = 'Norway'         WHERE country IN ('Norwegen', 'Norway');
UPDATE venues SET country = 'Dänemark',                 country_en = 'Denmark'        WHERE country IN ('Dänemark', 'Denmark');
UPDATE venues SET country = 'Vereinigte Staaten',       country_en = 'United States'  WHERE country IN ('Vereinigte Staaten', 'USA', 'United States', 'United States of America');

-- For unknown country values: copy the original into country_en as a
-- fallback so neither column is null. The app will write the proper pair
-- on next save.
UPDATE venues SET country_en = country WHERE country_en IS NULL AND country IS NOT NULL;
