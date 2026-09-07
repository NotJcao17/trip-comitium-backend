const db = require('../config/db');
const { sanitizeImageList } = require('../utils/imageLinks');

/**
 * Cuelga de cada opcion su galeria de imagenes.
 *
 * Una sola consulta para todas las opciones de todas las encuestas: si se
 * pregunta por opcion, una encuesta de quince opciones son quince viajes a la
 * base, y esto corre en una funcion sin estado donde cada viaje se paga.
 */
async function attachOptionImages(polls) {
    const optionIds = [];
    for (const poll of polls) {
        for (const option of (poll.options || [])) {
            option.images = [];
            optionIds.push(option.option_id);
        }
    }

    // `IN ()` con la lista vacia es un error de sintaxis, no un cero filas.
    if (optionIds.length === 0) return;

    let rows;
    try {
        [rows] = await db.query(
            `SELECT image_id, option_id, url, thumb_url
               FROM poll_option_images
              WHERE option_id IN (?)
              ORDER BY option_id, position, image_id`,
            [optionIds]
        );
    } catch (error) {
        // El despliegue y la migracion no son un solo paso: si el codigo llega
        // antes que la tabla, las encuestas se siguen leyendo sin fotos en vez
        // de caerse enteras. Solo se traga ese error concreto; cualquier otro
        // sube como siempre.
        if (error && error.code === 'ER_NO_SUCH_TABLE') {
            console.warn('poll_option_images no existe todavia: falta correr la migracion 005.');
            return;
        }
        throw error;
    }

    const byOption = new Map();
    for (const row of rows) {
        if (!byOption.has(row.option_id)) byOption.set(row.option_id, []);
        byOption.get(row.option_id).push(row);
    }

    for (const poll of polls) {
        for (const option of (poll.options || [])) {
            option.images = byOption.get(option.option_id) || [];
        }
    }
}

// 1. CREAR NUEVA ENCUESTA (Solo Admin)
exports.createPoll = async (req, res) => {
    // Obtenemos el ID del viaje del token del usuario
    const tripId = req.user.tripId;
    const { title, description, type, config, options, isAnonymous } = req.body;

    if (!title || !type) {
        return res.status(400).json({ error: 'Título y Tipo son obligatorios.' });
    }

    try {
        // A. Insertar la Encuesta en la tabla 'polls'
        const [pollResult] = await db.query(
            'INSERT INTO polls (trip_id, title, description, type, config, status, is_anonymous) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [tripId, title.trim(), description ? description.trim() : null, type, JSON.stringify(config || {}), 'active', isAnonymous ? 1 : 0]
        );

        const newPollId = pollResult.insertId;

        // B. Insertar las Opciones (si existen) en 'poll_options'
        // Cada opción puede llegar como texto plano ("Cabaña") o como objeto
        // con detalles ({ text: 'Cabaña', description: '$1,200 la noche...' })
        if (options && Array.isArray(options) && options.length > 0) {
            const cleanOptions = options
                .map(opt => {
                    const text = typeof opt === 'string' ? opt : opt?.text;
                    const desc = typeof opt === 'string' ? null : opt?.description;
                    if (!text || !String(text).trim()) return null;
                    return {
                        text: String(text).trim(),
                        description: desc && String(desc).trim() ? String(desc).trim() : null,
                        // Quien manda es esto, no el formulario: la peticion
                        // puede venir de cualquier sitio.
                        images: sanitizeImageList(typeof opt === 'string' ? [] : opt?.images)
                    };
                })
                .filter(Boolean);

            // Una insercion por opcion en lugar de una en bloque: el
            // AUTO_INCREMENT de TiDB se reparte en lotes y no garantiza ids
            // consecutivos, asi que deducirlos del insertId podria colgarle
            // las fotos de una opcion a otra.
            const imageValues = [];

            for (const opt of cleanOptions) {
                const [optResult] = await db.query(
                    'INSERT INTO poll_options (poll_id, text, description) VALUES (?, ?, ?)',
                    [newPollId, opt.text, opt.description]
                );

                opt.images.forEach((url, position) => {
                    imageValues.push([optResult.insertId, url, position, 'link']);
                });
            }

            if (imageValues.length > 0) {
                await db.query(
                    'INSERT INTO poll_option_images (option_id, url, position, source) VALUES ?',
                    [imageValues]
                );
            }
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

        await attachOptionImages(polls);

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

        await attachOptionImages([poll]);

        res.json(poll);

    } catch (error) {
        console.error('Error al obtener la encuesta:', error);
        res.status(500).json({ error: 'Error al obtener la encuesta.' });
    }
};