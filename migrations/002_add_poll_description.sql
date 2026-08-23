-- Migracion 002: Agregar columna description a la tabla polls
ALTER TABLE polls ADD COLUMN IF NOT EXISTS description TEXT NULL;
