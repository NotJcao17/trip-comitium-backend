-- Migracion 004: Encuestas anonimas
-- Cuando is_anonymous es true, solo el organizador ve quien voto que;
-- el resto de participantes ve unicamente los totales.
ALTER TABLE polls ADD COLUMN IF NOT EXISTS is_anonymous BOOLEAN NOT NULL DEFAULT FALSE;
