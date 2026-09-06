-- Migracion 003: Agregar columna description a las opciones de encuesta
-- Permite que cada opcion de una votacion de opcion multiple o tier list
-- incluya detalles (precio, ubicacion, que incluye, etc.)
ALTER TABLE poll_options ADD COLUMN IF NOT EXISTS description TEXT NULL;
