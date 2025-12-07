const db = require('../config/db');

// Obtener estadísticas detalladas de una encuesta
exports.getPollStats = async (req, res) => {
    const { pollId } = req.params;

    // 1. Seguridad: Solo el Admin puede ver esto
    if (!req.user.isAdmin) {
        return res.status(403).json({ error: 'Acceso denegado. Solo el admin puede ver estadísticas.' });
    }

    try {
        // 2. Obtener información básica de la encuesta
        const [pollRows] = await db.query('SELECT * FROM polls WHERE poll_id = ?', [pollId]);
        if (pollRows.length === 0) return res.status(404).json({ error: 'Encuesta no encontrada' });
        
        const poll = pollRows[0];
        
        // 3. Obtener todos los votos con el nombre del participante
        const [votes] = await db.query(`
            SELECT v.vote_value, v.option_id, v.text_response, p.name as participant_name
            FROM votes v
            JOIN participants p ON v.participant_id = p.participant_id
            WHERE v.poll_id = ?
        `, [pollId]);

        let stats = {};

        // 4. Procesar datos según el tipo de encuesta
        switch (poll.type) {
            case 'multiple_choice':
                // Contar votos por opción
                stats.results = {};
                votes.forEach(v => {
                    const key = v.option_id; // ID de la opción
                    if (!stats.results[key]) stats.results[key] = 0;
                    stats.results[key]++;
                });
                break;

            case 'slider':
                // Calcular Min, Max, Promedio
                const values = votes.map(v => v.vote_value.amount).filter(n => !isNaN(n));
                if (values.length > 0) {
                    stats.min = Math.min(...values);
                    stats.max = Math.max(...values);
                    stats.average = values.reduce((a, b) => a + b, 0) / values.length;
                    stats.votes = votes.map(v => ({ name: v.participant_name, value: v.vote_value.amount }));
                }
                break;

            case 'date':
                // Frecuencia de fechas para el Heatmap
                // vote_value es un array de fechas: ["2025-01-01", "2025-01-02"]
                let dateCounts = {};
                votes.forEach(v => {
                    const dates = v.vote_value || [];
                    dates.forEach(date => {
                        if (!dateCounts[date]) dateCounts[date] = { count: 0, voters: [] };
                        dateCounts[date].count++;
                        dateCounts[date].voters.push(v.participant_name);
                    });
                });
                stats.heatmap = dateCounts;
                break;

            case 'tier_list':
                // Puntuación ponderada (S=5, A=4, B=3, C=2, D=1)
                const pointsMap = { 'S': 5, 'A': 4, 'B': 3, 'C': 2, 'D': 1 };
                let itemScores = {};
                
                votes.forEach(v => {
                    const userTier = v.vote_value || {}; // {"Pizza": "S", "Sushi": "A"}
                    Object.keys(userTier).forEach(item => {
                        if (!itemScores[item]) itemScores[item] = 0;
                        itemScores[item] += pointsMap[userTier[item]] || 0;
                    });
                });
                
                // Convertir a array ordenado
                stats.ranking = Object.entries(itemScores)
                    .map(([item, score]) => ({ item, score }))
                    .sort((a, b) => b.score - a.score);
                
                stats.rawVotes = votes.map(v => ({ name: v.participant_name, tiers: v.vote_value }));
                break;

            case 'text':
                stats.responses = votes.map(v => ({ name: v.participant_name, text: v.text_response }));
                break;
        }

        res.json(stats);

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al calcular estadísticas' });
    }
};