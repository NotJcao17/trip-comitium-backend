const db = require('../config/db');

// 1. CREAR NUEVA ENCUESTA (Solo Admin)
exports.createPoll = async (req, res) => {
    // Obtenemos el ID del viaje del token del usuario
    const tripId = req.user.tripId;
    const { title, type, config, options } = req.body;

    if (!title || !type) {
        return res.status(400).json({ error: 'Título y Tipo son obligatorios.' });
    }

    try {
        // A. Insertar la Encuesta en la tabla 'polls'
        const [pollResult] = await db.query(
            'INSERT INTO polls (trip_id, title, type, config, status) VALUES (?, ?, ?, ?, ?)',
            [tripId, title, type, JSON.stringify(config || {}), 'active']
        );

        const newPollId = pollResult.insertId;

        // B. Insertar las Opciones (si existen) en 'poll_options'
        if (options && Array.isArray(options) && options.length > 0) {
            // Preparar un array de arrays para insertar: [[id, texto], [id, texto]]
            const optionsValues = options.map(optText => [newPollId, optText]);

            await db.query(
                'INSERT INTO poll_options (poll_id, text) VALUES ?',
                [optionsValues]
            );
        }

        res.status(201).json({ message: 'Encuesta creada exitosamente', pollId: newPollId });

    } catch (error) {
        console.error('Error al crear encuesta:', error);
        res.status(500).json({ error: 'Error al crear la encuesta.' });
    }
};

// 2. OBTENER TODAS LAS ENCUESTAS DE UN VIAJE (Para el Dashboard)
exports.getPollsByTrip = async (req, res) => {
    const tripId = req.user.tripId;

    try {
        const [polls] = await db.query(
            'SELECT * FROM polls WHERE trip_id = ? ORDER BY created_at DESC',
            [tripId]
        );

        for (let poll of polls) {
            const [options] = await db.query('SELECT * FROM poll_options WHERE poll_id = ?', [poll.poll_id]);
            poll.options = options;
        }

        res.json(polls);

    } catch (error) {
        console.error('Error al obtener encuestas:', error);
        res.status(500).json({ error: 'Error al obtener encuestas.' });
    }
};

// 3. CAMBIAR ESTADO (Active / Locked / Hidden) - Solo Admin
exports.updatePollStatus = async (req, res) => {
    const { pollId } = req.params;
    const { status } = req.body;
    const tripId = req.user.tripId;

    const allowedStatuses = ['active', 'locked', 'hidden'];
    if (!allowedStatuses.includes(status)) {
        return res.status(400).json({ error: 'Estado no válido.' });
    }

    try {
        const [result] = await db.query(
            'UPDATE polls SET status = ? WHERE poll_id = ? AND trip_id = ?',
            [status, pollId, tripId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Encuesta no encontrada o no pertenece a este viaje.' });
        }

        res.json({ message: `Estado actualizado a ${status}` });
    } catch (error) {
        console.error('Error al actualizar estado:', error);
        res.status(500).json({ error: 'Error al actualizar estado.' });
    }
};

// 4. BORRAR ENCUESTA - Solo Admin
exports.deletePoll = async (req, res) => {
    const { pollId } = req.params;
    const tripId = req.user.tripId;

    try {
        const [result] = await db.query(
            'DELETE FROM polls WHERE poll_id = ? AND trip_id = ?',
            [pollId, tripId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Encuesta no encontrada o no pertenece a este viaje.' });
        }

        res.json({ message: 'Encuesta eliminada.' });
    } catch (error) {
        console.error('Error al eliminar encuesta:', error);
        res.status(500).json({ error: 'Error al eliminar encuesta.' });
    }
};

// 5. OBTENER UNA ENCUESTA POR ID (Para votación)
exports.getPollById = async (req, res) => {
    const { pollId } = req.params;
    const tripId = req.user.tripId;

    try {
        // 1. Buscar la encuesta asegurando que pertenece al viaje del usuario
        const [pollRows] = await db.query(
            'SELECT * FROM polls WHERE poll_id = ? AND trip_id = ?',
            [pollId, tripId]
        );

        if (pollRows.length === 0) {
            return res.status(404).json({ error: 'Encuesta no encontrada' });
        }

        const poll = pollRows[0];

        // 2. Buscar sus opciones (Si es Tier List o Multiple Choice)
        const [options] = await db.query('SELECT * FROM poll_options WHERE poll_id = ?', [pollId]);
        poll.options = options;

        res.json(poll);

    } catch (error) {
        console.error('Error al obtener la encuesta:', error);
        res.status(500).json({ error: 'Error al obtener la encuesta.' });
    }
};