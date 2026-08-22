const db = require('../config/db');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

exports.joinTrip = async (req, res) => {
    const { shareCode, name, accessPin } = req.body;

    // Validación básica
    if (!shareCode || !name || !accessPin) {
        return res.status(400).json({ error: 'Faltan datos obligatorios (Código de viaje, Nombre o PIN).' });
    }

    if (String(accessPin).length !== 4) {
        return res.status(400).json({ error: 'El PIN de acceso debe tener exactamente 4 dígitos.' });
    }

    try {
        // 1. Buscar el viaje por el código compartido
        const [trips] = await db.query(
            'SELECT trip_id, name, room_type FROM trips WHERE share_code = ?',
            [shareCode.trim().toUpperCase()]
        );

        if (trips.length === 0) {
            return res.status(404).json({ error: 'El código de viaje no existe.' });
        }

        const trip = trips[0];
        const tripId = trip.trip_id;
        const cleanName = name.trim();

        // 2. Buscar si el participante ya existe en este viaje (búsqueda insensible a mayúsculas)
        const [participants] = await db.query(
            'SELECT participant_id, name, access_pin, is_admin, status FROM participants WHERE trip_id = ? AND LOWER(name) = LOWER(?)',
            [tripId, cleanName]
        );

        let participant;
        let isNewUser = false;

        if (participants.length > 0) {
            participant = participants[0];

            // CASO A: El participante estaba pre-invitado en sala cerrada (sin PIN asignado aún)
            if (!participant.access_pin || participant.status === 'invited') {
                const hashedPin = await bcrypt.hash(accessPin, 10);
                await db.query(
                    'UPDATE participants SET access_pin = ?, status = "active" WHERE participant_id = ?',
                    [hashedPin, participant.participant_id]
                );
                participant.status = 'active';
                isNewUser = true;
            } else {
                // CASO B: LOGIN (El usuario ya tiene PIN asignado)
                const isMatch = await bcrypt.compare(accessPin, participant.access_pin);

                if (!isMatch) {
                    return res.status(401).json({
                        error: 'PIN incorrecto. Si eres el dueño de este nombre, verifica tu PIN o pide al administrador restablecer tu acceso.'
                    });
                }
            }

        } else {
            // CASO C: Usuario nuevo
            // Si la sala es cerrada, no se permite auto-registro con un nombre que no esté en el roster
            if (trip.room_type === 'closed') {
                return res.status(403).json({
                    error: 'Esta sala es cerrada. Solo los participantes invitados en la lista pueden acceder. Consulta al organizador.'
                });
            }

            // Si es sala abierta, registrar al nuevo participante
            const hashedPin = await bcrypt.hash(accessPin, 10);

            const [result] = await db.query(
                'INSERT INTO participants (trip_id, name, access_pin, is_admin, status) VALUES (?, ?, ?, ?, ?)',
                [tripId, cleanName, hashedPin, false, 'active']
            );

            participant = {
                participant_id: result.insertId,
                name: cleanName,
                is_admin: 0,
                status: 'active'
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
            message: isNewUser ? 'Registro y acceso exitoso' : 'Bienvenido de nuevo',
            token: token,
            user: {
                id: participant.participant_id,
                name: participant.name,
                isAdmin: Boolean(participant.is_admin)
            },
            trip: {
                id: tripId,
                name: trip.name,
                roomType: trip.room_type,
                shareCode: shareCode.trim().toUpperCase()
            }
        });

    } catch (error) {
        console.error('Error en joinTrip:', error);
        res.status(500).json({ error: 'Error al procesar el ingreso a la sala' });
    }
};