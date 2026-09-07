-- Migracion 005: Galeria de imagenes por opcion
-- El organizador pega links directos (postimages, imgbb) y cada opcion los
-- muestra como miniaturas al votar. Las imagenes no viven aqui, solo su URL.
-- `source` distingue de donde salio el enlace: hoy siempre es 'link', pero
-- deja la puerta abierta a subidas propias sin tocar lo que ya existe.
CREATE TABLE IF NOT EXISTS poll_option_images (
    image_id INT AUTO_INCREMENT PRIMARY KEY,
    option_id INT NOT NULL,
    url VARCHAR(500) NOT NULL,
    thumb_url VARCHAR(500) NULL,
    position TINYINT NOT NULL DEFAULT 0,
    source VARCHAR(16) NOT NULL DEFAULT 'link',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_option_images (option_id, position),
    FOREIGN KEY (option_id) REFERENCES poll_options(option_id) ON DELETE CASCADE
);
