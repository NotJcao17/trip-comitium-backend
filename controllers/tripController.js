const db = require('../config/db');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

// Función para generar códigos aleatorios criptográficamente seguros
const generateCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    const bytes = crypto.randomBytes(5);
    for (let i = 0; i < 5; i++) {
        code += chars.charAt(bytes[i] % chars.length);
    }
    return code;
};

// 1. CREAR NUEVO VIAJE
exports.createTrip = async (req, res) => {
    const { tripName, tripDescription, adminName, adminPin, roomType, roster } = req.body;

    // Validación simple
    if (!tripName || !adminName || !adminPin) {
        return res.status(400).json({ error: 'Faltan datos obligatorios (Nombre de viaje, Nombre de admin o PIN).' });
    }

    const selectedRoomType = roomType === 'closed' ? 'closed' : 'open';

    try {
        let newTripId = null;
        let shareCode = '';
        let attempts = 0;
        const maxAttempts = 5;

        // Bucle para manejar colisiones de código único (share_code)
        while (attempts < maxAttempts && !newTripId) {
            attempts++;
            shareCode = generateCode();
            try {
                const [tripResult] = await db.query(
                    'INSERT INTO trips (name, description, share_code, room_type) VALUES (?, ?, ?, ?)',
                    [tripName.trim(), tripDescription ? tripDescription.trim() : null, shareCode, selectedRoomType]
                );
                newTripId = tripResult.insertId;
            } catch (err) {
                if (err.code === 'ER_DUP_ENTRY' && attempts < maxAttempts) {
                    continue; // Reintentar con otro código
                }
                throw err;
            }
        }

        if (!newTripId) {
            return res.status(500).json({ error: 'No se pudo generar un código de viaje único. Inténtalo de nuevo.' });
        }

        const hashedPin = await bcrypt.hash(adminPin, 10);
        const normalizedAdminName = adminName.trim();

        // Insertar al Administrador en la BD (tabla participants)
        const [adminResult] = await db.query(
            'INSERT INTO participants (trip_id, name, access_pin, is_admin, status) VALUES (?, ?, ?, ?, ?)',
            [newTripId, normalizedAdminName, hashedPin, true, 'active']
        );

        const newAdminId = adminResult.insertId;

        // Si es sala cerrada y se proporcionó una lista de participantes predefinidos (roster)
        if (selectedRoomType === 'closed' && Array.isArray(roster) && roster.length > 0) {
            for (const rawName of roster) {
                const cleanName = typeof rawName === 'string' ? rawName.trim() : '';
                if (cleanName && cleanName.toLowerCase() !== normalizedAdminName.toLowerCase()) {
                    await db.query(
                        'INSERT INTO participants (trip_id, name, access_pin, is_admin, status) VALUES (?, ?, NULL, false, ?)',
                        [newTripId, cleanName, 'invited']
                    );
                }
            }
        }

        // Generar el Token de Sesión (JWT) para que el admin entre directo
        const token = jwt.sign(
            {
                id: newAdminId,
                name: normalizedAdminName,
                isAdmin: true,
                tripId: newTripId
            },
            process.env.JWT_SECRET
        );

        // Responder al Frontend
        res.status(201).json({
            message: 'Viaje creado exitosamente',
            trip: {
                id: newTripId,
                name: tripName,
                shareCode: shareCode,
                roomType: selectedRoomType
            },
            token: token,
            user: {
                id: newAdminId,
                name: normalizedAdminName,
                isAdmin: true
            }
        });

    } catch (error) {
        console.error('Error al crear el viaje:', error);
        res.status(500).json({ error: 'Error al crear el viaje' });
    }
};

// 2. OBTENER INFORMACIÓN DE UN VIAJE POR CÓDIGO
exports.getTripByCode = async (req, res) => {
    const { code } = req.params;

    try {
        const [rows] = await db.query(
            'SELECT trip_id, name, description, share_code, room_type, created_at FROM trips WHERE share_code = ?',
            [code.trim().toUpperCase()]
        );

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Viaje no encontrado' });
        }

        res.json(rows[0]);

    } catch (error) {
        console.error('Error al buscar viaje:', error);
        res.status(500).json({ error: 'Error al buscar el viaje' });
    }
};

