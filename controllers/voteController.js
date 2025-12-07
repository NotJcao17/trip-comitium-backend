const db = require('../config/db');

exports.submitVote = async (req, res) => {
    const { pollId, optionId, voteValue, textResponse } = req.body;
    const participantId = req.user.id; // Viene del Token (middleware auth)

    if (!pollId) {
        return res.status(400).json({ error: 'Falta el ID de la encuesta.' });
    }

    try {
        // 1. Verificar si la encuesta está activa
        const [pollRows] = await db.query('SELECT status FROM polls WHERE poll_id = ?', [pollId]);

        if (pollRows.length === 0) {
            return res.status(404).json({ error: 'Encuesta no encontrada.' });
        }

        if (pollRows[0].status !== 'active') {
            return res.status(400).json({ error: 'La votación está cerrada.' });
        }

        // 2. Verificar si el usuario YA votó en esta encuesta
        const [existingVote] = await db.query(
            'SELECT vote_id FROM votes WHERE poll_id = ? AND participant_id = ?',
            [pollId, participantId]
        );

        const valueJson = voteValue ? JSON.stringify(voteValue) : null;

        if (existingVote.length > 0) {
            // --- CASO A: ACTUALIZAR (UPDATE) ---
            await db.query(
                `UPDATE votes 
                 SET option_id = ?, vote_value = ?, text_response = ? 
                 WHERE vote_id = ?`,
                [optionId || null, valueJson, textResponse || null, existingVote[0].vote_id]
            );
            res.json({ message: 'Voto actualizado correctamente.' });

        } else {
            // --- CASO B: INSERTAR (INSERT) ---
            await db.query(
                `INSERT INTO votes (poll_id, participant_id, option_id, vote_value, text_response) 
                 VALUES (?, ?, ?, ?, ?)`,
                [pollId, participantId, optionId || null, valueJson, textResponse || null]
            );
            res.status(201).json({ message: 'Voto registrado exitosamente.' });
        }

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al procesar el voto.' });
    }
};

// Obtener el voto del usuario actual (para que el frontend sepa qué marcó antes)
exports.getMyVote = async (req, res) => {
    const { pollId } = req.params;
    const participantId = req.user.id;

    try {
        const [rows] = await db.query(
            'SELECT * FROM votes WHERE poll_id = ? AND participant_id = ?',
            [pollId, participantId]
        );

        if (rows.length === 0) {
            return res.json(null); // No ha votado
        }

        res.json(rows[0]);

    } catch (error) {
        res.status(500).json({ error: 'Error al obtener voto.' });
    }
};

// Obtener todos los poll_ids en los que el usuario ha votado
exports.getMyVotes = async (req, res) => {
    const participantId = req.user.id;

    try {
        const [rows] = await db.query(
            'SELECT DISTINCT poll_id FROM votes WHERE participant_id = ?',
            [participantId]
        );

        // Devolver un array simple de poll_ids
        const pollIds = rows.map(row => row.poll_id);
        res.json(pollIds);

    } catch (error) {
        res.status(500).json({ error: 'Error al obtener votos.' });
    }
};