CREATE DATABASE IF NOT EXISTS trip_comitium;
USE trip_comitium;

-- 1. Tabla de Viajes
CREATE TABLE trips (
    trip_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    share_code VARCHAR(10) NOT NULL UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabla de Participantes
CREATE TABLE participants (
    participant_id INT AUTO_INCREMENT PRIMARY KEY,
    trip_id INT NOT NULL,
    name VARCHAR(50) NOT NULL,
    access_pin VARCHAR(255) NOT NULL,
    is_admin BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (trip_id) REFERENCES trips(trip_id) ON DELETE CASCADE
);

-- 3. Tabla de Encuestas
CREATE TABLE polls (
    poll_id INT AUTO_INCREMENT PRIMARY KEY,
    trip_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    type ENUM('date', 'tier_list', 'slider', 'multiple_choice', 'text') NOT NULL,
    status ENUM('active', 'locked', 'hidden') DEFAULT 'active',
    config JSON, 
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (trip_id) REFERENCES trips(trip_id) ON DELETE CASCADE
);

-- 4. Tabla de Opciones (para Tier List y Multiple Choice)
CREATE TABLE poll_options (
    option_id INT AUTO_INCREMENT PRIMARY KEY,
    poll_id INT NOT NULL,
    text VARCHAR(255) NOT NULL,
    image_url VARCHAR(500),
    FOREIGN KEY (poll_id) REFERENCES polls(poll_id) ON DELETE CASCADE
);

-- 5. Tabla de Votos
CREATE TABLE votes (
    vote_id INT AUTO_INCREMENT PRIMARY KEY,
    poll_id INT NOT NULL,
    participant_id INT NOT NULL,
    option_id INT, -- Para selección simple
    vote_value JSON, -- Para datos complejos (TierList, Date, Slider)
    text_response TEXT, -- Para texto libre
    FOREIGN KEY (poll_id) REFERENCES polls(poll_id) ON DELETE CASCADE,
    FOREIGN KEY (participant_id) REFERENCES participants(participant_id) ON DELETE CASCADE,
    FOREIGN KEY (option_id) REFERENCES poll_options(option_id) ON DELETE CASCADE,
    UNIQUE KEY unique_vote_per_user (poll_id, participant_id)
);