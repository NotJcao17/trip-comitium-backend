const db = require('../config/db');

// Obtener estadísticas detalladas de una encuesta (Para miembros del viaje)
exports.getPollStats = async (req, res) => {
    const { pollId } = req.params;
    const tripId = req.user.tripId;

    try {
        // 1. Obtener información básica de la encuesta verificando pertenencia al viaje
        const [pollRows] = await db.query(
            'SELECT * FROM polls WHERE poll_id = ? AND trip_id = ?',
            [pollId, tripId]
        );
        if (pollRows.length === 0) return res.status(404).json({ error: 'Encuesta no encontrada en este viaje' });

        const poll = pollRows[0];

        // 2. Obtener todos los votos con el nombre y ID del participante
        const [votes] = await db.query(`
            SELECT v.vote_value, v.option_id, v.text_response, v.participant_id, p.name as participant_name
            FROM votes v
            JOIN participants p ON v.participant_id = p.participant_id
            WHERE v.poll_id = ?
        `, [pollId]);

        let stats = {
            pollId: poll.poll_id,
            type: poll.type,
            title: poll.title,
            status: poll.status,
            totalVotes: votes.length
        };

        // 3. Procesar datos según el tipo de encuesta
        switch (poll.type) {
            case 'multiple_choice':
                // Conteo de votos y desglose de votantes por opción
                stats.results = {};
                stats.votersByOption = {};
                votes.forEach(v => {
                    const key = v.option_id;
                    if (key) {
                        if (!stats.results[key]) stats.results[key] = 0;
                        if (!stats.votersByOption[key]) stats.votersByOption[key] = [];
                        stats.results[key]++;
                        stats.votersByOption[key].push({
                            id: v.participant_id,
                            name: v.participant_name
                        });
                    }
                });
                break;

            case 'slider':
                // Calcular Min, Max, Promedio
                const values = votes
                    .map(v => {
                        if (!v.vote_value) return NaN;
                        const val = typeof v.vote_value === 'string' ? JSON.parse(v.vote_value) : v.vote_value;
                        return typeof val?.amount === 'number' ? val.amount : Number(val?.amount);
                    })
                    .filter(n => !isNaN(n));

                if (values.length > 0) {
                    stats.min = Math.min(...values);
                    stats.max = Math.max(...values);
                    stats.average = Number((values.reduce((a, b) => a + b, 0) / values.length).toFixed(2));
                    stats.votes = votes.map(v => {
                        const val = typeof v.vote_value === 'string' ? JSON.parse(v.vote_value || '{}') : (v.vote_value || {});
                        return { id: v.participant_id, name: v.participant_name, value: val?.amount };
                    });
                } else {
                    stats.min = 0;
                    stats.max = 0;
                    stats.average = 0;
                    stats.votes = [];
                }
                break;

            case 'date':
                // Frecuencia de fechas para el Heatmap
                let dateCounts = {};
                votes.forEach(v => {
                    let dates = v.vote_value;
                    if (typeof dates === 'string') {
                        try { dates = JSON.parse(dates); } catch (e) { dates = []; }
                    }
                    if (Array.isArray(dates)) {
                        dates.forEach(date => {
                            if (!dateCounts[date]) dateCounts[date] = { count: 0, voters: [] };
                            dateCounts[date].count++;
                            dateCounts[date].voters.push({
                                id: v.participant_id,
                                name: v.participant_name
                            });
                        });
                    }
                });
                stats.heatmap = dateCounts;
                break;

            case 'tier_list':
                // Puntuación ponderada por niveles
                const defaultPoints = { 'S': 5, 'A': 4, 'B': 3, 'C': 2, 'D': 1, 'E': 0, 'F': 0 };
                let itemScores = {};

                votes.forEach(v => {
                    let userTier = v.vote_value || {};
                    if (typeof userTier === 'string') {
                        try { userTier = JSON.parse(userTier); } catch (e) { userTier = {}; }
                    }
                    if (typeof userTier === 'object' && userTier !== null) {
                        Object.keys(userTier).forEach(item => {
                            if (!itemScores[item]) itemScores[item] = 0;
                            const tierKey = String(userTier[item]).toUpperCase();
                            itemScores[item] += defaultPoints[tierKey] !== undefined ? defaultPoints[tierKey] : 0;
                        });
                    }
                });

                // Convertir a array ordenado
                stats.ranking = Object.entries(itemScores)
                    .map(([item, score]) => ({ item, score }))
                    .sort((a, b) => b.score - a.score);

                stats.rawVotes = votes.map(v => {
                    let tiers = v.vote_value;
                    if (typeof tiers === 'string') {
                        try { tiers = JSON.parse(tiers); } catch (e) { tiers = {}; }
                    }
                    return { id: v.participant_id, name: v.participant_name, tiers };
                });
                break;

            case 'text':
                stats.responses = votes.map(v => ({ id: v.participant_id, name: v.participant_name, text: v.text_response || '' }));
                break;
        }

        res.json(stats);

    } catch (error) {
        console.error('Error al calcular estadísticas:', error);
        res.status(500).json({ error: 'Error al calcular estadísticas' });
    }
};