// 3. OBTENER ROSTER DE PARTICIPANTES PARA SALA CERRADA (Público con código)
exports.getRosterByCode = async (req, res) => {
    const { code } = req.params;

    try {
        const [tripRows] = await db.query(
            'SELECT trip_id, room_type FROM trips WHERE share_code = ?',
            [code.trim().toUpperCase()]
        );

        if (tripRows.length === 0) {
            return res.status(404).json({ error: 'Viaje no encontrado' });
        }

        const trip = tripRows[0];

        // Obtener participantes registrados e invitados
        const [participants] = await db.query(
            'SELECT participant_id, name, is_admin, status, (access_pin IS NOT NULL) AS is_claimed FROM participants WHERE trip_id = ? ORDER BY name ASC',
            [trip.trip_id]
        );

        res.json({
            roomType: trip.room_type,
            participants: participants.map(p => ({
                id: p.participant_id,
                name: p.name,
                isAdmin: Boolean(p.is_admin),
                status: p.status,
                isClaimed: Boolean(p.is_claimed)
            }))
        });

    } catch (error) {
        console.error('Error al obtener roster:', error);
        res.status(500).json({ error: 'Error al obtener lista de participantes' });
    }
};

// 4. OBTENER PARTICIPANTES DEL VIAJE (Autenticado)
exports.getParticipants = async (req, res) => {
    const tripId = req.user.tripId;

    try {
        const [participants] = await db.query(
            'SELECT participant_id, name, is_admin, status, (access_pin IS NOT NULL) AS is_claimed FROM participants WHERE trip_id = ? ORDER BY is_admin DESC, name ASC',
            [tripId]
        );
        res.json(participants.map(p => ({
            participant_id: p.participant_id,
            name: p.name,
            is_admin: Boolean(p.is_admin),
            status: p.status,
            is_claimed: Boolean(p.is_claimed)
        })));
    } catch (error) {
        console.error('Error al obtener participantes:', error);
        res.status(500).json({ error: 'Error al obtener participantes' });
    }
};

// 5. RESTABLECER PIN DE UN PARTICIPANTE (Solo Admin)
exports.resetParticipantPin = async (req, res) => {
    const { id } = req.params;
    const tripId = req.user.tripId;

    if (Number(id) === Number(req.user.id)) {
        return res.status(400).json({ error: 'No puedes restablecer tu propio PIN como administrador desde esta acción.' });
    }

    try {
        const [targetRows] = await db.query(
            'SELECT participant_id, name, is_admin FROM participants WHERE participant_id = ? AND trip_id = ?',
            [id, tripId]
        );

        if (targetRows.length === 0) {
            return res.status(404).json({ error: 'Participante no encontrado en este viaje.' });
        }

        if (targetRows[0].is_admin) {
            return res.status(403).json({ error: 'No se puede restablecer el PIN de un administrador.' });
        }

        // Restablecer el PIN a NULL y estado a 'invited'
        await db.query(
            'UPDATE participants SET access_pin = NULL, status = "invited" WHERE participant_id = ? AND trip_id = ?',
            [id, tripId]
        );

        res.json({
            message: `El PIN de ${targetRows[0].name} ha sido restablecido. Ahora podrá ingresar un nuevo PIN al entrar.`,
            participantId: Number(id)
        });

    } catch (error) {
        console.error('Error al restablecer PIN:', error);
        res.status(500).json({ error: 'Error al restablecer PIN del participante' });
    }
};

// 6. ELIMINAR PARTICIPANTE (Solo Admin)
exports.deleteParticipant = async (req, res) => {
    const { id } = req.params;
    const tripId = req.user.tripId;

    if (Number(id) === Number(req.user.id)) {
        return res.status(400).json({ error: 'No puedes eliminarte a ti mismo como administrador.' });
    }

    try {
        const [targetRows] = await db.query(
            'SELECT participant_id, is_admin FROM participants WHERE participant_id = ? AND trip_id = ?',
            [id, tripId]
        );

        if (targetRows.length === 0) {
            return res.status(404).json({ error: 'Participante no encontrado o no pertenece a este viaje' });
        }

        if (targetRows[0].is_admin) {
            return res.status(403).json({ error: 'No se puede eliminar a un administrador del viaje.' });
        }

        // Eliminar votos del participante primero
        await db.query('DELETE FROM votes WHERE participant_id = ?', [id]);

        const [result] = await db.query(
            'DELETE FROM participants WHERE participant_id = ? AND trip_id = ?',
            [id, tripId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'No se pudo eliminar el participante.' });
        }

        res.json({ message: 'Participante eliminado correctamente' });

    } catch (error) {
        console.error('Error al eliminar participante:', error);
        res.status(500).json({ error: 'Error al eliminar participante' });
    }
};