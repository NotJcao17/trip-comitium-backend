const db = require('../config/db');
const jwt = require('jsonwebtoken');

exports.joinTrip = async (req, res) => {
    const { shareCode, name, accessPin } = req.body;

    // Validación básica
    if (!shareCode || !name || !accessPin) {
        return res.status(400).json({ error: 'Faltan datos (Código, Nombre o PIN).' });
    }

    try {
        // 1. Buscar el viaje por el código compartido
        const [trips] = await db.query('SELECT trip_id FROM trips WHERE share_code = ?', [shareCode]);

        if (trips.length === 0) {
            return res.status(404).json({ error: 'El código de viaje no existe.' });
        }

        const tripId = trips[0].trip_id;
        const normalizedName = name.trim().toLowerCase(); // Quitar espacios y mayúsculas por si acaso

        // 2. Buscar si el participante ya existe en este viaje
        const [participants] = await db.query(
            'SELECT participant_id, name, access_pin, is_admin FROM participants WHERE trip_id = ? AND name = ?',
            [tripId, normalizedName]
        );

        let participant;
        let isNewUser = false;

        if (participants.length > 0) {
            // --- ESCENARIO A: LOGIN (El usuario existe) ---
            participant = participants[0];

            // Verificar PIN
            if (participant.access_pin !== accessPin) {
                return res.status(401).json({ error: 'Credenciales incorrectas (Nombre ocupado o PIN erróneo).' });
            }

        } else {
            // --- ESCENARIO B: REGISTRO (El usuario es nuevo) ---
            const [result] = await db.query(
                'INSERT INTO participants (trip_id, name, access_pin, is_admin) VALUES (?, ?, ?, ?)',
                [tripId, normalizedName, accessPin, false]
            );

            participant = {
                participant_id: result.insertId,
                name: normalizedName,
                is_admin: 0
            };
            isNewUser = true;
        }

        // 3. Generar Token JWT
        const token = jwt.sign(
            {
                id: participant.participant_id,
                name: participant.name,
                isAdmin: Boolean(participant.is_admin),
                tripId: tripId
            },
            process.env.JWT_SECRET
        );

        // 4. Responder
        res.json({
            message: isNewUser ? 'Registro exitoso' : 'Login exitoso',
            token: token,
            user: {
                id: participant.participant_id,
                name: participant.name,
                isAdmin: Boolean(participant.is_admin)
            },
            tripId: tripId
        });

    } catch (error) {
        console.error('Error en joinTrip:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};