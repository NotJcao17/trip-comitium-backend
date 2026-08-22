const express = require('express');
const router = express.Router();
const statsController = require('../controllers/statsController');
const auth = require('../middleware/auth');

// GET /api/stats/:pollId -> Obtener cálculos y votantes de la encuesta (para miembros del viaje)
router.get('/:pollId', auth, statsController.getPollStats);

module.exports = router;