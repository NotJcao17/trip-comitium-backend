const db = require('../config/db');
const jwt = require('jsonwebtoken');

// Función para generar códigos aleatorios
const generateCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 5; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
};

// 1. CREAR NUEVO VIAJE
exports.createTrip = async (req, res) => {
    const { tripName, tripDescription, adminName, adminPin } = req.body;

    // Validación simple
    if (!tripName || !adminName || !adminPin) {
        return res.status(400).json({ error: 'Faltan datos obligatorios.' });
    }

    try {
        // A. Generar código único
        let shareCode = generateCode(); // se podría agregar validación para q no se repita el código pero poco probable

        // B. Insertar el Viaje en la BD
        const [tripResult] = await db.query(
            'INSERT INTO trips (name, description, share_code) VALUES (?, ?, ?)',
            [tripName, tripDescription, shareCode]
        );

        const newTripId = tripResult.insertId;

        // C. Insertar al Administrador en la BD (tabla participants), se podría encriptar el PIN para un proyecto mayor
        const [adminResult] = await db.query(
            'INSERT INTO participants (trip_id, name, access_pin, is_admin) VALUES (?, ?, ?, ?)',
            [newTripId, adminName.toLowerCase(), adminPin, true]
        );

        const newAdminId = adminResult.insertId;

        // D. Generar el Token de Sesión (JWT) para que el admin entre directo
        const token = jwt.sign(
            {
                id: newAdminId,
                name: adminName,
                isAdmin: true,
                tripId: newTripId
            },
            process.env.JWT_SECRET
        );

        // E. Responder al Frontend
        res.status(201).json({
            message: 'Viaje creado exitosamente',
            trip: {
                id: newTripId,
                name: tripName,
                shareCode: shareCode
            },
            token: token // Enviar el token para que Angular lo guarde
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al crear el viaje' });
    }
};

// 2. OBTENER INFORMACIÓN DE UN VIAJE POR CODIGO
exports.getTripByCode = async (req, res) => {
    const { code } = req.params;

    try {
        const [rows] = await db.query(
            'SELECT trip_id, name, description, share_code FROM trips WHERE share_code = ?',
            [code]
        );

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Viaje no encontrado' });
        }

        res.json(rows[0]);

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al buscar el viaje' });
    }
};

// 3. OBTENER PARTICIPANTES DEL VIAJE (Solo para usuarios del viaje)
exports.getParticipants = async (req, res) => {
    const tripId = req.user.tripId; // Del token

    try {
        const [participants] = await db.query(
            'SELECT participant_id, name, is_admin FROM participants WHERE trip_id = ? ORDER BY is_admin DESC, name ASC',
            [tripId]
        );
        res.json(participants);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener participantes' });
    }
};

// 4. ELIMINAR PARTICIPANTE
exports.deleteParticipant = async (req, res) => {
    const { id } = req.params;
    const tripId = req.user.tripId; // Del token (para asegurar que solo borre de su viaje)

    try {
        // Opcional: Verificar que no se borre a sí mismo o al admin principal si se requiere
        // Por ahora, confiamos en que el frontend no muestra el botón para admins

        const [result] = await db.query(
            'DELETE FROM participants WHERE participant_id = ? AND trip_id = ?',
            [id, tripId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Participante no encontrado o no pertenece a este viaje' });
        }

        res.json({ message: 'Participante eliminado correctamente' });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al eliminar participante' });
    }
};