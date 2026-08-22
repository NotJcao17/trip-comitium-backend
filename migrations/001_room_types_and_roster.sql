-- 1. Agregar tipo de sala (abierta vs cerrada) a trips
ALTER TABLE trips ADD COLUMN IF NOT EXISTS room_type ENUM('open', 'closed') DEFAULT 'open';

-- 2. Modificar tabla participants para admitir participantes pre-registrados en salas cerradas
ALTER TABLE participants ADD COLUMN IF NOT EXISTS status ENUM('invited', 'active') DEFAULT 'active';
ALTER TABLE participants MODIFY COLUMN access_pin VARCHAR(255) NULL;
