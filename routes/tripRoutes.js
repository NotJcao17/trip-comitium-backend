const express = require('express');
const router = express.Router();
const tripController = require('../controllers/tripController');
const auth = require('../middleware/auth');
const verifyAdmin = require('../middleware/admin');
const { createTripLimiter } = require('../middleware/rateLimiter');

// POST /api/trips -> Crear viaje (con limitador de tasa)
router.post('/', createTripLimiter, tripController.createTrip);

// GET /api/trips/participants -> Obtener lista de participantes (requiere auth)
router.get('/participants', auth, tripController.getParticipants);

// POST /api/trips/participants/:id/reset-pin -> Restablecer PIN de participante (Solo Admin)
router.post('/participants/:id/reset-pin', auth, verifyAdmin, tripController.resetParticipantPin);

// DELETE /api/trips/participants/:id -> Eliminar participante (Solo Admin)
router.delete('/participants/:id', auth, verifyAdmin, tripController.deleteParticipant);

// GET /api/trips/:code/roster -> Obtener roster de participantes para salas cerradas (Público con código)
router.get('/:code/roster', tripController.getRosterByCode);

// GET /api/trips/:code -> Obtener info básica del viaje (Pública, solo con código)
router.get('/:code', tripController.getTripByCode);

module.exports = router;