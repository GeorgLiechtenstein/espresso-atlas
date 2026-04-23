-- Fix avg_score column type to support value 10.00
-- DECIMAL(3,2) max = 9.99 → overflow when all criteria = 10
ALTER TABLE venues ALTER COLUMN avg_score TYPE NUMERIC(5,2);
